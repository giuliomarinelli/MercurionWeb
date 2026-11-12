"""Logical transfer between already isolated Meili servers; never open a foreign data directory."""
import hmac
import hashlib
import json
import os
from pathlib import Path
import re
import time
import urllib.error
import urllib.request


class ApiError(ValueError):
    def __init__(self,status,path,code):
        super().__init__('meili-http-'+str(status))
        self.operation=path.split('?')[0]
        self.api_code=code if isinstance(code,str) and re.fullmatch('[a-z_]+',code) else 'unknown'


class Client:
    def __init__(self, endpoint, key):
        self.endpoint, self.key = endpoint, key
        self.opener = urllib.request.build_opener(urllib.request.ProxyHandler({}))

    def call(self, path, body=None, method=None):
        request=urllib.request.Request(self.endpoint+path,
            data=None if body is None else json.dumps(body).encode(),
            headers={'Authorization':'Bearer '+self.key,'Content-Type':'application/json'},method=method)
        try:
            with self.opener.open(request,timeout=30) as response:
                data=response.read()
                return json.loads(data) if data else None
        except urllib.error.HTTPError as error:
            try:code=json.loads(error.read(16384)).get('code')
            except (ValueError,TypeError):code='unknown'
            raise ApiError(error.code,path,code) from None

    def wait(self, task):
        deadline=time.monotonic()+180
        while time.monotonic()<deadline:
            value=self.call('/tasks/'+str(task['taskUid']))
            if value['status']=='succeeded': return value
            if value['status'] in ('failed','canceled'): raise ValueError('meili-task-failed')
            time.sleep(.1)
        raise ValueError('meili-task-timeout')

    def all(self, path):
        offset=0
        while True:
            value=self.call(path+('?' if '?' not in path else '&')+'limit=1000&offset='+str(offset))
            yield from value['results']
            offset+=len(value['results'])
            if offset>=value['total']: break
            if not value['results']: raise ValueError('meili-pagination-incomplete')


def settings_for_target(value, source_default, target_default, changes, prefix=''):
    if not isinstance(value,dict) or not isinstance(target_default,dict):
        return value
    result={}
    for name,item in value.items():
        path=prefix+name
        if name not in target_default:
            if name not in source_default or item!=source_default[name]:
                raise ValueError('meili-unsupported-custom-setting')
            changes.append(path)
        elif isinstance(item,dict) and isinstance(target_default[name],dict):
            result[name]=settings_for_target(item,source_default.get(name,{}),target_default[name],changes,path+'.')
        elif name in source_default and item==source_default[name] and item!=target_default[name]:
            changes.append(path+':target-default')
            result[name]=target_default[name]
        else:
            result[name]=item
    return result


def write_private(path, value):
    fd=os.open(path,os.O_WRONLY|os.O_CREAT|os.O_EXCL,0o600)
    with os.fdopen(fd,'w',encoding='utf-8') as stream: json.dump(value,stream)


def document_fingerprint(document):
    return int.from_bytes(hashlib.sha256(json.dumps(document,sort_keys=True,separators=(',',':'),ensure_ascii=True).encode()).digest(),'big')


def export(source, destination):
    destination.mkdir(mode=0o700,parents=False,exist_ok=False)
    if source.call('/tasks?statuses=enqueued,processing&limit=1')['total']:
        raise ValueError('meili-writers-or-tasks-still-active')
    indexes=list(source.all('/indexes'))
    keys=list(source.all('/keys'))
    write_private(destination/'keys.json',keys)
    result=[]
    for number,index in enumerate(indexes):
        uid=index['uid']
        # UIDs originate at the server, but must never become paths or URL separators.
        import re
        if not re.fullmatch(r'[A-Za-z0-9_-]+',uid): raise ValueError('meili-index-uid')
        settings=source.call('/indexes/'+uid+'/settings')
        stats=source.call('/indexes/'+uid+'/stats')
        filename=str(number)+'.ndjson'
        count=0;fingerprint=0
        fd=os.open(destination/filename,os.O_WRONLY|os.O_CREAT|os.O_EXCL,0o600)
        with os.fdopen(fd,'w',encoding='utf-8') as stream:
            for document in source.all('/indexes/'+uid+'/documents'):
                stream.write(json.dumps(document)+'\n');count+=1
                fingerprint=(fingerprint+document_fingerprint(document))%(2**256)
        if count!=stats['numberOfDocuments']: raise ValueError('meili-export-count-changed')
        result.append(dict(uid=uid,primaryKey=index['primaryKey'],settings=settings,file=filename,count=count,
                           documentFingerprint=hex(fingerprint)))
    write_private(destination/'indexes.json',result)
    return dict(indexCount=len(result),documentCount=sum(i['count'] for i in result),keyCount=len(keys))


