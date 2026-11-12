
import asyncio,json,sys
from config import get_config
from secret_bootstrap import load_secret_file_environment
from nats.aio.client import Client
from nats.errors import AuthorizationError,Error

async def quiet(_error): pass

async def probe():
    load_secret_file_environment()
    config=get_config(); auth=config.nats_connect_credentials()
    assert config.py_env=='staging'
    client=Client()
    await client.connect(config.nats_url,**auth,allow_reconnect=False,connect_timeout=2,error_cb=quiet)
    try:
        async def request(subject,payload):
            reply=await client.request('staging.'+subject,json.dumps(payload).encode(),timeout=3)
            return json.loads(reply.data)
        result=await request('inference.tox21.smiles',{'data':{'smiles':'CCO'}})
        assert set(result)=={'SR-ATAD5','NR-AhR','SR-MMP','SR-p53'}
        for value in result.values():
            assert set(value)=={'probability','threshold','is_positive'}
            assert 0<=value['probability']<=1 and 0<=value['threshold']<=1
            assert value['is_positive'] is (value['probability']>value['threshold'])
        result=await request('rdkit_api.get_molecule_properties',{'smiles':'CCO'})
        assert abs(result['data']['mwFreebase']-46.069)<.01
        assert await request('rdkit_api.to_canonical_smiles',{'smiles':'OCC'})=={'data':'CCO'}
        assert await request('rdkit_api.are_same_structure',{'a':'CCO','b':'OCC'})=={'data':True}
        result=await request('pcp_api.get_iupac_name_from_smiles',{})
        assert result['error'].startswith('Invalid request:')
        assert await request('rdkit_api.to_canonical_smiles',{'smiles':'not-a-smiles'})=={'error':'Invalid SMILES'}
    finally:
        await client.close()
    denied=[]
    for case,credentials in [('missing',{}),('wrong-password',{**auth,'password':'synthetic-invalid'}),
                             ('unknown-user',{**auth,'user':'synthetic-unregistered'})]:
        client=Client()
        try:
            await asyncio.wait_for(client.connect(config.nats_url,**credentials,allow_reconnect=False,
                                                  connect_timeout=1,error_cb=quiet),timeout=4)
        except Error as error:
            assert isinstance(error,AuthorizationError) or str(error)=="nats: 'Authorization Violation'"
            denied.append(case)
        else:
            raise AssertionError('unauthorized-requester-admitted')
        finally:
            await client.close()
    print(json.dumps({'subjects':5,'inference':'real','rdkit':'real','pubchem':'validation-only',
                      'invalidSmiles':'passed','explicitBrokerDenials':denied}))

try:
    asyncio.run(probe())
except Exception as error:
    print(json.dumps({'errorType':type(error).__name__}),file=sys.stderr)
    sys.exit(1)
