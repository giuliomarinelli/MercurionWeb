import { Injectable } from '@nestjs/common';
import { FastifyRequest } from 'fastify';

@Injectable()
export class IpService {
  getClientIp(req: FastifyRequest): string {
    const forwardedFor = req.headers['x-forwarded-for'] as string | undefined
    const rawIp = forwardedFor?.split(',')[0]?.trim();

    if (rawIp && this.isPublicIp(rawIp)) {
      return rawIp
    }

    return req.ip // fallback su 127.0.0.1 o ::1
  }

  private isPublicIp(ip: string): boolean {
    // Ignora localhost / private ranges (simplified)
    return !/^((127\.)|(10\.)|(192\.168\.)|(::1))/.test(ip)
  }
}
