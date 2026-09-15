import { Inject, Injectable, OnModuleInit } from '@nestjs/common'
import { ClientProxy } from '@nestjs/microservices';
import { ConfigService } from '@nestjs/config'
import { catchError, firstValueFrom, OperatorFunction, throwError, timeout, TimeoutError } from 'rxjs'
import { LoggerPort } from 'src/logging/logger.port'
import { LoggerContext } from 'src/logging/logger.port'
import { RDKitAPI_NS } from '../models/interfaces/rdkit-api-ns.interface'
import {
    NATS_CONTRACT_REGISTRY,
    assertNatsRequest,
    assertNatsResponse,
    natsSubject,
    type RdkitAreSameStructureWire,
    type RdkitCanonicalSmilesWire,
    type RdkitGetMoleculePropertiesResult,
    type RdkitGetMoleculePropertiesWire
} from '@mercurion/rest-contracts'
import { RdkitGetMoleculePropertiesDTO } from '../models/dto/rdkit/rdkit-get-molecule-properties.cls.dto'
import { RdkitToCanonicalSmilesDTO } from '../models/dto/rdkit/rdkit-canonical-smiles.dto'
import { RdkitAreSameStructureDTO } from '../models/dto/rdkit/rdkit-are-same-structures.dto'
import { ApplicationErrorCode, applicationError } from 'src/exception-handling/application-error'

@Injectable()
export class RDKitService implements OnModuleInit {

    private readonly MAX_NATS_PAYLOAD_BYTES: number
    private readonly logger: LoggerContext
    private readonly namespaces: RDKitAPI_NS
    private readonly contracts = {
        getMoleculeProperties: NATS_CONTRACT_REGISTRY.rdkitGetMoleculeProperties,
        toCanonicalSmiles: NATS_CONTRACT_REGISTRY.rdkitToCanonicalSmiles,
        areSameStructure: NATS_CONTRACT_REGISTRY.rdkitAreSameStructure
    } as const

    constructor(
        @Inject('MERCURION_AI_CLIENT') private readonly mercurionAIClient: ClientProxy,
        private readonly configService: ConfigService,
        loggerFactory: LoggerPort
    ) {
        this.MAX_NATS_PAYLOAD_BYTES = this.configService.get<number>('App.maxNatsPayloadBytes')!
        this.logger = loggerFactory.forContext(RDKitService.name)
        this.namespaces = this.computeNamespaces()
    }

    onModuleInit() {
        this.logger.log(
            `MercurionWebNode connected via NATS to MercurionTox21 > rdkit_api,\n  => NATS namespaces = \x1b[36m${Object.values(this.namespaces).join(', ')}`
        )
    }

    // =========================
    // NAMESPACE
    // =========================
    private computeNamespaces(): RDKitAPI_NS {
        const env = this.configService.getOrThrow('App.env')
        return {
            get_molecule_properties: natsSubject('rdkitGetMoleculeProperties', env),
            to_canonical_smiles: natsSubject('rdkitToCanonicalSmiles', env),
            are_same_structure: natsSubject('rdkitAreSameStructure', env)
        }
    }

    // =========================
    // VALIDAZIONI PAYLOAD
    // =========================

    private ensurePayloadSize(dto: unknown) {
        const size = Buffer.byteLength(JSON.stringify(dto), 'utf8')
        if (size > this.MAX_NATS_PAYLOAD_BYTES) {
            throw applicationError(ApplicationErrorCode.TOX21_PAYLOAD_TOO_LARGE)
        }
    }

    private isValidPropsPayload(res: RdkitGetMoleculePropertiesWire): boolean {
        if (!res) return false
        if (res.error && res.error.trim().length > 0) return true
        const d = res.data
        if (!d) return false
        // controlli soft, giusto per evitare robe tipo data: "ciao"
        const keys: (keyof RdkitGetMoleculePropertiesResult)[] = [
            'mwFreebase', 'alogp', 'hba', 'hbd', 'psa', 'rtb'
        ]
        return keys.some(k => d[k] !== undefined)
    }

