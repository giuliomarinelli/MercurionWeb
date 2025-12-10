import { Inject, Injectable, OnModuleInit } from '@nestjs/common'
import { ClientProxy, RpcException } from '@nestjs/microservices'
import { ConfigService } from '@nestjs/config'
import { catchError, firstValueFrom, throwError, timeout, TimeoutError } from 'rxjs'
import { MeiliLoggerService } from 'src/app_modules/meilisearch/services/meili-logger.service'
import { MeiliContextLogger } from 'src/app_modules/meilisearch/Models/interfaces/meili-context-logger.interface'
import { Environment } from 'src/config/config'
import { RDKitAPI_NS } from '../Models/interfaces/rdkit-api-ns.interface'
import { RdkitAreSameStructureResponse, RdkitGetMoleculePropertiesResponse, RdkitGetMoleculePropertiesResult, RdkitToCanonicalSmilesResponse } from '../Models/DTO/rdkit/rdkit.res.dtos'
import { RdkitGetMoleculePropertiesDTO } from '../Models/DTO/rdkit/rdkit-get-molecule-properties.cls.dto'
import { RdkitToCanonicalSmilesDTO } from '../Models/DTO/rdkit/rdkit-canonical-smiles.dto'
import { RdkitAreSameStructureDTO } from '../Models/DTO/rdkit/rdkit-are-same-structures.dto'

@Injectable()
export class RDKitService implements OnModuleInit {
    private readonly MAX_NATS_PAYLOAD_BYTES: number
    private readonly logger: MeiliContextLogger
    private readonly namespaces: RDKitAPI_NS

    constructor(
        @Inject('MERCURION_AI_CLIENT') private readonly mercurionAIClient: ClientProxy,
        private readonly configService: ConfigService,
        loggerFactory: MeiliLoggerService,
    ) {
        this.MAX_NATS_PAYLOAD_BYTES =
            this.configService.get<number>('App.maxNatsPayloadBytes')!

        this.logger = loggerFactory.forContext(RDKitService.name)
        this.namespaces = this.computeNamespaces()
    }

    onModuleInit() {
        this.logger.log(
            `MercurionWebNode connected via NATS to MercurionTox21 > rdkit_api,\n  => NATS namespaces = \x1b[36m${Object.values(
                this.namespaces,
            ).join(', ')}`,
        )
    }

    // ==========================================
    // Namespaces env-aware
    // production  -> rdkit_api.fn
    // !production -> env.rdkit_api.fn
    // ==========================================
    private computeNamespaces(): RDKitAPI_NS {
        const env = this.configService.get<Environment>('App.env')!
        const base = 'rdkit_api'
        const mk = (fn: string) => env === Environment.Production ? `${base}.${fn}` : `${env}.${base}.${fn}`

        return {
            get_molecule_properties: mk('get_molecule_properties'),
            to_canonical_smiles: mk('to_canonical_smiles'),
            are_same_structure: mk('are_same_structure'),
        }
    }

    // ==========================================
    // Utils
    // ==========================================
    private ensurePayloadSize(dto: unknown) {
        const size = Buffer.byteLength(JSON.stringify(dto), 'utf8')
        if (size > this.MAX_NATS_PAYLOAD_BYTES) {
            throw new RpcException('MercurionRdkitClientConnection::PayloadTooLarge')
        }
    }

    private hasErrorField(x: any): x is { error: string } {
        return !!x && typeof x === 'object' && typeof x.error === 'string' && x.error.trim().length > 0
    }

    private isValidPropsPayload(res: unknown): res is RdkitGetMoleculePropertiesResult {
        if (!res || typeof res !== 'object') return false
        const r = res
        const keys = ['mwFreebase', 'alogp', 'hba', 'hbd', 'psa', 'rtb']
        for (const k of keys) {
            const v = (r[k]) as object
            if (v === null || v === undefined) {
                continue
            }
            if (typeof v !== 'number' || !Number.isFinite(v)) {
                return false
            }
        }
        return true
    }

    private isValidCanonicalPayload(res: unknown): res is string {
        return typeof res === 'string' && res.trim().length > 0
    }

