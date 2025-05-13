import { Injectable, NgZone, signal } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class UserContextService {

  private _initials = signal<string>('');
  public readonly initials = this._initials.asReadonly();

  constructor(
    private readonly zone: NgZone
  ) {
    // 1. Carica le iniziali al primo avvio
    const savedInitials = sessionStorage.getItem('login')
    if (savedInitials) {
      this._initials.set(savedInitials)
    }

    // 2. Rimani in ascolto di modifiche da altre tab o finestre
    window?.addEventListener('storage', (event: StorageEvent) => {
      if (event.key === 'login') {
        this._initials.set(event.newValue ?? '')
      }
    });
  }

  login(userInitials: string) {
    /* SDK auth callback → spesso è fuori zona */
    this.zone.run(() => this._initials.set(userInitials));
  }

  logout() {
    this.zone.run(() => this._initials.set(''));
  }

  // 3. Metodo comodo per aggiornare il contesto e sincronizzare anche sessionStorage
  public setInitials(initials: string): void {
    this._initials.set(initials);
    sessionStorage?.setItem('login', initials)
  }

  // 4. Metodo per rimuovere login
  public clearInitials(): void {
    this.zone.run(() => {              // 👈 rientra nello zone
      sessionStorage.removeItem('login')
      this._initials.set('')
    })
  }
}
