"""Opt-in local Docker QA. Disposable PostgreSQL only; never connects to the VM."""
import argparse
import json
from pathlib import Path
import subprocess
import time
import uuid

ROOT=Path(__file__).resolve().parents[2]
SQL=ROOT/'MercurionWebNode/sql/bootstrap/application'


def main():
 parser=argparse.ArgumentParser(description=__doc__)
 parser.add_argument('--execute',action='store_true')
 parser.add_argument('--image',required=True)
 args=parser.parse_args()
 if not args.execute:raise SystemExit('Use --execute only for disposable local Docker QA')
 name='mercurion-schema-qa-'+uuid.uuid4().hex[:12]
 def docker(*words,input=None,check=True):
  return subprocess.run(['docker',*words],input=input,capture_output=True,check=check)
 def psql(sql,database='mercurion_preview',check=True):
  result=docker('exec','-i',name,'psql','-X','-v','ON_ERROR_STOP=1','-U','postgres','-d',database,'-At',input=sql.encode(),check=check)
  return result
 def scalar(sql,database='mercurion_preview'):
  return psql(sql,database).stdout.decode().strip()
 created=False
 try:
  docker('run','-d','--rm','--network','none','--name',name,'--cpus','2','--memory','512m',
         '-e','POSTGRES_HOST_AUTH_METHOD=trust','-e','POSTGRES_DB=mercurion_preview',args.image)
  created=True
  for _ in range(100):
   if docker('exec',name,'pg_isready','-h','127.0.0.1','-U','postgres','-d','mercurion_preview',check=False).returncode==0:break
   time.sleep(.3)
  else:raise ValueError('disposable-postgres-not-ready')
  source=(SQL/'preview-schema-before-rebuild-20261113.sql').read_text(encoding='utf-8')
  psql('CREATE ROLE mercurion_preview LOGIN; ALTER DATABASE mercurion_preview OWNER TO mercurion_preview; CREATE EXTENSION vector;\nSET ROLE mercurion_preview;\n'+source.replace('CREATE SCHEMA public;','CREATE SCHEMA IF NOT EXISTS public;'))
  psql("INSERT INTO public.molecule_embeddings(stable_uuid,molregno,smiles,embedding) SELECT md5(g::text)::uuid,g,'C',(ARRAY[1::real]||array_fill(0::real,ARRAY[767]))::vector FROM generate_series(1,17) g;")
  fingerprint="SELECT jsonb_build_object('tableOid','public.molecule_embeddings'::regclass::oid,'count',(SELECT count(*) FROM public.molecule_embeddings),'sum',(SELECT sum(molregno) FROM public.molecule_embeddings),'indexes',(SELECT jsonb_agg(jsonb_build_array(indexrelid,indisvalid,indisready,pg_relation_filenode(indexrelid)) ORDER BY indexrelid) FROM pg_index WHERE indrelid='public.molecule_embeddings'::regclass));"
  before=scalar(fingerprint)
  reset=(SQL/'20_rebuild_preview_application.sql').read_text(encoding='utf-8')
  checks=[]
  for setup,cleanup,label in [
   ('CREATE TABLE public.unexpected_guard(id int);','DROP TABLE public.unexpected_guard;','unknown-table-rejected'),
   ('CREATE VIEW public.dependent_guard AS SELECT id FROM public.users;','DROP VIEW public.dependent_guard;','external-dependency-rejected'),
   ("INSERT INTO public.users(id) VALUES('00000000-0000-0000-0000-000000000001');",'DELETE FROM public.users;','existing-user-rejected')]:
   old_users=scalar("SELECT 'public.users'::regclass::oid;")
   psql(setup)
   result=psql(reset,check=False)
   if result.returncode==0:raise ValueError(label+'-did-not-stop')
   if scalar(fingerprint)!=before or scalar("SELECT 'public.users'::regclass::oid;")!=old_users:
    raise ValueError('failed-reset-mutated-original-objects')
   psql(cleanup);checks.append(label)
  result=psql(reset)
  if 'APPLICATION_SCHEMA_REBUILT_EMBEDDINGS_PRESERVED' not in result.stdout.decode():raise ValueError('missing-commit-receipt')
  if scalar(fingerprint)!=before:raise ValueError('embedding-data-or-indexes-changed')
  checks.append('embedding-rows-oids-and-index-files-preserved')
  psql("INSERT INTO public.users(id,email,first_name,last_name,initials,sso,is_verified) VALUES('00000000-0000-0000-0000-000000000002','synthetic@example.invalid','QA','User','QU',true,true);")
  if scalar("SELECT (created_at IS NOT NULL AND updated_at IS NOT NULL)::text FROM public.users;")!='true':raise ValueError('sso-style-insert-defaults')
  psql('DELETE FROM public.users;')
  checks.append('sso-style-insert-without-timestamps')
  psql('CREATE DATABASE reference_schema;',database='postgres')
  psql('CREATE EXTENSION vector; CREATE EXTENSION pg_trgm;\nBEGIN;\n'+(SQL/'10_create_application.sql').read_text(encoding='utf-8')+'\nCOMMIT;',database='reference_schema')
  definition="""SELECT jsonb_build_object(
  'columns',(SELECT jsonb_agg(jsonb_build_array(c.relname,a.attname,format_type(a.atttypid,a.atttypmod),a.attnotnull,pg_get_expr(d.adbin,d.adrelid),a.attidentity,a.attgenerated) ORDER BY c.relname,a.attnum) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace JOIN pg_attribute a ON a.attrelid=c.oid LEFT JOIN pg_attrdef d ON d.adrelid=c.oid AND d.adnum=a.attnum WHERE n.nspname='public' AND c.relkind='r' AND c.relname<>'molecule_embeddings' AND a.attnum>0 AND NOT a.attisdropped),
  'constraints',(SELECT jsonb_agg(jsonb_build_array(c.relname,k.conname,pg_get_constraintdef(k.oid),k.convalidated) ORDER BY c.relname,k.conname) FROM pg_constraint k JOIN pg_class c ON c.oid=k.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relname<>'molecule_embeddings'),
  'indexes',(SELECT jsonb_agg(jsonb_build_array(t.relname,i.relname,pg_get_indexdef(i.oid)) ORDER BY t.relname,i.relname) FROM pg_index x JOIN pg_class t ON t.oid=x.indrelid JOIN pg_namespace n ON n.oid=t.relnamespace JOIN pg_class i ON i.oid=x.indexrelid WHERE n.nspname='public' AND t.relname<>'molecule_embeddings'),
  'triggers',(SELECT jsonb_agg(pg_get_triggerdef(t.oid) ORDER BY c.relname,t.tgname) FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relname<>'molecule_embeddings' AND NOT t.tgisinternal),
  'functions',(SELECT jsonb_agg(pg_get_functiondef(p.oid) ORDER BY p.proname) FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.prorettype='trigger'::regtype),
  'sequences',(SELECT jsonb_agg(jsonb_build_array(c.relname,s.seqstart,s.seqincrement,s.seqmax,s.seqmin,s.seqcache,s.seqcycle) ORDER BY c.relname) FROM pg_sequence s JOIN pg_class c ON c.oid=s.seqrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public'));"""
  if scalar(definition)!=scalar(definition,'reference_schema'):raise ValueError('restored-schema-differs-from-reviewed-ddl')
  checks.append('columns-defaults-constraints-indexes-triggers-functions-sequences-match-reference')
  psql((SQL/'30_seed_countries.sql').read_text(encoding='utf-8'))
  if scalar('SELECT count(*) FROM public.countries;')!='250':raise ValueError('country-seed-count')
  checks.append('optional-country-reference-data-and-identity-sequence')
  psql((SQL/'90_verify_application.sql').read_text(encoding='utf-8-sig'))
  psql((SQL/'91_inventory_application_data.sql').read_text(encoding='utf-8-sig'))
  checks.append('read-only-application-data-inventory')
  report=dict(status='passed',checks=checks,applicationTableCount=33,embeddingTestRows=17,vmAccessed=False)
  (SQL/'qa-result.json').write_text(json.dumps(report,indent=2)+'\n',encoding='utf-8')
  print(json.dumps(report))
 except subprocess.CalledProcessError as error:
  # Only synthetic disposable database diagnostics; never owner configuration.
  print(error.stderr.decode(errors='replace'))
  raise SystemExit(1) from None
 finally:
  if created:docker('rm','-f',name,check=False)


if __name__=='__main__':main()
