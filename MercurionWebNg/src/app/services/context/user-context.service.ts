import { Injectable, NgZone, signal, computed, effect } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class UserContextService {

  private _initials = signal<string>('');
  public readonly initials = this._initials.asReadonly();

  // Evento custom "login state changed"
  public readonly isLoggedIn = computed(() => !!this._initials() && (this._initials().length === 1 || this._initials().length === 2));
  public readonly onLoginStateChange = this.isLoggedIn

  constructor(private readonly zone: NgZone) {
    // Carica le iniziali al primo avvio
    const savedInitials = localStorage?.getItem('login')
    if (savedInitials) {
      this._initials.set(savedInitials)
    }

    // Rimani in ascolto di modifiche da altre tab o finestre
    window.addEventListener('storage', (event: StorageEvent) => {
      if (event.key === 'login') {
        this.zone.run(() => this._initials.set(event.newValue ?? ''))
      }
    })

  }

  login(userInitials: string) {
    this.zone.run(() => {
      this._initials.set(userInitials)
      localStorage?.setItem('login', userInitials)
    });
  }

  logout() {
    this.zone.run(() => {
      localStorage?.removeItem('login')
      this._initials.set('')
    });
  }

  public setInitials(initials: string): void {
    this.zone.run(() => {
      this._initials.set(initials)
      localStorage?.setItem('login', initials)
    });
  }

  public clearInitials(): void {
    this.zone.run(() => {
      localStorage?.removeItem('login')
      this._initials.set('')
    });
  }
}
