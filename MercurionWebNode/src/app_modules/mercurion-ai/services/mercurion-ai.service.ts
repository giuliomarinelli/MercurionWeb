import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { MercurionInferReqDTO } from '../Models/DTO/mt21/mercurion-infer-req.dto';
import { MercurionInferDataDTO, MercurionInferResDTO } from '../Models/DTO/mt21/mercurion-infer-res.dto';
import { catchError, firstValueFrom, throwError, timeout, TimeoutError } from 'rxjs';
import { ConfigService } from '@nestjs/config';
import { Environment } from 'src/config/config';
import { MeiliLoggerService } from 'src/app_modules/meilisearch/services/meili-logger.service';
import { MeiliContextLogger } from 'src/app_modules/meilisearch/Models/interfaces/meili-context-logger.interface';
import { ApplicationErrorCode, applicationError } from 'src/exception-handling/application-error'

@Injectable()
export class MercurionAIService implements OnModuleInit {

    private readonly MAX_NATS_PAYLOAD_BYTES: number

    private readonly logger: MeiliContextLogger

    private readonly namespace: string

    constructor(
        @Inject('MERCURION_AI_CLIENT') private readonly mercurionAIClient: ClientProxy,
        private readonly configService: ConfigService,
        loggerFactory: MeiliLoggerService
    ) {
        this.logger = loggerFactory.forContext(MercurionAIService.name)
        const env = this.configService.get<Environment>('App.env')
        let namespace: string = 'inference.tox21.smiles'
        if (env !== Environment.Production) {
            namespace = `${env}.${namespace}`
        }
        this.namespace = namespace
        this.MAX_NATS_PAYLOAD_BYTES = this.configService.get<number>('App.maxNatsPayloadBytes')!
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

    private ensurePayloadSize(dto: MercurionInferReqDTO) {
        const size = Buffer.byteLength(JSON.stringify(dto), 'utf8')
        if (size > this.MAX_NATS_PAYLOAD_BYTES) {
            throw applicationError(ApplicationErrorCode.TOX21_PAYLOAD_TOO_LARGE)
        }
    }

    public async getInferenceFromTop4MercurionTox21(
        dto: MercurionInferReqDTO,
    ): Promise<MercurionInferDataDTO> {

        this.ensurePayloadSize(dto)

        const res: MercurionInferResDTO = await firstValueFrom(
            this.mercurionAIClient
                .send<MercurionInferResDTO>(this.namespace, dto)
                .pipe(
                    timeout(3000),
                    catchError((err) => {
                        if (err instanceof TimeoutError) {
                            return throwError(() =>
                                applicationError(ApplicationErrorCode.TOX21_TIMEOUT),
                            );
                        }
                        return throwError(() =>
                            applicationError(ApplicationErrorCode.TOX21_UNKNOWN_ERROR),
                        );
                    }),
                ),
        )

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
