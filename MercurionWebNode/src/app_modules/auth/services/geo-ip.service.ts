/* eslint-disable @typescript-eslint/no-unsafe-assignment */
// src/app_modules/common/services/geo-ip.service.ts

import { Injectable, Logger } from '@nestjs/common';
import * as geoip from 'geoip-lite';

export interface GeoLocationInfo {
  ip: string;
  country: string | null
  region: string | null
  city: string | null
  latitude: number | null
  longitude: number | null
}

@Injectable()
export class GeoIpService {
  
  private readonly logger = new Logger(GeoIpService.name);

  getLocation(ip: string): GeoLocationInfo {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const lookup = geoip.lookup(ip)

    if (!lookup) {
      this.logger.warn(`IP geolocation failed for: ${ip}`);
      return {
        ip,
        country: null,
        region: null,
        city: null,
        latitude: null,
        longitude: null
      };
    }

    return {
      ip,
      country: lookup.country ?? null,
      region: lookup.region ?? null,
      city: lookup.city ?? null,
      latitude: lookup.ll?.[0] ?? null,
      longitude: lookup.ll?.[1] ?? null
    };
  }
}