    private isValidSameStructurePayload(res: unknown): res is boolean {
        return typeof res === 'boolean'
    }

    // ==========================================
    // API: get_molecule_properties
    // ==========================================
    async getMoleculeProperties(
        dto: RdkitGetMoleculePropertiesDTO,
    ): Promise<RdkitGetMoleculePropertiesResult> {
        this.ensurePayloadSize(dto)

        const res: RdkitGetMoleculePropertiesResponse = await firstValueFrom(
            this.mercurionAIClient
                .send<RdkitGetMoleculePropertiesResponse>(
                    this.namespaces.get_molecule_properties,
                    dto,
                )
                .pipe(
                    timeout(3000),
                    catchError((e) => {
                        if (e instanceof TimeoutError) {
                            return throwError(
                                () =>
                                    new RpcException(
                                        'MercurionRdkitClientConnectionTimeoutNoResponse::get_molecule_properties',
                                    ),
                            )
                        }
                        return throwError(
                            () =>
                                new RpcException(
                                    'MercurionRdkitClientConnectionUnknownError::get_molecule_properties',
                                ),
                        )
                    }),
                ),
        )

        if (this.hasErrorField(res)) {
            throw new RpcException(`MercurionRdkitClientConnection::${res.error}`)
        }
        if (!this.isValidPropsPayload(res)) {
            throw new RpcException(
                'MercurionRdkitClientConnection::InvalidPayload::get_molecule_properties',
            )
        }

        return res
    }

    // ==========================================
    // API: to_canonical_smiles
    // ==========================================
    async toCanonicalSmiles(
        dto: RdkitToCanonicalSmilesDTO,
    ): Promise<string> {
        this.ensurePayloadSize(dto)

        const res: RdkitToCanonicalSmilesResponse = await firstValueFrom(
            this.mercurionAIClient
                .send<RdkitToCanonicalSmilesResponse>(
                    this.namespaces.to_canonical_smiles,
                    dto,
                )
                .pipe(
                    timeout(3000),
                    catchError((e) => {
                        if (e instanceof TimeoutError) {
                            return throwError(
                                () =>
                                    new RpcException(
                                        'MercurionRdkitClientConnectionTimeoutNoResponse::to_canonical_smiles',
                                    ),
                            )
                        }
                        return throwError(
                            () =>
                                new RpcException(
                                    'MercurionRdkitClientConnectionUnknownError::to_canonical_smiles',
                                ),
                        )
                    }),
                ),
        )

        if (this.hasErrorField(res)) {
            throw new RpcException(`MercurionRdkitClientConnection::${res.error}`)
        }
        if (!this.isValidCanonicalPayload(res)) {
            throw new RpcException(
                'MercurionRdkitClientConnection::InvalidPayload::to_canonical_smiles',
            )
        }

        return res
    }

    // ==========================================
    // API: are_same_structure
    // (confronto robusto lato py, non qui)
    // ==========================================
    async areSameStructure(
        dto: RdkitAreSameStructureDTO,
    ): Promise<boolean> {
        this.ensurePayloadSize(dto)

        const res: RdkitAreSameStructureResponse = await firstValueFrom(
            this.mercurionAIClient
                .send<RdkitAreSameStructureResponse>(
                    this.namespaces.are_same_structure,
                    dto,
                )
                .pipe(
                    timeout(3000),
                    catchError((e) => {
                        if (e instanceof TimeoutError) {
                            return throwError(
                                () =>
                                    new RpcException(
                                        'MercurionRdkitClientConnectionTimeoutNoResponse::are_same_structure',
                                    ),
                            )
                        }
                        return throwError(
                            () =>
                                new RpcException(
                                    'MercurionRdkitClientConnectionUnknownError::are_same_structure',
                                ),
                        )
                    }),
                ),
        )

        if (this.hasErrorField(res)) {
            throw new RpcException(`MercurionRdkitClientConnection::${res.error}`)
        }
        if (!this.isValidSameStructurePayload(res)) {
            throw new RpcException(
                'MercurionRdkitClientConnection::InvalidPayload::are_same_structure',
            )
        }

        return res
    }
}
