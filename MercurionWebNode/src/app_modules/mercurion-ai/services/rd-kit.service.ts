import { Inject, Injectable, OnModuleInit } from '@nestjs/common'
import { ClientProxy } from '@nestjs/microservices';
import { ConfigService } from '@nestjs/config'
import { catchError, firstValueFrom, OperatorFunction, throwError, timeout, TimeoutError } from 'rxjs'
import { MeiliLoggerService } from 'src/app_modules/meilisearch/services/meili-logger.service'
import { MeiliContextLogger } from 'src/app_modules/meilisearch/Models/interfaces/meili-context-logger.interface'
import { Environment } from 'src/config/config'
import { RDKitAPI_NS } from '../Models/interfaces/rdkit-api-ns.interface'
import {
    RdkitGetMoleculePropertiesWire,
    RdkitCanonicalSmilesWire,
    RdkitAreSameStructureWire,
    RdkitGetMoleculePropertiesResult
} from '../Models/DTO/rdkit/rdkit.res.dtos'
import { RdkitGetMoleculePropertiesDTO } from '../Models/DTO/rdkit/rdkit-get-molecule-properties.cls.dto'
import { RdkitToCanonicalSmilesDTO } from '../Models/DTO/rdkit/rdkit-canonical-smiles.dto'
import { RdkitAreSameStructureDTO } from '../Models/DTO/rdkit/rdkit-are-same-structures.dto'
import { ApplicationErrorCode, applicationError } from 'src/exception-handling/application-error'

@Injectable()
export class RDKitService implements OnModuleInit {

    private readonly MAX_NATS_PAYLOAD_BYTES: number
    private readonly logger: MeiliContextLogger
    private readonly namespaces: RDKitAPI_NS

    constructor(
        @Inject('MERCURION_AI_CLIENT') private readonly mercurionAIClient: ClientProxy,
        private readonly configService: ConfigService,
        loggerFactory: MeiliLoggerService
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
        const base: RDKitAPI_NS = {
            get_molecule_properties: 'rdkit_api.get_molecule_properties',
            to_canonical_smiles: 'rdkit_api.to_canonical_smiles',
            are_same_structure: 'rdkit_api.are_same_structure'
        }

        const env = this.configService.get<Environment>('App.env')!
        if (env !== Environment.Production) {
            return {
                get_molecule_properties: `${env}.${base.get_molecule_properties}`,
                to_canonical_smiles: `${env}.${base.to_canonical_smiles}`,
                are_same_structure: `${env}.${base.are_same_structure}`
            }
        }

        return base
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

        const res = await firstValueFrom(
            this.mercurionAIClient
                .send<RdkitGetMoleculePropertiesWire>(this.namespaces.get_molecule_properties, dto)
                .pipe(
                    timeout(3000),
                    this.mapError('get_molecule_properties')
                )
        )

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

        const res = await firstValueFrom(
            this.mercurionAIClient
                .send<RdkitCanonicalSmilesWire>(this.namespaces.to_canonical_smiles, dto)
                .pipe(
                    timeout(3000),
                    this.mapError('to_canonical_smiles')
                )
        )

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

        const res = await firstValueFrom(
            this.mercurionAIClient
                .send<RdkitAreSameStructureWire>(this.namespaces.are_same_structure, dto)
                .pipe(
                    timeout(3000),
                    this.mapError('are_same_structure')
                )
        )

        if (!this.isValidSameStructPayload(res)) {
            throw applicationError(ApplicationErrorCode.TOX21_INVALID_ARE_SAME_STRUCTURE_PAYLOAD)
        }
        if (res.error && res.error.trim()) {
            throw applicationError(ApplicationErrorCode.TOX21_UPSTREAM_ERROR, `MercurionTox21ClientConnection::${res.error}`)
        }

        return !!res.data
    }
}
