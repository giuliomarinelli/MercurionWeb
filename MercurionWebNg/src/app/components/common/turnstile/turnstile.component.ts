import { Component, EventEmitter, OnInit, Output, OnDestroy, ElementRef, Input, signal, effect, EffectRef } from '@angular/core';
import { environment } from '../../../../environments/environment.development';
import { Theme } from '../../../Models/types/theme-types';
import { ThemeManagerService } from '../../../services/stores/theme-manager.service';

@Component({
  selector: 'app-turnstile',
  standalone: true,
  template: `
    <div [id]="containerId"></div>
  `
})
export class TurnstileComponent implements OnInit, OnDestroy {

  @Output()
  token = new EventEmitter<string>();

  @Output()
  widgetReady = new EventEmitter<void>()

  @Output()
  refresh = new EventEmitter<void>()

  private themeEffectCleanup?: EffectRef
  constructor(private readonly themeManager: ThemeManagerService) {
    this.themeEffectCleanup = effect(() => {
      const currentTheme = this.themeManager.theme(); // <-- qui LEGGI IL SIGNAL
      if (!this.widgetId) return;
      this.refreshTurnstile(currentTheme); // Passa il tema!
    })
  }

  private SITE_KEY = environment.CLOUDFLARE_SITE_KEY;
  containerId = 'turnstile-container-' + Math.random().toString(36).substring(2);
  private widgetId: any = null;
  private destroyed = false;

  ngOnInit(): void {
    this.loadTurnstileScript().then(() => {
      (window as any).onTurnstileSuccess = (token: string) => {
        this.token.emit(token);
      };
      this.widgetId = (window as any).turnstile.render(`#${this.containerId}`, {
        sitekey: this.SITE_KEY,
        callback: (token: string) => (window as any).onTurnstileSuccess(token),
        theme: this.themeManager.theme()
      });
      // Dopo il render, attendi la reale visibilità del widget
      this.waitForWidgetVisible();
    });
  }

  ngOnDestroy(): void {
    this.destroyed = true;
    if (this.widgetId && (window as any).turnstile) {
      (window as any).turnstile.remove(this.widgetId);
      delete (window as any).onTurnstileSuccess;
    }
    if (this.themeEffectCleanup) this.themeEffectCleanup.destroy()

  }

  private refreshTurnstile(theme: Theme) {

    this.refresh.emit();

    if ((window as any).turnstile && this.widgetId) {
      (window as any).turnstile.remove(this.widgetId);
      this.widgetId = null;
    }
    this.loadTurnstileScript().then(() => {
      (window as any).onTurnstileSuccess = (token: string) => this.token.emit(token);
      this.widgetId = (window as any).turnstile.render(`#${this.containerId}`, {
        sitekey: this.SITE_KEY,
        callback: (token: string) => (window as any).onTurnstileSuccess(token),
        theme
      });
      this.waitForWidgetVisible();
    });
  }



  private loadTurnstileScript(): Promise<void> {
    return new Promise<void>((resolve) => {
      if ((window as any).turnstile && this.widgetId) {
        (window as any).turnstile.remove(this.widgetId);
        this.widgetId = null;
      }
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

  public reset() {
    if ((window as any).turnstile && this.widgetId) {
      (window as any).turnstile.reset(this.widgetId);
    }
  }

  private waitForWidgetVisible(maxWait = 2000, interval = 50) {
    const start = Date.now();
    const poll = () => {
      if (this.destroyed) return; // Interrompi se distrutto
      const container = document.getElementById(this.containerId);
      const wrapper = container?.firstElementChild as HTMLElement | null;

      if (
        wrapper &&
        wrapper.offsetWidth > 200 &&    // tipicamente 300
        wrapper.offsetHeight > 30       // tipicamente 65
      ) {
        this.widgetReady.emit();
      } else if (Date.now() - start < maxWait) {
        setTimeout(poll, interval);
      } else {
        // fallback: emetti comunque dopo 2s
        this.widgetReady.emit();
      }
    };
    poll();
  }
}
