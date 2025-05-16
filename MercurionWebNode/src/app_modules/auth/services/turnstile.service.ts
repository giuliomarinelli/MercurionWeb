import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { ConfigService } from '@nestjs/config';
import { TurnstileResponse } from '../Models/interfaces/turnstile-response.interface';
import { AxiosResponse } from 'axios';



@Injectable()
export class TurnstileService {

  private readonly secret: string

  constructor(
    private readonly http: HttpService,
    private readonly configService: ConfigService
  ) {
    this.secret = this.configService.get<string>('CloudeFlare.secretKey') as string
  }

  async verifyToken(token: string, remoteIp?: string): Promise<boolean> {

    const data: Record<string, string> = {
      secret: this.secret,
      response: token,
    }

    if (remoteIp) data['remoteip'] = remoteIp

    const url = 'https://challenges.cloudflare.com/turnstile/v0/siteverify'

    try {
      const res: AxiosResponse<TurnstileResponse> = await firstValueFrom(
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
        this.http.post<TurnstileResponse>(url, new URLSearchParams(data))
      )

      return res.data.success
    } catch {
      // Puoi loggare dettagli qui se vuoi debugging avanzato
      return false
    }
  }
}
