import { Confirm_Login_FirstStepDTO } from './../Models/types/interfaces/confirm.responses';
import { Injectable } from '@angular/core';
import { EmailDTO, Login_FirstStepDTO } from '../Models/types/auth/DTO/login.dtos';
import { ConfirmDTO } from '../Models/types/interfaces/confirm.responses';
import { Observable } from 'rxjs';
import { HttpClient } from '@angular/common/http';

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  constructor(private readonly http: HttpClient) { }

  public login_stepZero(emailDTO: EmailDTO): Observable<ConfirmDTO> {
    return this.http.post<ConfirmDTO>('/api/authentication/login/0', emailDTO, { withCredentials: true })
  }

  public login_firstStep(loginDTO: Login_FirstStepDTO): Observable<Confirm_Login_FirstStepDTO> {
    return this.http.post<Confirm_Login_FirstStepDTO>('/api/authentication/login/1', loginDTO, { withCredentials: true })
  }

}
