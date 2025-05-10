import { Injectable } from '@angular/core';
import { Router } from '@angular/router';

@Injectable({ providedIn: 'root' })
export class AuthRedirectService {

  constructor(private readonly router: Router) { }

  /**
   * Forza il redirect verso `/login`, anche se sei già su una sotto-route
   * come `/login/mfa/...`. Pulisce anche lo stato sessionStorage opzionalmente.
   */
  async redirectToLogin(reason?: string): Promise<void> {

    if (reason) {
      sessionStorage.setItem('mfaError', reason);

      // Attendi per sicurezza
      await new Promise(resolve => setTimeout(resolve, 0));
    }


    sessionStorage.removeItem('preAuthorizationData')


    // Forza navigazione fuori da /login/...
    await this.router.navigateByUrl('/', { skipLocationChange: true })

    // Naviga poi a /login pulito
    await this.router.navigate(['/login'], { replaceUrl: true })
  }
}
