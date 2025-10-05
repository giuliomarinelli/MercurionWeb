import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { UserData } from '../Models/account/account.models';
import { Observable, of, tap } from 'rxjs';
import { EmailDTO } from '../Models/types/auth/DTO/login.dtos';
import { ConfirmDTO } from '../Models/confirm.dtos';
import { ConfirmWithObsContDTO } from '../Models/types/interfaces/confirm.responses';


@Injectable({
  providedIn: 'root'
})
export class AccountService {

  private USER_KEY = 'user_d'
  private CACHE_TIME = 15 * 60 * 1000 // 15 minuti

  constructor(private readonly http: HttpClient) { }

  private getStoredEmail(): string | null {
    const raw = sessionStorage?.getItem(this.USER_KEY)
    if (!raw) return null
    const user_d = JSON.parse(raw) as UserData
    if (!user_d?.email) return null
    if (user_d.ts && Date.now() - user_d.ts < this.CACHE_TIME) {
      return user_d.email
    }
    return null
  }

  private setStoredEmail(email: string): void {
    if (!email) return
    const user_d = {
      email,
      ts: Date.now()
    }
    sessionStorage?.setItem(this.USER_KEY, JSON.stringify(user_d))
  }

  public getEmail(): Observable<string> {
    const storedEmail = this.getStoredEmail()
    if (storedEmail) {
      return of(storedEmail)
    } else {
      return this.http.get('/api/account/email', {
        withCredentials: true,
        responseType: 'text'
      }).pipe(
        tap(email => this.setStoredEmail(email))
      )
    }
  }

  public sendForgottenPasswordLink(dto: EmailDTO, turnstileToken: string): Observable<ConfirmWithObsContDTO> {
    return this.http.post<ConfirmDTO>('/api/account/forgotten-password', dto, {
      withCredentials: true,
      headers: {
        'X-Challenge-Token': turnstileToken
      }
    })
  }

}
