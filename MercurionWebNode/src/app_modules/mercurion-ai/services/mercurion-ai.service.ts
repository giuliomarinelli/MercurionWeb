import { Inject, Injectable } from '@nestjs/common';
import { ClientProxy, RpcException } from '@nestjs/microservices';
import { MercurionInferReqDTO } from '../Models/DTO/mercurion-infer-req.dto';
import { MercurionInferDataDTO, MercurionInferResDTO } from '../Models/DTO/mercurion-infer-res.dto';
import { catchError, firstValueFrom, throwError, timeout, TimeoutError } from 'rxjs';

@Injectable()
export class MercurionAIService {

    private readonly MAX_NATS_PAYLOAD_BYTES = 4 * 1024

    constructor(@Inject('MERCURION_AI_CLIENT') private readonly mercurionAIClient: ClientProxy) { }

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
            throw new RpcException('MercurionTox21ClientConnection::PayloadTooLarge')
        }
    }

    public async getInferenceFromTop4MercurionTox21(
        dto: MercurionInferReqDTO,
    ): Promise<MercurionInferDataDTO> {

        this.ensurePayloadSize(dto)

        const res: MercurionInferResDTO = await firstValueFrom(
            this.mercurionAIClient
                .send<MercurionInferResDTO>('inference.tox21.smiles', dto)
                .pipe(
                    timeout(3000),
                    catchError((err) => {
                        if (err instanceof TimeoutError) {
                            return throwError(() =>
                                new RpcException('MercurionTox21ClientConnectionTimeoutNoResponse'),
                            );
                        }
                        return throwError(() =>
                            new RpcException('MercurionTox21ClientConnectionUnknownError'),
                        );
                    }),
                ),
        )

        if (!this.isValidInferencePayload(res)) {
            throw new RpcException('MercurionTox21ClientConnection::InvalidPayload')
        }
        if (res.error != undefined && res.error.trim()) {
            throw new RpcException(`MercurionTox21ClientConnection::${res.error}`)
        }
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { error, ...data } = res
        return data
    }

}
