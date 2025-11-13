/* eslint-disable @typescript-eslint/no-unsafe-assignment */
// src/app_modules/common/services/geo-ip.service.ts

import { Injectable, LoggerService } from '@nestjs/common';
import * as geoip from 'geoip-lite';
import { MeiliLoggerService } from 'src/app_modules/meilisearch/services/meili-logger.service';

export interface GeoLocationInfo {
    ip: string;
    country: string | null
    region: string | null
    city: string | null
    latitude: number | null
    longitude: number | null
}

export interface GeoLocation {
    latitude: number
    longitude: number
}

@Injectable()
export class GeoIpService {

    private readonly logger: LoggerService;

    constructor(meiliLogger: MeiliLoggerService) {
        this.logger = meiliLogger.forContext(GeoIpService.name)
    }

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
            }
        }

        return {
            ip,
            country: lookup.country ?? null,
            region: lookup.region ?? null,
            city: lookup.city ?? null,
            latitude: lookup.ll?.[0] ?? null,
            longitude: lookup.ll?.[1] ?? null
        }
    }

    haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
        const R = 6371; // Raggio terrestre in km
        const toRad = (deg: number) => deg * (Math.PI / 180)

        const dLat = toRad(lat2 - lat1)
        const dLon = toRad(lon2 - lon1)
        const a = Math.sin(dLat / 2) ** 2 +
            Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
            Math.sin(dLon / 2) ** 2;
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

        return R * c // distanza in km
    }

    isLocationClose(
        current: GeoLocation,
        saved: GeoLocation,
        thresholdKm = 20
    ): boolean {
        const distance = this.haversineDistance(current.latitude, current.longitude, saved.latitude, saved.longitude)
        return distance <= thresholdKm
    }

    isTrustedLocation(
        current: GeoLocation,
        saved: GeoLocation[],
        thresholdKm = 20
    ): boolean {
        const trust: boolean[] = []
        saved.forEach(loc => trust.push(this.isLocationClose(current, loc, thresholdKm)))
        return trust.some(close => close === true)
    }

}
