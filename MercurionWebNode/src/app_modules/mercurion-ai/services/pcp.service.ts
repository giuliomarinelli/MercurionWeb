import { Inject, Injectable, OnModuleInit } from '@nestjs/common'
import { ClientProxy } from '@nestjs/microservices'
import { ConfigService } from '@nestjs/config'
import {
    NATS_CONTRACT_REGISTRY,
    natsSubject,
    type PcpGetIupacNameFromSmilesDTO,
} from '@mercurion/rest-contracts'
import { LoggerPort, type LoggerContext } from 'src/logging/logger.port'
import { ApplicationErrorCode, applicationError } from 'src/exception-handling/application-error'
import { ScientificRpcPolicy } from './scientific-rpc.policy'

@Injectable()
export class PcpService implements OnModuleInit {
    private readonly logger: LoggerContext
    private readonly contract = NATS_CONTRACT_REGISTRY.pcpGetIupacNameFromSmiles
    private readonly namespace: string

    constructor(
        @Inject('MERCURION_AI_CLIENT') private readonly mercurionAIClient: ClientProxy,
        configService: ConfigService,
        loggerFactory: LoggerPort,
        private readonly scientificRpc: ScientificRpcPolicy,
    ) {
        this.logger = loggerFactory.forContext(PcpService.name)
        this.namespace = natsSubject('pcpGetIupacNameFromSmiles', configService.getOrThrow('App.env'))
    }

    onModuleInit(): void {
        this.logger.log(
            `MercurionWebNode connected via NATS to MercurionTox21 > PubChem,\n  => NATS namespace = \x1b[36m${this.namespace}`
        )
    }

    async getIupacNameFromSmiles(dto: PcpGetIupacNameFromSmilesDTO): Promise<string> {
        const res = await this.scientificRpc.execute({
            operation: this.contract.id,
            client: this.mercurionAIClient,
            subject: this.namespace,
            contract: this.contract,
            payload: dto,
            isRemoteError: response => Boolean(response.error?.trim()),
        })

        if (res.error !== undefined) {
            throw applicationError(ApplicationErrorCode.TOX21_UPSTREAM_ERROR, `MercurionTox21ClientConnection::${res.error}`)
        }

        return res.data.iupac_name
    }
}
