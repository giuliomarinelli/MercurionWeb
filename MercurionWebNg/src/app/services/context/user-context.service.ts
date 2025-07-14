import { Injectable, NgZone, signal, computed } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class UserContextService {
  private _initials = signal<string>(localStorage.getItem('login') ?? '');
  public readonly initials = this._initials.asReadonly();

  public readonly isLoggedIn = computed(() => !!this._initials() && (this._initials().length === 1 || this._initials().length === 2));

  constructor(private readonly zone: NgZone) {
    // Aggiorna lo stato se cambia su altre tab
    window.addEventListener('storage', (event: StorageEvent) => {
      if (event.key === 'login') {
        this.zone.run(() => this._initials.set(event.newValue ?? ''));
      }
    });
  }

  /** Setta iniziali e login localmente e in storage */
  setInitials(initials: string) {
    this.zone.run(() => {
      this._initials.set(initials);
      localStorage.setItem('login', initials);
    });
  }

  /** Pulisce login (local & storage) */
  clearInitials() {
    this.zone.run(() => {
      this._initials.set('');
      localStorage.removeItem('login');
    });
  }

  /** Alias: login */
  login(initials: string) { this.setInitials(initials); }
  /** Alias: logout */
  logout() { this.clearInitials(); }
}
