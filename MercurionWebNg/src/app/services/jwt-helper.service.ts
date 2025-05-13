// src/app/services/jwt-helper.service.ts

import { Injectable } from '@angular/core';
import { jwtDecode, JwtPayload } from 'jwt-decode';

@Injectable({
  providedIn: 'root'
})
export class JwtHelperService {

  constructor() {}

  /**
   * Decodifica un access token JWT e ritorna i claim come oggetto.
   * @param token JWT token (access token)
   * @returns Oggetto dei claim oppure null se invalido
   */
  decodeToken(token: string): JwtPayload | null {
    try {
      return jwtDecode<JwtPayload>(token)
    } catch (error) {
      console.error('Errore nella decodifica del token:', error)
      return null
    }
  }

  /**
   * Ottiene un claim specifico
   * @param token JWT token
   * @param claimName Nome del claim da estrarre
   * @returns Valore del claim o null
   */
  getClaim<T = Record<string, any>>(token: string, claimName: string): T | null {
    const decoded = this.decodeToken(token) as Record<string, any>;
    return decoded && claimName in decoded ? decoded[claimName] as T : null
  }

  /**
   * Verifica se il token è scaduto
   * @param token JWT token
   * @returns true se il token è scaduto
   */
  isTokenExpired(token: string): boolean {
    const decoded = this.decodeToken(token)
    if (!decoded || !decoded.exp) return true
    const now = Math.floor(Date.now() / 1000)
    return decoded.exp < now
  }
}
