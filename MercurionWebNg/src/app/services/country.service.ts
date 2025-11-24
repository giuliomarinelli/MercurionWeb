import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { PhonePrefixDTO } from '../Models/country.models';

@Injectable({
  providedIn: 'root'
})
export class CountryService {

  private readonly http = inject(HttpClient)

  getAllPhonePrefixes(): Observable<PhonePrefixDTO[]> {
    return this.http.get<PhonePrefixDTO[]>('/api/countries/phone-prefixes', {
      withCredentials: true
    })
  }

}
