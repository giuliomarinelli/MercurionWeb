import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  OnInit,
  OnDestroy,
  Output,
  EffectRef,
  effect,
  NgZone,
} from '@angular/core';
import { environment } from '../../../../environments/environment.development';
import { Theme } from '../../../Models/theme.models';
import { ThemeManagerService } from '../../../services/context/theme-manager.service';

@Component({
  selector: 'm-turnstile',
  template: `
    <div [id]="containerId" role="group" aria-label="Verifica di sicurezza"></div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TurnstileComponent implements OnInit, OnDestroy {
  // ===== Outputs =====
  @Output() token = new EventEmitter<string>();
  @Output() widgetReady = new EventEmitter<void>();
  @Output() refresh = new EventEmitter<void>();

  // ===== Config =====
  private readonly SITE_KEY = environment.CLOUDFLARE_SITE_KEY;
  containerId = 'turnstile-container-' + Math.random().toString(36).substring(2);
  private widgetId: any = null;
  private destroyed = false;

  private themeEffectCleanup?: EffectRef;

  constructor(
    private readonly themeManager: ThemeManagerService,
    private readonly zone: NgZone,
  ) {
    // Quando cambia il tema, ricreiamo il widget con il nuovo theme
    this.themeEffectCleanup = effect(() => {
      const currentTheme = this.themeManager.theme();
      if (!this.widgetId) return;
      this.refreshTurnstile(currentTheme);
    });
  }

  // ================== Lifecycle ==================

  ngOnInit(): void {
    this.loadTurnstileScript().then(() => {
      (window as any).onTurnstileSuccess = (token: string) => {
        // **IMPORTANTE**: rientriamo in NgZone
        this.zone.run(() => {
          this.token.emit(token);
        });
      };

      this.widgetId = (window as any).turnstile.render(`#${this.containerId}`, {
        sitekey: this.SITE_KEY,
        callback: (token: string) => (window as any).onTurnstileSuccess(token),
        theme: this.themeManager.theme(),
      });

      this.waitForWidgetVisible();
    });
  }

  ngOnDestroy(): void {
    this.destroyed = true;

    if (this.widgetId && (window as any).turnstile) {
      (window as any).turnstile.remove(this.widgetId);
    }

    delete (window as any).onTurnstileSuccess;

    if (this.themeEffectCleanup) {
      this.themeEffectCleanup.destroy();
    }
  }

  // ================== Public API ==================

  public reset(): void {
    if ((window as any).turnstile && this.widgetId) {
      this.zone.run(() => this.refresh.emit());
      (window as any).turnstile.reset(this.widgetId);
      this.waitForWidgetVisible();
    }
  }

  // ================== Internals ==================

  private refreshTurnstile(theme: Theme): void {
    // Notifichiamo il parent (login/forgot) che stiamo ricaricando il widget
    this.zone.run(() => this.refresh.emit());

    if ((window as any).turnstile && this.widgetId) {
      (window as any).turnstile.remove(this.widgetId);
      this.widgetId = null;
    }

    this.loadTurnstileScript().then(() => {
      (window as any).onTurnstileSuccess = (token: string) => {
        this.zone.run(() => {
          this.token.emit(token);
        });
      };

      this.widgetId = (window as any).turnstile.render(`#${this.containerId}`, {
        sitekey: this.SITE_KEY,
        callback: (token: string) => (window as any).onTurnstileSuccess(token),
        theme,
      });

      this.waitForWidgetVisible();
    });
  }

  private loadTurnstileScript(): Promise<void> {
    return new Promise<void>((resolve) => {
      // Se c'è già un widget, lo rimuoviamo
      if ((window as any).turnstile && this.widgetId) {
        (window as any).turnstile.remove(this.widgetId);
        this.widgetId = null;
      }

      // Script già caricato → ok
      if ((window as any).turnstile) {
        resolve();
        return;
      }

      const scriptId = 'cf-turnstile-script';
      const existing = document.getElementById(scriptId);

      if (existing) {
        existing.addEventListener('load', () => resolve());
        return;
      }

      const script = document.createElement('script');
      script.id = scriptId;
      script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js';
      script.async = true;
      script.defer = true;
      script.onload = () => resolve();
      document.body.appendChild(script);
    });
  }

  private waitForWidgetVisible(maxWait = 2000, interval = 50): void {
    const start = Date.now();

    const poll = () => {
      if (this.destroyed) return;

      const container = document.getElementById(this.containerId);
      const wrapper = container?.firstElementChild as HTMLElement | null;

      const visible =
        wrapper &&
        wrapper.offsetWidth > 200 && // di solito ~300
        wrapper.offsetHeight > 30;   // di solito ~65

      if (visible) {
        this.zone.run(() => this.widgetReady.emit());
      } else if (Date.now() - start < maxWait) {
        setTimeout(poll, interval);
      } else {
        // fallback: dopo 2s consideriamo comunque "ready"
        this.zone.run(() => this.widgetReady.emit());
      }
    };

    poll();
  }
}