def restore(target, directory, source_defaults):
    indexes=json.loads((directory/'indexes.json').read_text(encoding='utf-8'))
    keys=json.loads((directory/'keys.json').read_text(encoding='utf-8'))
    if list(target.all('/indexes')): raise ValueError('meili-target-not-empty')
    # These two automatic, non-expiring defaults belong to features absent in 1.14.
    # Custom keys and the two provisioned application UIDs never match this contract.
    unsupported_defaults={'Default Read-Only Admin API Key':{'*.get','keys.get'},
                          'Default Chat API Key':{'chatCompletions','search'}}
    skipped=[]
    expected={}
    for item in keys:
        if (item.get('name') in unsupported_defaults and set(item['actions'])==unsupported_defaults[item['name']]
                and item['indexes']==['*'] and item.get('expiresAt') is None
                and item['uid'] not in ('6d3c5a97-a1be-5e5d-b595-b006d557b090','16dbd72a-9663-542f-9220-63122b77a750')):
            skipped.append(item['name'])
        else:expected[item['uid']]=item
    for item in list(target.all('/keys')):
        if item['uid'] not in expected: target.call('/keys/'+item['uid'],method='DELETE')
    actual={item['uid']:item for item in target.all('/keys')}
    for uid,item in expected.items():
        if uid not in actual:
            body={k:item[k] for k in ('uid','name','description','actions','indexes','expiresAt') if item.get(k) is not None}
            body.setdefault('expiresAt',None)
            created=target.call('/keys',body,'POST')
        else:
            created=actual[uid]
        if not hmac.compare_digest(created['key'],item['key']): raise ValueError('meili-client-key-changed')
        for field in ('actions','indexes'):
            if sorted(created[field])!=sorted(item[field]): raise ValueError('meili-key-permissions-changed')
        if created.get('expiresAt')!=item.get('expiresAt'): raise ValueError('meili-key-expiry-changed')
    changes=[]
    for index in indexes:
        uid=index['uid']
        body={'uid':uid}
        if index['primaryKey'] is not None: body['primaryKey']=index['primaryKey']
        target.wait(target.call('/indexes',body,'POST'))
        defaults=target.call('/indexes/'+uid+'/settings')
        settings=settings_for_target(index['settings'],source_defaults,defaults,changes,uid+'.')
        target.wait(target.call('/indexes/'+uid+'/settings',settings,'PATCH'))
        batch=[]
        with (directory/index['file']).open(encoding='utf-8') as stream:
            for line in stream:
                batch.append(json.loads(line))
                if len(batch)==1000:
                    target.wait(target.call('/indexes/'+uid+'/documents',batch,'POST'));batch=[]
        if batch: target.wait(target.call('/indexes/'+uid+'/documents',batch,'POST'))
        if target.call('/indexes/'+uid+'/stats')['numberOfDocuments']!=index['count']:
            raise ValueError('meili-restore-count-mismatch')
        if target.call('/indexes/'+uid)['primaryKey']!=index['primaryKey']:
            raise ValueError('meili-primary-key-changed')
        fingerprint=0;count=0
        for document in target.all('/indexes/'+uid+'/documents'):
            fingerprint=(fingerprint+document_fingerprint(document))%(2**256);count+=1
        if count!=index['count'] or hex(fingerprint)!=index['documentFingerprint']:
            raise ValueError('meili-document-readback-mismatch')
    return dict(indexCount=len(indexes),documentCount=sum(i['count'] for i in indexes),
                keyCount=len(expected),keysPreserved=True,documentsReadbackVerified=True,ignoredNewerDefaultSettings=changes,
                unsupportedAutomaticKeysRetainedInBackup=skipped)
