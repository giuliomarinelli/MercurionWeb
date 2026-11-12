"""Single-writer maintenance lifecycle, including failures and ordinary profile restoration."""
import hashlib
import json
import os
from pathlib import Path
import sys
from types import SimpleNamespace
import unittest
from unittest.mock import patch
import guest_embedding_index as guest
from preview_embedding_import import INDEX_LAUNCH


class IndexLifecycle(unittest.TestCase):
    @unittest.skipUnless(os.name=='posix' and os.environ.get('EMBEDDING_INDEX_LINUX_FIXTURE')=='1', 'opt-in tmpfs Linux launcher fixture')
    def test_pinned_launcher_preserves_completed_import_and_rejects_tampering(self):
        import pwd
        owner=pwd.getpwnam('nobody');rid='a'*32;staging='b'*32
        source=Path(owner.pw_dir)/'.mercurion-infra'/('delivery-'+staging)
        source.mkdir(parents=True,mode=0o700)
        for parent in (source.parent,source):parent.chmod(0o700);os.chown(parent,owner.pw_uid,owner.pw_gid)
        body=Path(guest.__file__).read_bytes();digest=hashlib.sha256(body).hexdigest()
        script=source/'secret_delivery.py';script.write_bytes(body);script.chmod(0o600);os.chown(script,owner.pw_uid,owner.pw_gid)
        root=Path('/opt/mercurion/imports')/('embeddings-'+rid);root.mkdir(parents=True,mode=0o700)
        manifest=json.dumps(dict(runId=rid,datasetSha256='c'*64))
        (root/'manifest.json').write_text(manifest)
        (root/'import-result.json').write_text(json.dumps(dict(status='passed',datasetSha256='c'*64)))
        (root/'import-pid.json').write_text(json.dumps(dict(pid=os.getpid()))) # Old boot PID reuse must not block.
        with patch.dict(os.environ,{'SUDO_USER':'nobody'}),patch.object(sys,'argv',['launch',rid,staging,digest,'no']), \
                patch('subprocess.Popen',return_value=SimpleNamespace(pid=424242)) as launch:
            exec(compile(INDEX_LAUNCH,'<pinned-launcher>','exec'),{})
            self.assertEqual(launch.call_args.args[0][2],str(root/('index-worker-'+digest+'.py')))
            self.assertEqual((root/('index-worker-'+digest+'.py')).read_bytes(),body)
            self.assertEqual((root/'manifest.json').read_text(),manifest)
            script.write_bytes(body+b'\n# changed\n')
            with self.assertRaises(AssertionError):exec(compile(INDEX_LAUNCH,'<tampered-launcher>','exec'),{})
            self.assertEqual(launch.call_count,1)

    def invoke(self, failure=None):
        original='a'*64;temporary='b'*64;events=[];state={'original':True,'maintenance':False,'created':False}
        report={}
        def docker(*args):
            events.append(args)
            if args[:2]==('ps','-aq'):return ''
            if args[:2]==('ps','-q'):
                return '\n'.join(cid for cid,active in ((original,state['original']),(temporary,state['maintenance'])) if active)
            if args[0]=='create':state['created']=True;return temporary
            if args[0]=='stop':
                if args[-1]==temporary and failure=='stop-maintenance':raise ValueError('stop-failed')
                state['original' if args[-1]==original else 'maintenance']=False;return args[-1]
            if args[0]=='inspect':
                active=state['original' if args[-1]==original else 'maintenance']
                return ('true' if active else 'false') if '.State.Running' in args[2] else '{"Running":false,"ExitCode":0}'
            if args[0]=='start':
                key='original' if args[-1]==original else 'maintenance'
                self.assertFalse(state['maintenance' if key=='original' else 'original'])
                state[key]=True;return args[-1]
            if args[0]=='rm':self.assertFalse(state['maintenance']);return temporary
            if args[0]=='update':return original
            self.fail(str(args))
        def build(cid):
            events.append(('build',cid))
            if failure=='build':raise ValueError('build-failed')
        with patch.object(guest,'docker',side_effect=docker),patch.object(guest,'ready'):
            if failure:
                with self.assertRaises(ValueError):
                    guest.lifecycle({'id':original,'image':'sha256:'+'c'*64},'volume','/run/secrets','fixture',build,report,lambda:None)
            else:guest.lifecycle({'id':original,'image':'sha256:'+'c'*64},'volume','/run/secrets','fixture',build,report,lambda:None)
        return events,state,report

    def test_success_never_runs_both_servers_and_restores_four_cpu_four_gib(self):
        events,state,report=self.invoke()
        self.assertTrue(state['original']);self.assertFalse(state['maintenance'])
        self.assertTrue(report['originalPostgresRestored']);self.assertTrue(report['maintenanceRemoved'])
        self.assertIn(('update','--memory',str(4*guest.GIB),'--memory-swap',str(4*guest.GIB),'--cpus','4','a'*64),events)

    def test_build_failure_still_stops_maintenance_before_restart(self):
        events,state,report=self.invoke('build')
        self.assertTrue(state['original']);self.assertFalse(state['maintenance'])
        self.assertTrue(report['originalPostgresRestored'])

    def test_unconfirmed_maintenance_stop_never_restarts_original(self):
        events,state,report=self.invoke('stop-maintenance')
        self.assertFalse(state['original']);self.assertTrue(state['maintenance'])
        self.assertNotIn(('start','a'*64),events)

    def test_capacity_and_no_external_network_or_published_ports(self):
        guest.capacity(14,dict(MemTotal=28*guest.GIB,MemAvailable=26*guest.GIB))
        for cpu,total,available in ((13,28,26),(14,26,26),(14,28,24)):
            with self.assertRaises(ValueError):guest.capacity(cpu,dict(MemTotal=total*guest.GIB,MemAvailable=available*guest.GIB))
        args=guest.build_arguments('fixture',{'image':'sha256:'+'c'*64},'volume','/run/secrets')
        self.assertEqual(args[args.index('--network')+1],'none')
        self.assertEqual(args[args.index('--shm-size')+1],str(22*guest.GIB))
        self.assertEqual(args[args.index('--memory')+1],str(24*guest.GIB))
        self.assertEqual(args[args.index('--cpus')+1],'12')
        self.assertEqual(args[args.index('--entrypoint')+1],'postgres')
        self.assertNotIn('--publish',args);self.assertNotIn('--privileged',args)
        compile(INDEX_LAUNCH,'<pinned-index-launch>','exec')

    def test_foreign_volume_writer_blocks_before_stop_or_create(self):
        with patch.object(guest,'docker',side_effect=['','a'*64+'\n'+'c'*64]) as docker:
            with self.assertRaisesRegex(ValueError,'unexpected-writer'):
                guest.lifecycle({'id':'a'*64},'volume','/run/secrets','fixture',None,{},lambda:None)
        self.assertTrue(all(call.args[0]=='ps' for call in docker.call_args_list))


if __name__=='__main__':unittest.main()
