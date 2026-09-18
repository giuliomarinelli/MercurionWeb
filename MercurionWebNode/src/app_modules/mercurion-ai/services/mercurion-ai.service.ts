import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { MercurionInferReqDTO } from '../models/dto/mt21/mercurion-infer-req.dto';
import { MercurionInferDataDTO, MercurionInferResDTO } from '../models/dto/mt21/mercurion-infer-res.dto';
import { ConfigService } from '@nestjs/config';
import { LoggerPort } from 'src/logging/logger.port'
import { LoggerContext } from 'src/logging/logger.port'
import {
    NATS_CONTRACT_REGISTRY,
    natsSubject,
} from '@mercurion/rest-contracts'
import { ApplicationErrorCode, applicationError } from 'src/exception-handling/application-error'
import { ScientificRpcPolicy } from './scientific-rpc.policy'

@Injectable()
export class MercurionAIService implements OnModuleInit {

    private readonly logger: LoggerContext

    private readonly contract = NATS_CONTRACT_REGISTRY.inferenceTop4
    private readonly namespace: string

    constructor(
        @Inject('MERCURION_AI_CLIENT') private readonly mercurionAIClient: ClientProxy,
        private readonly configService: ConfigService,
        loggerFactory: LoggerPort,
        private readonly scientificRpc: ScientificRpcPolicy,
    ) {
        this.logger = loggerFactory.forContext(MercurionAIService.name)
        this.namespace = natsSubject(
            'inferenceTop4',
            this.configService.getOrThrow('App.env')
        )
    }

    onModuleInit(): void {
        this.logger.log(`MercurionWebNode connected via NATS to MercurionTox21 > inference,\n  => NATS namespace = \x1b[36m${this.namespace}`)
    }

    private isValidInferencePayload(res: MercurionInferResDTO): boolean {
        const labels: (keyof MercurionInferDataDTO)[] = ["SR-ATAD5", "NR-AhR", "SR-MMP", "SR-p53"]
        for (const label of labels) {
            const v = res[label]
            if (!v) continue
            if (typeof v.probability !== 'number' || !Number.isFinite(v.probability)) return false
            if (typeof v.threshold !== 'number' || !Number.isFinite(v.threshold)) return false
            if (typeof v.is_positive !== 'boolean') return false
        }
        return true
    }

    public async getInferenceFromTop4MercurionTox21(
        dto: MercurionInferReqDTO,
    ): Promise<MercurionInferDataDTO> {

        const res: MercurionInferResDTO = await this.scientificRpc.execute({
            operation: this.contract.id,
            client: this.mercurionAIClient,
            subject: this.namespace,
            contract: this.contract,
            payload: dto,
            isRemoteError: response => typeof response === 'object' && response !== null && 'error' in response,
        })

        if (!this.isValidInferencePayload(res)) {
            throw applicationError(ApplicationErrorCode.TOX21_INVALID_PAYLOAD)
        }
        if (res.error != undefined && res.error.trim()) {
            throw applicationError(ApplicationErrorCode.TOX21_UPSTREAM_ERROR, `MercurionTox21ClientConnection::${res.error}`)
        }
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { error, ...data } = res
        return data
    }

}
