"""Existing application verification and real loopback HTTP viewing, synthetic inputs only."""
import copy
import hashlib
import http.client
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
import json
import os
from pathlib import Path
import tempfile
from types import SimpleNamespace
import threading
import sys
import uuid
import unittest
from unittest.mock import patch, Mock

import guest_preview_applications as guest
import preview_application_verification as verification
import preview_nginx_tunnel as tunnel
import preview_application_bootstrap as host

RID = 'a'*32
SID = 'b'*32


def fixture(root):
    manifest = dict(runId=RID,serverRunId=SID,serverManifestSha256='c'*64)
    models, members, identifiers = {}, [], {}
    for project,names in guest.bundle.APPS.items():
        model = dict(name='mercurion-'+project,services={})
        models[project] = model
        for name,role in names.items():
            identifier = str(len(members)+1)*64
            model['services'][name] = dict(image='sha256:'+identifier)
            members.append(dict(service=name,project=model['name'],id=identifier,image='sha256:'+identifier))
            identifiers[role] = identifier
    prepared = dict(runId=RID,status='ready',loaded={},edgeId=identifiers['edge'],edgeAddress='172.22.0.2')
    previous = dict(runId=RID,status='failed',phase='application-readiness',servicesStarted=True,
                    schema=dict(status='initialized',entityCount=31),members=members)
    def read(path):
        if path.name == 'preflight-result.json': return prepared
        if path.name == 'bootstrap-result.json': return previous
        return models[path.name.split('-')[0]]
    return manifest,models,prepared,previous,identifiers,read


