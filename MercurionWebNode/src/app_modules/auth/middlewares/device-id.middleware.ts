import { Injectable, NestMiddleware } from '@nestjs/common';
import { FastifyRequest, FastifyReply } from 'fastify';
import { SecureCookieService } from '../services/secure-cookie.service';
import * as crypto from 'crypto';

@Injectable()
export class DeviceIdMiddleware implements NestMiddleware {

  constructor(private readonly secureCookieService: SecureCookieService) {}

  use(req: FastifyRequest, res: FastifyReply, next: () => void) {
    
    let deviceId: string | null = null

    try {
      deviceId = this.secureCookieService.getSignedCookie(req, '__device_id')
    } catch {
      deviceId = crypto.randomUUID();
      this.secureCookieService.setSignedCookie(res, '__device_id', deviceId)
    }

    // 🔥 Inietta deviceId nella richiesta PRIMA della guard
    req.headers['x-device-id'] = deviceId

    next()
  }
}
