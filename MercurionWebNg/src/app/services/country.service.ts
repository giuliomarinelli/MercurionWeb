import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { PhonePrefixWithEmojiUrlDTO } from '../Models/country.models';
import type { PhonePrefixDTO } from '@mercurion/rest-contracts'

@Injectable({
  providedIn: 'root'
})
export class CountryService {

  private readonly http = inject(HttpClient)

  // cartella dove Angular copia gli SVG di svg-country-flags
  private readonly FLAG_BASE_PATH = '/flags'

  getAllPhonePrefixes(): Observable<PhonePrefixWithEmojiUrlDTO[]> {
    return this.http.get<PhonePrefixDTO[]>('/api/countries/phone-prefixes', {
      withCredentials: true
    }).pipe(
      map(prefixes =>
        prefixes.map(p => ({
          ...p,
          emojiUrl: this.iso2ToFlagUrl(p.iso2)
        }))
      )
    );
  }

  private iso2ToFlagUrl(iso2: string | null | undefined): string {
    if (!iso2) return ''
    const code = iso2.trim().toLowerCase()
    return `${this.FLAG_BASE_PATH}/${code}.svg`
  }
}
