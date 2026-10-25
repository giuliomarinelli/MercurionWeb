import { Component, output } from '@angular/core';

// Deterministic geometry without loading a real challenge in unit tests.
@Component({
  selector: 'm-turnstile',
  template: '<div style="width:300px;height:78px" role="group" aria-label="Verifica di sicurezza">Verifica di sicurezza</div>',
})
export class LoginTurnstileStub {
  readonly token = output<string>();
  readonly widgetReady = output<void>();
  readonly refresh = output<void>();
}
