import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { AuthSessionPersistenceService } from './auth-session-persistence.service';
import { routeManifest } from '../route-manifest';

@Injectable({ providedIn: 'root' })
export class AuthRedirectService {

  constructor(
    private readonly router: Router,
    private readonly persistence: AuthSessionPersistenceService

  ) { }

  private readonly fallback = routeManifest.dashboard.build({})

  /**
   * Store only canonical, same-origin application URLs.  URL is deliberately
   * resolved against the current origin so protocol-relative and encoded
   * open-redirect tricks cannot become valid internal paths.
   */
  capture(raw: string | null | undefined): string | null {
    const value = this.normalize(raw)
    if (!value) {
      if (raw != null && String(raw).trim()) this.clear()
      return null
    }
    this.persistence.setRedirectState(value)
    return value
  }

  peek(): string | null {
    const stored = this.persistence.getRedirectState()
    const normalized = this.normalize(stored)
    if (!normalized) {
      if (stored) this.clear()
      return null
    }
    if (stored !== normalized) this.persistence.setRedirectState(normalized)
    return normalized
  }

  consume(): string {
    const target = this.peek() ?? this.fallback
    this.clear()
    return target
  }

  clear(): void {
    this.persistence.removeRedirectState()
  }

  captureQueryParam(raw: string | null | undefined): string | null {
    return this.capture(raw)
  }

  private normalize(raw: string | null | undefined): string | null {
    const value = (raw ?? '').trim()
    if (!value || value.includes('\\') || value.startsWith('//')) return null
    let decoded: string
    try {
      decoded = decodeURIComponent(value)
    } catch {
      return null
    }
    if (decoded.includes('\\') || decoded.startsWith('//') || !decoded.startsWith('/')) return null

    try {
      const url = new URL(value, window.location.origin)
      if (url.origin !== window.location.origin || url.username || url.password) return null
      const path = `${url.pathname}${url.search}${url.hash}`
      if (!path.startsWith('/') || path.startsWith('//')) return null
      const route = path.split(/[?#]/, 1)[0].toLowerCase()
      if (route === routeManifest.login.build({}) || route.startsWith(`${routeManifest.login.build({})}/`)) return null
      return this.router.serializeUrl(this.router.parseUrl(path))
    } catch {
      return null
    }
  }

  /**
   * Forza il redirect verso il route manifest login path, anche se sei già su una sotto-route
   * come `/login/mfa/...`. Pulisce anche lo stato sessionStorage opzionalmente.
   */
  async redirectToLogin(): Promise<void> {
    this.persistence.clearPreAuthData()


    // Forza navigazione fuori da /login/...
    await this.router.navigateByUrl('/', { skipLocationChange: true })

    // Naviga poi a /login pulito
    await this.router.navigateByUrl(routeManifest.login.build({}), { replaceUrl: true })
  }
}