    private isValidCanonicalPayload(res: RdkitCanonicalSmilesWire): boolean {
        if (!res) return false
        if (res.error && res.error.trim().length > 0) return true
        return typeof res.data === 'string' && res.data.trim().length > 0
    }

    private isValidSameStructPayload(res: RdkitAreSameStructureWire): boolean {
        if (!res) return false
        if (res.error && res.error.trim().length > 0) return true
        return typeof res.data === 'boolean'
    }

    private mapError<T>(op: string): OperatorFunction<T, T> {
        return catchError((e: unknown) => {
            if (e instanceof TimeoutError) {
                return throwError(() =>
                    applicationError(ApplicationErrorCode.TOX21_TIMEOUT, `MercurionTox21ClientConnectionTimeoutNoResponse::${op}`)
                )
            }
            return throwError(() =>
                applicationError(ApplicationErrorCode.TOX21_UNKNOWN_ERROR, `MercurionTox21ClientConnectionUnknownError::${op}`)
            )
        })
    }

    // =========================
    // PUBLIC API
    // =========================

    async getMoleculeProperties(dto: RdkitGetMoleculePropertiesDTO): Promise<RdkitGetMoleculePropertiesResult> {
        this.ensurePayloadSize(dto)
        assertNatsRequest(this.contracts.getMoleculeProperties, dto)

        const res = await firstValueFrom(
            this.mercurionAIClient
                .send<RdkitGetMoleculePropertiesWire>(this.namespaces.get_molecule_properties, dto)
                .pipe(
                    timeout(this.contracts.getMoleculeProperties.timeoutMs),
                    this.mapError('get_molecule_properties')
                )
        )
        assertNatsResponse(this.contracts.getMoleculeProperties, res)

        if (!this.isValidPropsPayload(res)) {
            throw applicationError(ApplicationErrorCode.TOX21_INVALID_MOLECULE_PROPERTIES_PAYLOAD)
        }
        if (res.error && res.error.trim()) {
            throw applicationError(ApplicationErrorCode.TOX21_UPSTREAM_ERROR, `MercurionTox21ClientConnection::${res.error}`)
        }

        return res.data!
    }

    async toCanonicalSmiles(dto: RdkitToCanonicalSmilesDTO): Promise<string> {
        this.ensurePayloadSize(dto)
        assertNatsRequest(this.contracts.toCanonicalSmiles, dto)

        const res = await firstValueFrom(
            this.mercurionAIClient
                .send<RdkitCanonicalSmilesWire>(this.namespaces.to_canonical_smiles, dto)
                .pipe(
                    timeout(this.contracts.toCanonicalSmiles.timeoutMs),
                    this.mapError('to_canonical_smiles')
                )
        )
        assertNatsResponse(this.contracts.toCanonicalSmiles, res)

        if (!this.isValidCanonicalPayload(res)) {
            throw applicationError(ApplicationErrorCode.TOX21_INVALID_CANONICAL_SMILES_PAYLOAD)
        }
        if (res.error && res.error.trim()) {
            throw applicationError(ApplicationErrorCode.TOX21_UPSTREAM_ERROR, `MercurionTox21ClientConnection::${res.error}`)
        }

        return res.data!.trim()
    }

    async areSameStructure(dto: RdkitAreSameStructureDTO): Promise<boolean> {
        this.ensurePayloadSize(dto)
        assertNatsRequest(this.contracts.areSameStructure, dto)

        const res = await firstValueFrom(
            this.mercurionAIClient
                .send<RdkitAreSameStructureWire>(this.namespaces.are_same_structure, dto)
                .pipe(
                    timeout(this.contracts.areSameStructure.timeoutMs),
                    this.mapError('are_same_structure')
                )
        )
        assertNatsResponse(this.contracts.areSameStructure, res)

        if (!this.isValidSameStructPayload(res)) {
            throw applicationError(ApplicationErrorCode.TOX21_INVALID_ARE_SAME_STRUCTURE_PAYLOAD)
        }
        if (res.error && res.error.trim()) {
            throw applicationError(ApplicationErrorCode.TOX21_UPSTREAM_ERROR, `MercurionTox21ClientConnection::${res.error}`)
        }

        return !!res.data
    }
}
