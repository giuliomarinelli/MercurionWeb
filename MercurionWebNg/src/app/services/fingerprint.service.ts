import { Injectable } from '@angular/core';
import { FingerprintData, FingerprintDataWrapper, ISessionDeviceInfo } from '../Models/types/auth/DTO/fingerprint.dtos';
import { getFingerprintData } from '@thumbmarkjs/thumbmarkjs'
import { RawFingerprintData } from '../Models/types/auth/DTO/fingerprint-raw.dtos';

@Injectable({
  providedIn: 'root'
})
export class FingerprintService {

  constructor() { }

  async getSanitizedFingerprint(): Promise<FingerprintDataWrapper> {

    const raw = await getFingerprintData() as unknown as RawFingerprintData

    const fingerprintData: FingerprintData = {
      audio: {
        sampleHash: raw.audio?.sampleHash,
        oscillator: raw.audio?.oscillator,
        maxChannels: raw.audio?.maxChannels
      },
      hardware: {
        videocard: {
          vendor: raw.hardware?.videocard?.vendor,
          renderer: raw.hardware?.videocard?.renderer
        }
      },
      locales: {
        languages: raw.locales?.languages
      },
      plugins: {
        plugins: raw.plugins?.plugins?.slice(0, 3)
      },
      screen: {
        is_touchscreen: raw.screen?.is_touchscreen,
        colorDepth: raw.screen?.colorDepth
      },
      system: {
        platform: raw.system?.platform,
        productSub: raw.system?.productSub,
        product: raw.system?.product,
        hardwareConcurrency: raw.system?.hardwareConcurrency
      },
      webgl: {
        commonImageHash: raw.webgl?.commonImageHash
      },
      math: {
        acos: raw.math?.acos,
        cos: raw.math?.cos,
        log: raw.math?.log,
        pi: raw.math?.pi,
        sqrt: raw.math?.sqrt
      }
    }

    const sessionDeviceInfo: ISessionDeviceInfo = {
      osPlatform: raw.system?.platform,
      useragent: raw.system?.useragent,
      browser: {
        name: raw.system?.browser?.name,
        version: raw.system?.browser?.version
      }
    }

    const fingerprintDataEnc = btoa(JSON.stringify(fingerprintData));

    return {
      fingerprintDataEnc,
      sessionDeviceInfo
    }
  }

}
