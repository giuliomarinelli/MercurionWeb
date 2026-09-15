import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { ConfigService } from '@nestjs/config';
import { TurnstileResponse } from '../Models/interfaces/turnstile-response.interface';
import { AxiosResponse } from 'axios';
import { LoggerPort } from 'src/logging/logger.port';
import { LoggerContext } from 'src/logging/logger.port';



@Injectable()
export class TurnstileService {

  private readonly secret: string
  private readonly logger: LoggerContext

  constructor(
    private readonly http: HttpService,
    private readonly configService: ConfigService,
    loggerFactory: LoggerPort
  ) {
    this.secret = this.configService.get<string>('Cloudflare.secretKey') as string
    this.logger = loggerFactory.forContext(TurnstileService.name)
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
        this.http.post<TurnstileResponse>(url, new URLSearchParams(data))
      )

      return res.data.success
    } catch (e) {
      this.logger.warn('Error in CF Turnstile validation', e as object)
      return false
    }
  }
}
