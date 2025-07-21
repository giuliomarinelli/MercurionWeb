import { Inject, Injectable } from '@nestjs/common';
import { ClientProxy, RpcException } from '@nestjs/microservices';
import { MercurionInferReqDTO } from '../Models/DTO/mercurion-infer-req.dto';
import { MercurionInferDataDTO, MercurionInferResDTO } from '../Models/DTO/mercurion-infer-res.dto';
import { catchError, firstValueFrom, throwError, timeout, TimeoutError } from 'rxjs';

@Injectable()
export class MercurionAIService {

    constructor(@Inject('MERCURION_AI_CLIENT') private readonly mercurionAIClient: ClientProxy) { }

    public async getInferenceFromTop4MercurionTox21(dto: MercurionInferReqDTO): Promise<MercurionInferDataDTO> | never {

        const res: MercurionInferResDTO = await firstValueFrom(
            this.mercurionAIClient.send<MercurionInferResDTO>('inference.tox21.smiles', dto).pipe(
                timeout(3000), // ⏱️ Timeout dopo 3 secondi
                catchError((err) => {
                    if (err instanceof TimeoutError) {
                        return throwError(() => new RpcException('MercurionTox21ClientConnectionTimeoutNoResponse'))
                    }
                    return throwError(() => new RpcException('MercurionTox21ClientConnectionUnknownError'))
                })
            )
        )
        if (res.error != undefined && res.error.trim()) {
            throw new RpcException(`MercurionTox21ClientConnection::${res.error}`)
        }
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { error, ...data } = res
        return data

    }

}
