import { Inject, Injectable, OnModuleInit } from '@nestjs/common'
import { ClientProxy } from '@nestjs/microservices';
import { ConfigService } from '@nestjs/config'
import { LoggerPort } from 'src/logging/logger.port'
import { LoggerContext } from 'src/logging/logger.port'
import { RDKitAPI_NS } from '../models/interfaces/rdkit-api-ns.interface'
import {
    NATS_CONTRACT_REGISTRY,
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
import { ScientificRpcPolicy } from './scientific-rpc.policy'

@Injectable()
export class RDKitService implements OnModuleInit {

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
        loggerFactory: LoggerPort,
        private readonly scientificRpc: ScientificRpcPolicy,
    ) {
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

    // =========================
    // PUBLIC API
    // =========================

    async getMoleculeProperties(dto: RdkitGetMoleculePropertiesDTO): Promise<RdkitGetMoleculePropertiesResult> {
        const res = await this.scientificRpc.execute({
            operation: this.contracts.getMoleculeProperties.id,
            client: this.mercurionAIClient,
            subject: this.namespaces.get_molecule_properties,
            contract: this.contracts.getMoleculeProperties,
            payload: dto,
            isRemoteError: response => Boolean(response.error?.trim()),
        })

        if (!this.isValidPropsPayload(res)) {
            throw applicationError(ApplicationErrorCode.TOX21_INVALID_MOLECULE_PROPERTIES_PAYLOAD)
        }
        if (res.error && res.error.trim()) {
            throw applicationError(ApplicationErrorCode.TOX21_UPSTREAM_ERROR, `MercurionTox21ClientConnection::${res.error}`)
        }

        return res.data!
    }

    async toCanonicalSmiles(dto: RdkitToCanonicalSmilesDTO): Promise<string> {
        const res = await this.scientificRpc.execute<RdkitToCanonicalSmilesDTO, RdkitCanonicalSmilesWire>({
            operation: this.contracts.toCanonicalSmiles.id,
            client: this.mercurionAIClient,
            subject: this.namespaces.to_canonical_smiles,
            contract: this.contracts.toCanonicalSmiles,
            payload: dto,
            isRemoteError: response => Boolean(response.error?.trim()),
        })

        if (!this.isValidCanonicalPayload(res)) {
            throw applicationError(ApplicationErrorCode.TOX21_INVALID_CANONICAL_SMILES_PAYLOAD)
        }
        if (res.error && res.error.trim()) {
            throw applicationError(ApplicationErrorCode.TOX21_UPSTREAM_ERROR, `MercurionTox21ClientConnection::${res.error}`)
        }

        return res.data!.trim()
    }

    async areSameStructure(dto: RdkitAreSameStructureDTO): Promise<boolean> {
        const res = await this.scientificRpc.execute({
            operation: this.contracts.areSameStructure.id,
            client: this.mercurionAIClient,
            subject: this.namespaces.are_same_structure,
            contract: this.contracts.areSameStructure,
            payload: dto,
            isRemoteError: response => Boolean(response.error?.trim()),
        })

        if (!this.isValidSameStructPayload(res)) {
            throw applicationError(ApplicationErrorCode.TOX21_INVALID_ARE_SAME_STRUCTURE_PAYLOAD)
        }
        if (res.error && res.error.trim()) {
            throw applicationError(ApplicationErrorCode.TOX21_UPSTREAM_ERROR, `MercurionTox21ClientConnection::${res.error}`)
        }

        return !!res.data
    }
}
