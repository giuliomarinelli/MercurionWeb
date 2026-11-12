"""Inventory owner-provided COPY chunks, without printing or copying scientific rows."""
import argparse
import hashlib
import json
from pathlib import Path
import re

HEADER=b'COPY public.molecule_embeddings (stable_uuid, molregno, smiles, embedding, embedding_model, updated_at, preferred_name) FROM stdin;'


def inventory(source,output):
    files=sorted(source.glob('*.sql'))
    if not files or [p.name for p in files]!=['molecule_embeddings-'+str(i).zfill(3)+'.sql' for i in range(len(files))]:
        raise ValueError('embedding-chunks-not-contiguous-from-zero')
    if output.exists():raise ValueError('embedding-manifest-already-exists')
    result=dict(schemaVersion=1,format='psql-copy-seven-columns-v1',sourceDirectory=str(source.resolve()),
                table='public.molecule_embeddings',columns=['stable_uuid','molregno','smiles','embedding','embedding_model','updated_at','preferred_name'],
                files=[],rowCount=0,bytes=0,dimensions={},models=[],dataPrinted=False)
    models=set()
    for path in files:
        if path.is_symlink() or not path.is_file():raise ValueError('embedding-chunk-not-regular')
        digest=hashlib.sha256();rows=0;dimensions={}
        with path.open('rb') as stream:
            def line():
                raw=stream.readline(1024*1024+1)
                if len(raw)>1024*1024:raise ValueError('embedding-line-too-large')
                digest.update(raw);return raw.rstrip(b'\r\n')
            if [line(),line(),line()]!=[b'\\set ON_ERROR_STOP on',b'BEGIN;',HEADER]:
                raise ValueError('embedding-unexpected-copy-header')
            while True:
                row=line()
                if row==b'\\.':break
                if not row:raise ValueError('embedding-unexpected-empty-or-truncated-copy')
                fields=row.split(b'\t')
                if len(fields)!=7 or not re.fullmatch(rb'[0-9a-fA-F-]{36}',fields[0]) or not fields[1].isdigit():
                    raise ValueError('embedding-copy-row-shape')
                vector=fields[3]
                if not (vector.startswith(b'[') and vector.endswith(b']')):raise ValueError('embedding-vector-shape')
                dimension=vector.count(b',')+1
                dimensions[dimension]=dimensions.get(dimension,0)+1
                model=fields[4].decode('utf-8')
                if len(model)>256 or '\\' in model:raise ValueError('embedding-model-shape')
                models.add(model);rows+=1
            if line()!=b'COMMIT;':raise ValueError('embedding-unexpected-copy-trailer')
            while True:
                raw=stream.read(1024*1024)
                if not raw:break
                digest.update(raw)
                if raw.strip():raise ValueError('embedding-extra-sql-not-allowed')
        record=dict(name=path.name,bytes=path.stat().st_size,sha256=digest.hexdigest(),rows=rows,dimensions=dimensions)
        result['files'].append(record);result['rowCount']+=rows;result['bytes']+=record['bytes']
        for dimension,count in dimensions.items():result['dimensions'][dimension]=result['dimensions'].get(dimension,0)+count
        print(json.dumps(dict(file=path.name,rows=rows,bytes=record['bytes'],sha256=record['sha256'])),flush=True)
    if len(result['dimensions'])!=1:raise ValueError('embedding-mixed-vector-dimensions')
    result['models']=sorted(models)
    output.parent.mkdir(parents=True,exist_ok=True)
    with output.open('x',encoding='utf-8') as stream:json.dump(result,stream,indent=2)
    return result


if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--source',required=True,type=Path)
    parser.add_argument('--output',required=True,type=Path)
    args=parser.parse_args()
    result=inventory(args.source,args.output)
    print(json.dumps({k:result[k] for k in ('rowCount','bytes','dimensions','models','dataPrinted')}))
