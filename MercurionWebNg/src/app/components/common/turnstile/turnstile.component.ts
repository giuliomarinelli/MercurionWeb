import { Component, EventEmitter, OnInit, Output, OnDestroy } from '@angular/core';
import { environment } from '../../../../environments/environment.development';

@Component({
  selector: 'app-turnstile',
  standalone: true,
  template: `
    <div [id]="containerId"></div>
  `
})
export class TurnstileComponent implements OnInit, OnDestroy {
  @Output() token = new EventEmitter<string>()

  private SITE_KEY = environment.CLOUDFLARE_SITE_KEY
  containerId = 'turnstile-container-' + Math.random().toString(36).substring(2)
  private widgetId: any = null

  ngOnInit(): void {
    this.loadTurnstileScript().then(() => {
      // Espone la callback globale, poi inizializza il widget
      (window as any).onTurnstileSuccess = (token: string) => {
        this.token.emit(token)
      };

      this.widgetId = (window as any).turnstile.render(`#${this.containerId}`, {
        sitekey: this.SITE_KEY,
        callback: (token: string) => (window as any).onTurnstileSuccess(token),
        // theme: 'auto', // opzionale
      })
    })
  }

  ngOnDestroy(): void {
    if (this.widgetId && (window as any).turnstile) {
      (window as any).turnstile.remove(this.widgetId)
      delete (window as any).onTurnstileSuccess
    }
  }

  private loadTurnstileScript(): Promise<void> {
    // Carica lo script solo se non già caricato
    return new Promise<void>((resolve) => {
      if ((window as any).turnstile) {
        resolve()
        return
      }
      const scriptId = 'cf-turnstile-script'
      if (document.getElementById(scriptId)) {
        document.getElementById(scriptId)!.addEventListener('load', () => resolve())
        return
      }
      const script = document.createElement('script')
      script.id = scriptId
      script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js';
      script.async = true
      script.defer = true
      script.onload = () => resolve()
      document.body.appendChild(script)
    });
  }
}
