import { Test } from '@nestjs/testing'
import { ConfigService } from '@nestjs/config'
import { NEVER, of, throwError } from 'rxjs'
import { LoggerPort } from 'src/logging/logger.port'
import { InMemoryMetrics, MetricsPort } from 'src/observability/metrics'
import { PcpService } from './pcp.service'
import { ScientificRpcPolicy } from './scientific-rpc.policy'

const request = { smiles: 'CCO', accessToken: 'test-access-token' }
const operation = 'mercurion.pcp.get-iupac-name-from-smiles'

describe('PcpService', () => {
    let service: PcpService
    let send: jest.Mock
    let metrics: InMemoryMetrics

    async function createService(environment = 'development'): Promise<PcpService> {
        send = jest.fn(() => of({ data: { iupac_name: 'ethanol' } }))
        metrics = new InMemoryMetrics()
        const module = await Test.createTestingModule({
            providers: [
                PcpService,
                ScientificRpcPolicy,
                { provide: 'MERCURION_AI_CLIENT', useValue: { send } },
                {
                    provide: ConfigService,
                    useValue: new ConfigService({
                        App: {
                            env: environment,
                            maxNatsPayloadBytes: 16384,
                            scientificRpc: {
                                maxInFlight: 1,
                                maxQueue: 2,
                                queueWaitMs: 250,
                                timeoutMs: 3000,
                            },
                        },
                    }),
                },
                { provide: MetricsPort, useValue: metrics },
                { provide: LoggerPort, useValue: { forContext: jest.fn(() => ({ log: jest.fn() })) } },
            ],
        }).compile()

        return module.get(PcpService)
    }

    beforeEach(async () => {
        service = await createService()
    })

    afterEach(() => jest.useRealTimers())

    it('sends the authenticated request to Tox21 and unwraps the nested IUPAC name', async () => {
        await expect(service.getIupacNameFromSmiles(request)).resolves.toBe('ethanol')
        expect(send).toHaveBeenCalledWith('development.pcp_api.get_iupac_name_from_smiles', request)
        expect(metrics.snapshot()).toEqual(expect.arrayContaining([
            expect.objectContaining({ transport: 'nats', operation, outcome: 'success' }),
        ]))
    })

    it.each([
        ['test', 'test.pcp_api.get_iupac_name_from_smiles'],
        ['production', 'pcp_api.get_iupac_name_from_smiles'],
    ])('uses the registry subject for %s', async (environment, subject) => {
        service = await createService(environment)
        await service.getIupacNameFromSmiles(request)
        expect(send).toHaveBeenCalledWith(subject, request)
    })

    it('preserves the empty string emitted when PubChem has no IUPAC name', async () => {
        send.mockReturnValue(of({ data: { iupac_name: '' } }))
        await expect(service.getIupacNameFromSmiles(request)).resolves.toBe('')
    })

    it.each(['Invalid or expired access token', 'InternalError'])(
        'maps the peer error %s to an upstream application error', async (error) => {
            send.mockReturnValue(of({ error }))
            await expect(service.getIupacNameFromSmiles(request)).rejects.toMatchObject({
                code: 'TOX21_UPSTREAM_ERROR',
                message: `MercurionTox21ClientConnection::${error}`,
            })
            expect(metrics.snapshot()).toEqual(expect.arrayContaining([
                expect.objectContaining({ operation, outcome: 'remote-error' }),
            ]))
        }
    )

    it.each([{ data: 'ethanol' }, { data: { iupac_name: null } }, { data: {} }])(
        'rejects a malformed peer response %j through the scientific RPC policy', async (response) => {
            send.mockReturnValue(of(response))
            await expect(service.getIupacNameFromSmiles(request)).rejects.toMatchObject({
                code: 'SCIENTIFIC_RPC_INVALID_RESPONSE',
            })
        }
    )

    it.each([
        { smiles: '' },
        { ...request, smiles: 'C'.repeat(1025) },
        { ...request, opts: {} },
    ])('rejects an invalid request before dispatch', async (payload) => {
        await expect(service.getIupacNameFromSmiles(payload)).rejects.toMatchObject({
            code: 'TOX21_INVALID_PAYLOAD',
        })
        expect(send).not.toHaveBeenCalled()
    })

    it.each([{ smiles: 'CCO' }, { smiles: 'CCO', accessToken: undefined }, { smiles: 'CCO', accessToken: '' }])(
        'dispatches public requests without requiring authentication', async (payload) => {
            await expect(service.getIupacNameFromSmiles(payload)).resolves.toBe('ethanol')
            expect(send).toHaveBeenCalledWith('development.pcp_api.get_iupac_name_from_smiles', payload)
        }
    )

    it('propagates unavailable transport errors from the scientific RPC policy', async () => {
        send.mockReturnValue(throwError(() => new Error('offline')))
        await expect(service.getIupacNameFromSmiles(request)).rejects.toMatchObject({
            code: 'SCIENTIFIC_RPC_UNAVAILABLE',
        })
    })

    it('uses the bounded scientific RPC timeout', async () => {
        jest.useFakeTimers()
        send.mockReturnValue(NEVER)
        const pending = service.getIupacNameFromSmiles(request)
        const expectation = expect(pending).rejects.toMatchObject({ code: 'TOX21_TIMEOUT' })
        await jest.advanceTimersByTimeAsync(3000)
        await expectation
    })
})
