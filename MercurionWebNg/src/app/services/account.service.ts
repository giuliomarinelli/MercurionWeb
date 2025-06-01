import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { UserData } from '../Models/account/account.models';
import { Observable, tap } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AccountService {

  constructor(private readonly http: HttpClient) { }

  private getStoredEmail(): string | null {
    if (!sessionStorage?.getItem('user_d')) {
      return null
    }
    const user_d = JSON.parse(sessionStorage?.getItem('user_d') ?? '') as UserData
    if (!user_d || !user_d.email) {
      return null
    }
    return user_d.email
  }

  private setStoredEmail(email: string): void {
    if (!email) {
      return
    }
    const user_d = JSON.parse(sessionStorage?.getItem('user_d') ?? '') as UserData
    const new_user_d: UserData = {
      email
    }
    if (!user_d || !user_d.email) {
      sessionStorage?.setItem('user_d', JSON.stringify(new_user_d))
    } else {
      user_d.email = email
      sessionStorage?.setItem('user_d', JSON.stringify(user_d))
    }

  }

  public getEmail(): Observable<string> {
    const storedEmail = this.getStoredEmail()
    if (storedEmail) {
      return new Observable(obs => obs.next(storedEmail))
    } else {
      return this.http.get<string>('/api/account/email', {
        withCredentials: true
      }).pipe(tap(email => this.setStoredEmail(email)))
    }
  }



}
