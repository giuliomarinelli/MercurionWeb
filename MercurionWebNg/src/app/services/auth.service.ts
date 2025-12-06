import { Confirm_Login_FirstStepDTO, ConfirmWithAccessTokenAndInitialsDTO, ConfirmWithObsContDTO } from '../Models/confirm.models';
import { inject, Injectable } from '@angular/core';
import { ConfirmDTO } from '../Models/confirm.models';
import { finalize, Observable, shareReplay, tap } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { ConfirmWithTotpMetaDTO } from '../Models/confirm.models';
import { JwtHelperService } from './jwt-helper.service';
import { firstValueFrom } from 'rxjs';
import { EmailDTO, Login_FirstStepWrapper, SignedSessionIdDTO } from '../Models/auth/login.models';
import { BackupCodeDTO, TotpBodyDTO, VerifyBodyDTO } from '../Models/auth/totp.models';
import { ISessionDeviceInfo } from '../Models/auth/fingerprint.models';
import { UserRegisterDTO } from '../Models/auth/user.models';
import { TypeGuardsService } from './type-guards.service';
import { UserContextService } from './context/user-context.service';
import { Router } from '@angular/router';
import { MfaStrategy } from '../Models/account/account.models';
import { SSO_AuthProvider } from '../Models/auth/provider.models';
import { Maybe } from 'graphql/jsutils/Maybe';

