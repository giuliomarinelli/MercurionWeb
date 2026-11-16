"""Upgrade isolation, restore policy, rollback ordering and active-generation contracts."""
import copy
import hashlib
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

import guest_preview_service_upgrade as guest
import guest_preview_recovery_inventory as snapshot
import meili_logical_transfer as meili
import preview_service_upgrade_bundle as bundle
import preview_service_upgrade as host

SID='a'*32
UID='b'*32


class UpgradeContracts(unittest.TestCase):
    def test_projection_uses_new_volumes_existing_networks_and_secret_paths(self):
        original={'shared':dict(name='mercurion-shared',services={'meilisearch':dict(image='old',
            volumes=[dict(type='bind',source='/run/mercurion-preview/'+SID+'/active/meilisearch/server.toml',target='/secret',read_only=True)])},
            networks={'stg-search':dict(name='mercurion_stg_search',internal=True)},volumes={'meili-data':dict(name='old-volume')}),
            'preview':dict(name='mercurion-preview',services={'redis-preview':dict(image='old')},networks={},volumes={})}
        before=copy.deepcopy(original)
        loaded={role:dict(imageId='sha256:'+str(i)*64) for i,role in enumerate(('postgres','redis','meilisearch','nats'),1)}
        result=guest.compose_models(original,loaded,UID,SID)
        self.assertEqual(original,before)
        shared=result['shared']
        self.assertEqual(shared['name'],'mercurion-u'+UID+'-shared')
        self.assertEqual(shared['networks']['stg-search'],dict(name='mercurion_stg_search',external=True))
        self.assertEqual(shared['volumes']['meili-data'],dict(name='mercurion_u'+UID+'_meili_data',external=True))
        spec=shared['services']['meilisearch']
        self.assertEqual(spec['image'],loaded['meilisearch']['imageId'])
        self.assertEqual(spec['volumes'],before['shared']['services']['meilisearch']['volumes'])
        self.assertEqual(spec['labels']['mercurion.bootstrap.run'],UID)
        self.assertEqual(spec['labels']['mercurion.secret-source.run'],SID)

    def test_rollback_stops_writers_and_new_generation_before_starting_originals(self):
        calls=[]
        original={'postgres-preview':dict(id='old-pg',image='sha256:'+'c'*64)}
        def docker(*args):
            calls.append(args)
            if args[:2]==('ps','-aq'):return 'new-pg\nnew-meili'
            if args[:3]==('inspect','--format','{{.Image}}'):return 'sha256:'+'c'*64
            if args[:3]==('inspect','--format','{{.State.Running}}'):return 'true' if args[-1]=='app' and len(calls)==1 else 'false'
            return ''
        with patch.object(guest,'docker',side_effect=docker):guest.rollback_generation(UID,original,['app'])
        self.assertLess(calls.index(('stop','--time','30','app')),calls.index(('stop','--time','30','new-pg')))
        self.assertLess(calls.index(('stop','--time','30','new-meili')),calls.index(('start','old-pg')))
        self.assertLess(calls.index(('start','old-pg')),calls.index(('start','app')))
        self.assertFalse(any(args[0] in ('rm','volume') for args in calls))

    def test_rollback_refuses_image_identity_drift(self):
        def docker(*args):
            if args[0]=='ps':return ''
            return 'sha256:'+'d'*64
        with patch.object(guest,'docker',side_effect=docker) as command,self.assertRaisesRegex(ValueError,'image-drift'):
            guest.rollback_generation(UID,{'postgres-preview':dict(id='old',image='sha256:'+'c'*64)},[])
        self.assertFalse(any(c.args[0]=='start' for c in command.call_args_list))

    def test_only_unchanged_newer_default_settings_may_be_omitted(self):
        changes=[]
        source=dict(rankingRules=['new','words'],typoTolerance=dict(disableOnNumbers=False,minWordSizeForTypos={'oneTypo':5}),
                    filterableAttributes=['level'])
        defaults=dict(source,filterableAttributes=[])
        target=dict(rankingRules=['words'],typoTolerance=dict(minWordSizeForTypos={'oneTypo':5}),filterableAttributes=[])
        result=meili.settings_for_target(source,defaults,target,changes)
        self.assertEqual(result['rankingRules'],['words'])
        self.assertEqual(result['filterableAttributes'],['level'])
        self.assertNotIn('disableOnNumbers',result['typoTolerance'])
        source['typoTolerance']['disableOnNumbers']=True
        # Copy defaults separately: an actual custom value unsupported by 1.14 must abort.
        defaults['typoTolerance']=dict(disableOnNumbers=False,minWordSizeForTypos={'oneTypo':5})
        with self.assertRaisesRegex(ValueError,'unsupported-custom-setting'):
            meili.settings_for_target(source,defaults,target,[])

    def test_existing_report_is_never_overwritten(self):
        with tempfile.TemporaryDirectory() as directory:
            path=Path(directory)/'receipt.json';path.write_text('preserve')
            with patch.object(guest.os,'O_NOFOLLOW',0,create=True),self.assertRaises(FileExistsError):guest.write(path,{'status':'new'})
            self.assertEqual(path.read_text(),'preserve')

    def test_active_upgrade_pointer_digest_failure_prevents_docker(self):
        with tempfile.TemporaryDirectory() as directory:
            root=Path(directory)/('server-'+SID);root.mkdir()
            (root/'active-service-upgrade.json').write_text('present')
            value=dict(schemaVersion=1,upgradeId=UID,baselineManifestSha256='c'*64,
                       files={name:'d'*64 for name in ('upgrade-result.json','shared-servers.json','preview-servers.json')})
            with patch.object(snapshot,'regular',side_effect=[json.dumps(value).encode(),b'tampered']), \
                 patch.object(snapshot,'docker') as docker,self.assertRaisesRegex(ValueError,'checksum'):
                snapshot.active_upgrade(root,'c'*64)
            docker.assert_not_called()

    def test_active_generation_resolves_new_members_without_overwriting_baseline(self):
        with tempfile.TemporaryDirectory() as directory:
            root=Path(directory)/('server-'+SID);root.mkdir()
            (root/'active-service-upgrade.json').write_text('present')
            projects={'shared':'mercurion-u'+UID+'-shared','preview':'mercurion-u'+UID+'-preview'}
            models={scope:dict(name=name,services={service:{} for service,project in snapshot.BASE_PROJECTS.items()
                     if project=='mercurion-'+scope}) for scope,name in projects.items()}
            result=dict(status='passed',upgradeId=UID,serverRunId=SID,
                        loaded={role:{} for role in ('postgres','redis','nats','meilisearch')},
                        servers=[dict(service=name,id=str(i)*64) for i,name in enumerate(snapshot.BASE_PROJECTS,1)])
            files={'upgrade-result.json':json.dumps(result).encode(),**{scope+'-servers.json':json.dumps(model).encode()
                                                                     for scope,model in models.items()}}
            pointer=dict(schemaVersion=1,upgradeId=UID,baselineManifestSha256='c'*64,
                         files={name:hashlib.sha256(raw).hexdigest() for name,raw in files.items()})
            def regular(path):return json.dumps(pointer).encode() if path.name=='active-service-upgrade.json' else files[path.name]
            with patch.object(snapshot,'regular',side_effect=regular):value=snapshot.active_upgrade(root,'c'*64)
            self.assertEqual(value['models'],models)
            self.assertEqual(value['result']['servers'],result['servers'])
            self.assertEqual(value['projects']['postgres-preview'],projects['preview'])

    def test_host_has_no_credential_file_argument_and_preserves_single_attempt(self):
        with tempfile.TemporaryDirectory() as directory:
            root=Path(directory);marker=root/'owner-execution.json';marker.write_text('preserve')
            with patch.object(host.os,'name','nt'),patch.object(host.subprocess,'run') as run,self.assertRaises(FileExistsError):
                host.execute(root,dict(upgradeId=UID))
            run.assert_not_called();self.assertEqual(marker.read_text(),'preserve')

    def test_guest_loader_is_syntactically_valid_and_files_are_explicit(self):
        compile('EXPECTED_FILES=set()\n'+host.COPY,'<guest>','exec')
        self.assertIn('models.json',bundle.PUBLIC)
        self.assertIn('deployment/local-vm/operational/shared/compose.yaml',bundle.PUBLIC)
        self.assertIn('deployment/local-vm/operational/preview/compose.yaml',bundle.PUBLIC)
        self.assertFalse(any(name.endswith(('.pem','.env')) for name in bundle.PUBLIC))


if __name__=='__main__':unittest.main()