class ExistingVerification(unittest.TestCase):
    def test_host_uses_only_verification_transport_and_never_bootstrap(self):
        with tempfile.TemporaryDirectory() as directory:
            root=Path(directory)
            (root/'application-bootstrap.json').write_text('{}')
            vid='c'*32
            result=dict(runId=RID,verificationId=vid,status='passed',servicesStarted=False,
                containerMutationsPerformed=False,edgeAddress='172.22.0.2',
                checks=dict(backendHealthThroughEdge=True,frontendThroughEdge=True,tox21RealRpc=True))
            replies=[(0,json.dumps(dict(runId=vid)).encode()),(0,None),
                     (0,json.dumps(dict(phase='code-removed')).encode())]
            with patch.object(verification,'os',SimpleNamespace(name='nt')), \
                    patch.object(verification,'eligible'), patch.object(verification.uuid,'uuid4',return_value=SimpleNamespace(hex=vid)), \
                    patch.object(verification,'transport',side_effect=replies) as transport, \
                    patch.object(host,'fetch',return_value=(result,root/'public-result.json')), patch('builtins.print'):
                answer=verification.execute(root,dict(runId=RID))
            self.assertEqual(answer['status'],'passed')
            self.assertFalse(answer['privateConfigurationRead'])
            self.assertEqual([call.args[0].phase for call in transport.call_args_list],
                             ['helper-staged','verify-existing','helper-removed'])
            self.assertIn(b'def verify_existing',transport.call_args_list[0].args[0].data)
            self.assertIsNone(transport.call_args_list[1].args[0].data)

    def test_actual_index_and_custom_root_pass_transport_smoke(self):
        actual = (Path(__file__).resolve().parents[2] / 'MercurionWebNg/src/index.html').read_text(encoding='utf-8')
        self.assertIn('<m-root',actual)
        self.assertTrue(guest.frontend_body(actual))
        self.assertTrue(guest.frontend_body('<!doctype html><HTML><future-root></future-root></HTML>'))
        with self.assertRaises(ValueError): guest.frontend_body('upstream unavailable')

    def test_verify_reuses_ids_and_never_applies_secrets_schema_or_start(self):
        root = Path('/opt/mercurion/releases/application-'+RID)
        manifest,models,prepared,previous,identifiers,read = fixture(root)
        report = {}
        with patch.object(guest.receiver,'guard'), patch.object(guest.receiver,'inspect') as metadata, \
                patch.object(guest.receiver,'apply') as apply, patch.object(guest.cold,'read',side_effect=read), \
                patch.object(guest.bundle.servers.transport,'read',return_value={}), \
                patch.object(guest.bundle,'projection',return_value=models), \
                patch.object(guest,'find',side_effect=lambda model,path,name:next(m['id'] for m in previous['members'] if m['service']==name)), \
                patch.object(guest,'docker',return_value='true') as docker, \
                patch.object(guest,'address',return_value=prepared['edgeAddress']), \
                patch.object(guest,'check_readiness') as check, patch.object(guest,'register_members') as register:
            guest.verify_existing(root,manifest,report)
        self.assertEqual(report['status'],'passed')
        self.assertEqual(report['schema'],previous['schema'])
        metadata.assert_called_once_with(RID)
        apply.assert_not_called()
        self.assertTrue(all(call.args[:3]==('inspect','--format','{{.State.Running}}') for call in docker.call_args_list))
        self.assertEqual(check.call_args.args[2],identifiers)
        self.assertEqual(register.call_args.args[2],previous['members'])

    def test_changed_identity_stopped_container_or_edge_fails_before_readiness(self):
        for variant in ('id','stopped','edge'):
            root = Path('/opt/mercurion/releases/application-'+RID)
            manifest,models,prepared,previous,identifiers,read = fixture(root)
            with patch.object(guest.receiver,'guard'), patch.object(guest.receiver,'inspect'), \
                    patch.object(guest.cold,'read',side_effect=read), \
                    patch.object(guest.bundle.servers.transport,'read',return_value={}), \
                    patch.object(guest.bundle,'projection',return_value=models), \
                    patch.object(guest,'find',side_effect=lambda model,path,name:'f'*64 if variant=='id' else next(m['id'] for m in previous['members'] if m['service']==name)), \
                    patch.object(guest,'docker',return_value='false' if variant=='stopped' else 'true'), \
                    patch.object(guest,'address',return_value='172.22.0.3'), \
                    patch.object(guest,'check_readiness') as check, patch.object(guest,'register_members') as register, \
                    self.subTest(variant=variant), self.assertRaises(ValueError):
                guest.verify_existing(root,manifest,{})
            check.assert_not_called(); register.assert_not_called()

    def test_completed_bootstrap_record_is_preserved_when_verifying(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            (root/'receipts').mkdir()
            manifest,_,_,previous,_,_ = fixture(root)
            path = root/'receipts/bootstrap-result.json'
            raw = json.dumps(previous).encode(); path.write_bytes(raw)
            self.assertEqual(verification.eligible(root,manifest),previous)
            self.assertEqual(path.read_bytes(),raw)
            previous['schema']['status']='absent'
            path.write_text(json.dumps(previous))
            with self.assertRaises(ValueError): verification.eligible(root,manifest)

    def test_failed_transport_does_not_fetch_or_retry_and_never_reads_owner_configuration(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            (root/'application-bootstrap.json').write_text('{}')
            with patch.object(verification,'os',SimpleNamespace(name='nt')), \
                    patch.object(verification,'eligible'), patch.object(verification,'transport',return_value=(1,b'')) as transport, \
                    patch.object(host,'fetch') as fetch, patch('builtins.print'), self.assertRaisesRegex(ValueError,'helper-staging-failed'):
                verification.execute(root,dict(runId=RID))
            transport.assert_called_once(); fetch.assert_not_called()

    def test_member_registration_idempotent_but_refuses_drift(self):
        with tempfile.TemporaryDirectory() as directory:
            base = Path(directory)
            root = base/('application-'+RID); root.mkdir()
            (root/'application-bootstrap.json').write_bytes(b'public')
            server = base/('server-'+SID); server.mkdir()
            manifest,_,_,previous,_,_ = fixture(root)
            with patch.object(guest.snapshot,'BASE',base), \
                    patch.object(guest.cold,'read',side_effect=lambda p:json.loads(p.read_text())):
                guest.register_members(root,manifest,previous['members'])
                original = (server/'application-members.json').read_bytes()
                guest.register_members(root,manifest,previous['members'])
                self.assertEqual((server/'application-members.json').read_bytes(),original)
                changed = copy.deepcopy(previous['members']); changed[0]['id']='f'*64
                with self.assertRaisesRegex(ValueError,'registration-drift'):
                    guest.register_members(root,manifest,changed)


class LoopbackForward(unittest.TestCase):
    def test_listener_collision_is_rejected(self):
        server=tunnel.LoopbackServer(('127.0.0.1',0),tunnel.handler(18889))
        try:
            with self.assertRaises(OSError):
                tunnel.LoopbackServer(('127.0.0.1',server.server_port),tunnel.handler(18889))
        finally: server.server_close()

    def test_ssh_forward_binds_only_loopback_and_requires_key_and_forward_success(self):
        args = tunnel.ssh_arguments('172.22.0.2',18889)
        self.assertIn('127.0.0.1:18889:172.22.0.2:80',args)
        self.assertIn('StrictHostKeyChecking=yes',args)
        self.assertIn('ExitOnForwardFailure=yes',args)
        self.assertNotIn('-g',args)

    def test_real_http_bridge_rewrites_host_preserves_bytes_and_blocks_foreign_origin(self):
        requests = []
        class Upstream(BaseHTTPRequestHandler):
            def log_message(self,*_): pass
            def do_GET(self):
                requests.append(dict(self.headers))
                data=b'<html><m-root></m-root></html>'
                self.send_response(200); self.send_header('Content-Type','text/html')
                self.send_header('Content-Length',str(len(data))); self.end_headers(); self.wfile.write(data)
        upstream = ThreadingHTTPServer(('127.0.0.1',0),Upstream)
        bridge = ThreadingHTTPServer(('127.0.0.1',0),tunnel.handler(upstream.server_port))
        for server in (upstream,bridge):
            thread=threading.Thread(target=server.serve_forever,daemon=True); thread.start()
        try:
            def request(headers):
                connection=http.client.HTTPConnection('127.0.0.1',bridge.server_port,timeout=3)
                try:
                    connection.request('GET','/',headers=headers)
                    response=connection.getresponse(); return response.status,response.read()
                finally: connection.close()
            status,body=request({'Host':f'localhost:{bridge.server_port}','X-Forwarded-For':'untrusted'})
            self.assertEqual((status,body),(200,b'<html><m-root></m-root></html>'))
            self.assertEqual(requests[0]['Host'],tunnel.HOST)
            self.assertNotIn('X-Forwarded-For',requests[0])
            self.assertEqual(request({'Host':f'localhost:{bridge.server_port}','Origin':'https://unrelated.invalid'})[0],403)
            self.assertEqual(request({'Host':f'localhost:{bridge.server_port}','Upgrade':'websocket'})[0],501)
            self.assertEqual(request({'Host':'unrelated.invalid'})[0],403)
            self.assertEqual(len(requests),1)
        finally:
            for server in (bridge,upstream): server.shutdown(); server.server_close()


@unittest.skipUnless(os.environ.get('PREVIEW_SECRET_FIXTURE')=='1' and sys.platform=='linux',
                     'Disposable root Linux fixture only')
class VerifiedHelperLoader(unittest.TestCase):
    def test_verified_owner_helper_executes_and_modified_bytes_are_rejected(self):
        import pwd
        for tampered in (False,True):
            rid=uuid.uuid4().hex; vid=uuid.uuid4().hex
            home=Path('/tmp')/('verification-owner-'+vid)
            base=home/'.mercurion-infra'; stage=base/('application-verify-'+vid)
            stage.mkdir(parents=True)
            owner=pwd.getpwnam('nobody')
            account=SimpleNamespace(pw_dir=str(home),pw_uid=owner.pw_uid,pw_gid=owner.pw_gid)
            for path in (base,stage): os.chown(path,owner.pw_uid,owner.pw_gid); path.chmod(0o700)
            source=b'class Bundle:\n def verify(self,root): return {}\nbundle=Bundle()\ndef verify_existing(root,manifest,report): report.update(status="passed",phase="finished")\n'
            checksum=hashlib.sha256(source).hexdigest()
            helper=stage/'helper.py'; helper.write_bytes(source+(b'# changed' if tampered else b''))
            helper.chmod(0o600); os.chown(helper,owner.pw_uid,owner.pw_gid)
            root=Path('/opt/mercurion/releases')/('application-'+rid)
            root.mkdir(parents=True)
            manifest=root/'application-bootstrap.json'
            manifest.write_text(json.dumps(dict(runId=rid,files={})))
            digest=hashlib.sha256(manifest.read_bytes()).hexdigest()
            with patch.object(pwd,'getpwnam',return_value=account), patch.dict(os.environ,SUDO_USER='nobody'), \
                    patch.object(sys,'argv',['verify',vid,checksum,rid,digest]), patch('builtins.print'):
                if tampered:
                    with self.assertRaises(AssertionError): exec(compile(verification.LOAD,'<loader-fixture>','exec'),{})
                else:
                    with self.assertRaises(SystemExit) as exit:
                        exec(compile(verification.LOAD,'<loader-fixture>','exec'),{})
                    self.assertEqual(exit.exception.code,0)
            output=root/('application-verification-'+vid+'.json')
            self.assertEqual(output.exists(),not tampered)
            if output.exists():
                report=json.loads(output.read_text())
                self.assertFalse(report['containerMutationsPerformed'])
                self.assertFalse(report['privateConfigurationRead'])


if __name__=='__main__': unittest.main()