export type TokenType = 'access_token' | 'ws_accessToken'

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  // ======================= DEPS =======================
  private readonly jwtHelper = inject(JwtHelperService)
  private readonly http = inject(HttpClient)
  private readonly typeGuards = inject(TypeGuardsService)
  private readonly userContext = inject(UserContextService)
  private readonly router = inject(Router)
  // ====================================================

  private readonly AT_NAMESPACE = ''
  private readonly WS_AT_NAMESPACE = 'ws_'


  private inflight$?: Observable<string>;

  private authBC = new BroadcastChannel('mercurion-auth');

  private readonly WS_AT_KEY = 'ws_accessToken';
  private readonly WS_AT_TS_KEY = 'ws_accessToken_ts';
  private readonly WS_REFRESH_LOCK = 'ws_refresh_lock'; // JSON { owner: string, expiresAt: number }
  private readonly lockTtlMs = 5000;

  constructor() {
    // id di tab per il lock cross-tab
    if (!sessionStorage.getItem('tab_id')) {
      const id = (crypto as any)?.randomUUID?.() ?? Math.random().toString(36).slice(2);
      sessionStorage.setItem('tab_id', id);
    }
  }

  getMfaStrategiesDescrMap(): Map<MfaStrategy, string> {
    const map = new Map()
    map.set('EMAIL_OTP', 'autenticazione a più fattori via mail')
    map.set('SMS_OTP', 'autenticazione a più fattori via sms')
    map.set('APP_TOTP', 'autenticazione a più fattori via app')
    return map
  }

  getCookieValue(key: string): string | null {
    const cookies = document.cookie.split('; ')
    for (const cookie of cookies) {
      const [name, value] = cookie.split('=')
      if (name.trim() === key) {
        return decodeURIComponent(value)
      }
    }
    return null
  }


  /* ───────── Broadcast cross-tab (già esistenti) ───────── */

  broadcastLogin(initials: string, wsToken: string) {
    this.authBC.postMessage({ type: 'logged-in', initials, wsToken });
  }

  broadcastLogout() {
    this.authBC.postMessage({ type: 'logged-out' });
  }

  /* ───────── Access Token (HTTP) ───────── */

  getAccessToken(): string | null {
    return localStorage.getItem('accessToken');
  }

  setAccessToken(token: string | null) {
    if (token) {
      localStorage.setItem('accessToken', token);
    } else {
      localStorage.removeItem('accessToken');
    }
  }

  /* ───────── WS Access Token (WebSocket) ───────── */

  getWs_accessToken(): string | null {
    return localStorage.getItem(this.WS_AT_KEY);
  }

  setWs_accessToken(token: string | null): void {
    if (token) {
      localStorage.setItem(this.WS_AT_KEY, token);
      localStorage.setItem(this.WS_AT_TS_KEY, String(Date.now()));
    } else {
      localStorage.removeItem(this.WS_AT_KEY);
      localStorage.removeItem(this.WS_AT_TS_KEY);
    }
  }

  /** true se il token WS è assente o scaduto */
  isWsTokenExpired(token?: string | null): boolean {
    const t = token ?? this.getWs_accessToken();
    if (!t) return true;
    return this.jwtHelper.isTokenExpired(t);
  }

  /** TTL nominale del token WS (exp - iat), in secondi; null se non determinabile */
  getWsTokenTtlSeconds(token?: string | null): number | null {
    const t = token ?? this.getWs_accessToken();
    if (!t) return null;
    const iat = this.jwtHelper.getClaim<number>(t, 'iat');
    const exp = this.jwtHelper.getClaim<number>(t, 'exp');
    if (typeof iat !== 'number' || typeof exp !== 'number') return null;
    const ttl = exp - iat;
    return Number.isFinite(ttl) ? ttl : null;
  }

  /* ───────── User info ───────── */

  public getLoggedUserId(): string | null {
    const at = this.getAccessToken();
    if (!at) return null;
    return this.jwtHelper.getClaim<string>(at, 'sub');
  }

  /* ───────── Register ───────── */

  registerUser(dto: UserRegisterDTO): Observable<ConfirmWithObsContDTO> {
    return this.http.post<ConfirmWithObsContDTO>('/api/account/register', dto, {
      withCredentials: true
    })
  }

  isUserAvailableByEmail(email: string): Observable<boolean> {
    const dto: EmailDTO = { email }
    return this.http.post<boolean>('/api/account/is-email-available', dto, {
      withCredentials: true
    })
  }

  /* ───────── Login flow (immutato) ───────── */

  public login_stepZero(emailDTO: EmailDTO): Observable<ConfirmDTO> {
    return this.http.post<ConfirmDTO>('/api/authentication/login/0', emailDTO,
      { withCredentials: true }
    )
  }

  public login_firstStep(loginWrapper: Login_FirstStepWrapper): Observable<Confirm_Login_FirstStepDTO> {
    const { fingerprintBase64, sessionDeviceInfo, turnstileToken, ...loginDTO } = loginWrapper;
    return this.http.post<Confirm_Login_FirstStepDTO>('/api/authentication/login/1', loginDTO, {
      withCredentials: true,
      headers: {
        'X-Fingerprint': fingerprintBase64,
        'X-Device-Info': btoa(JSON.stringify(sessionDeviceInfo)),
        'X-Mock-IP': '91.122.12.8',
        'X-Challenge-Token': turnstileToken
      }
    }).pipe(tap((res) => {
      if (this.typeGuards.isNotNullish(res.accessToken)) {
        const scp = this.getUserScopesFromClaims(res.accessToken)
        if (scp && scp.length) {
          this.setCachedScopes(scp)
        }
      }
      this.userContext.logout()
    }))
  }

  public login_secondStep(strategy: 'EMAIL_OTP' | 'SMS_OTP', preAuthorizationToken: string, trustVerify: boolean = false): Observable<ConfirmWithTotpMetaDTO> {
    const query = trustVerify ? `?trust_verify=${trustVerify}` : ''
    return this.http.post<ConfirmWithTotpMetaDTO>(`/api/authentication/login/${strategy}/2${query}`, null, {
      withCredentials: true,
      headers: {
        'Authorization': `Bearer ${preAuthorizationToken}`
      }
    })
  }

  public login_thirdStep(
    strategy: MfaStrategy,
    dto: TotpBodyDTO | BackupCodeDTO,
    fingerprintData: {
      fingerprintBase64: string
      sessionDeviceInfo: ISessionDeviceInfo
    },
    preauthorizationToken: string,
    trustVerify: boolean = false
  ): Observable<ConfirmWithAccessTokenAndInitialsDTO> {
    const { fingerprintBase64, sessionDeviceInfo } = fingerprintData
    const kind = strategy !== 'BACKUP_CODE' ? 'totp' : 'backup'
    const body: VerifyBodyDTO = {
      kind,
      payload: dto
    }
    const query = trustVerify ? `?trust_verify=${trustVerify}` : ''
    return this.http.post<ConfirmWithAccessTokenAndInitialsDTO>(`/api/authentication/login/${strategy}/3${query}`, body, {
      withCredentials: true,
      headers: {
        'X-Fingerprint': fingerprintBase64,
        'X-Device-Info': btoa(JSON.stringify(sessionDeviceInfo)),
        'Authorization': `Bearer ${preauthorizationToken}`,
        'X-Mock-IP': '91.122.12.8'
      }
    }).pipe(tap((res) => {
      if (this.typeGuards.isNotNullish(res.accessToken)) {
        const scp = this.getUserScopesFromClaims(res.accessToken)
        if (scp && scp.length) {
          this.setCachedScopes(scp)
        }
      }
    }))
  }

  public logout(): Observable<void> {
    localStorage?.getItem('login') && localStorage?.removeItem('login');
    this.setAccessToken(null);
    this.setWs_accessToken(null);
    // pulisci eventuale lock pendente
    const lock = this.readLock();
    if (lock?.owner === this.tabId) {
      localStorage.removeItem(this.WS_REFRESH_LOCK);
    }
    return this.http.delete<void>('/api/authentication/logout', {
      withCredentials: true
    })
  }

  /* ───────── WS refresh HTTP (single-flight per tab) ───────── */

  refreshWs_accessToken(): Observable<string> {
    if (!this.inflight$) {
      this.inflight$ = this.http.get('/api/authentication/ws-refresh', {
        withCredentials: true,
        responseType: 'text'
      }).pipe(
        tap(tok => this.setWs_accessToken(tok)),
        shareReplay(1),
        finalize(() => { this.inflight$ = undefined; })
      );
    }
    return this.inflight$;
  }

  /**
   * Refresh WS token con lock cross-tab.
   * - Se acquisisci il lock: chiami l’API e scrivi il token in LS.
   * - Altrimenti attendi che il token venga aggiornato o che il lock scada.
   * Ritorna il token (se ottenuto) o null.
   */
  async refreshWsAccessTokenLocked(timeoutMs = 6000): Promise<string | null> {
    const start = this.now();

    if (this.tryAcquireLock()) {
      try {
        const tok = await firstValueFrom(this.refreshWs_accessToken());
        return tok;
      } catch {
        return null;
      } finally {
        this.releaseLock();
      }
    }

    await this.waitForTokenChangeOrUnlock(timeoutMs - (this.now() - start));
    return this.getWs_accessToken();
  }

  /* ───────── Interni: lock cross-tab ───────── */

  private get tabId(): string {
    return sessionStorage.getItem('tab_id')!;
  }

  private now() { return Date.now(); }

  private async sleep(ms: number): Promise<void> {
    await new Promise(res => setTimeout(res, ms));
  }

  private readLock(): { owner: string; expiresAt: number } | null {
    try {
      const raw = localStorage.getItem(this.WS_REFRESH_LOCK);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  private tryAcquireLock(): boolean {
    const lock = this.readLock();
    const expiredOrMine = !lock || lock.expiresAt <= this.now() || lock.owner === this.tabId;
    if (expiredOrMine) {
      const payload = JSON.stringify({ owner: this.tabId, expiresAt: this.now() + this.lockTtlMs });
      localStorage.setItem(this.WS_REFRESH_LOCK, payload);
      const confirm = this.readLock();
      return !!confirm && confirm.owner === this.tabId;
    }
    return false;
  }

  private releaseLock(): void {
    const lock = this.readLock();
    if (lock?.owner === this.tabId) {
      localStorage.removeItem(this.WS_REFRESH_LOCK);
    }
  }

  private async waitForTokenChangeOrUnlock(timeoutMs: number): Promise<void> {
    if (timeoutMs <= 0) return;
    const start = this.now();
    const initialTok = this.getWs_accessToken();

    let stop = false;
    const onStorage = (e: StorageEvent) => {
      if (e.key === this.WS_AT_KEY || e.key === this.WS_REFRESH_LOCK) {
        stop = true;
      }
    };
    window.addEventListener('storage', onStorage);

    try {
      while (!stop && (this.now() - start) < timeoutMs) {
        const newTok = this.getWs_accessToken();
        if (newTok && newTok !== initialTok) break;
        const lock = this.readLock();
        if (!lock || lock.expiresAt <= this.now()) break;
        await this.sleep(50);
      }
    } finally {
      window.removeEventListener('storage', onStorage)
    }
  }

  getUserScopesFromClaims(token?: Maybe<string>, setCache = false): string[] {
    token = token ?? this.getAccessToken() as Maybe<string>
    if (!token) {
      return []
    }
    const scp = this.jwtHelper.getClaim<string>(token, 'scp')
    if (!scp) {
      return []
    }
    const scpArr = scp.split(/\s+/)
    if (setCache) {
      this.setCachedScopes(scpArr)
    }
    return scpArr
  }

  private generateScopesStorageKey(context: TokenType): string | null {
    switch (context) {
      case 'access_token':
        return this.AT_NAMESPACE + 'scp'
      case 'ws_accessToken':
        return this.WS_AT_NAMESPACE + 'scp'
      default:
        return null
    }
  }

  setCachedScopes(scp: string[] | null, context: TokenType = 'access_token'): void {

    const key = this.generateScopesStorageKey(context)

    if (scp === null) {
      this.clearCachedScopes(context)
      return
    }

    if (!this.typeGuards.isNotNullish(key)) {
      return
    }

    const encVal = btoa(JSON.stringify(scp))
    localStorage.setItem(key, encVal)
  }

  getCachedScopes(context: TokenType = 'access_token'): string[] | null {

    const key = this.generateScopesStorageKey(context)

    if (!this.typeGuards.isNotNullish(key)) return null

    const raw = localStorage.getItem(key)
    if (!raw) return null

    try {
      const decoded = atob(raw)
      const parsed = JSON.parse(decoded) as string[]
      return parsed
    } catch {
      return null
    }
  }

  clearCachedScopes(context: TokenType): void {
    const key = this.generateScopesStorageKey(context)
    if (this.typeGuards.isNotNullish(key) && !!localStorage.getItem(key)) {
      localStorage.removeItem(key)
    }
  }

  logoutFromSession(ssid: string, current = false): Observable<ConfirmDTO> {
    const body: SignedSessionIdDTO = {
      signedSessionId: ssid
    }
    return this.http.patch<ConfirmDTO>('/api/authentication/logout-from-session', body, {
      withCredentials: true
    }).pipe(tap(() => {
      if (current) {
        this.userContext.logout()
        this.router.navigateByUrl('/login')
      }
    }))
  }

  logoutFromAllSessions(): Observable<ConfirmDTO> {
    return this.http.patch<ConfirmDTO>('/api/authentication/logout-from-all-sessions', null, {
      withCredentials: true
    }).pipe(tap(() => {
      this.userContext.logout()
      this.router.navigateByUrl('/login')
    }))
  }

  sso_authorizeFlow(fingerprintBase64: string, sessionDeviceInfoBase64: string, sso_preAuthorizationToken: string, provider: SSO_AuthProvider): Observable<ConfirmWithAccessTokenAndInitialsDTO> {
    return this.http.post<ConfirmWithAccessTokenAndInitialsDTO>(`/api/authentication/sso/${provider}/authorize-flow`, null, {
      withCredentials: true,
      headers: {
        'X-Fingerprint': fingerprintBase64,
        'X-Device-Info': sessionDeviceInfoBase64,
        'X-Mock-IP': '91.122.12.8',
        'Authorization': `Bearer ${sso_preAuthorizationToken}`
      }
    })
  }
}
