import { Component, EventEmitter, OnInit, Output } from '@angular/core';
import { environment } from '../../../../environments/environment.development';

@Component({
  selector: 'app-turnstile',
  standalone: true, // così puoi usarlo anche in altri moduli
  template: `
    <div class="turnstile-widget"
      id="cf-turnstile"
      [attr.data-sitekey]="SITE_KEY"
      data-callback="onTurnstileSuccess">
    </div>
  `
})
export class TurnstileComponent implements OnInit {

  @Output() token = new EventEmitter<string>()

  protected SITE_KEY: string = environment.CLOUDFLARE_SITE_KEY;

  ngOnInit(): void {
    (window as any).onTurnstileSuccess = (token: string) => {
      this.token.emit(token);
    }
  }
}
