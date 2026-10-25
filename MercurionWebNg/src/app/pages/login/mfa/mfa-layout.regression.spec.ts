import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AuthSessionPersistenceService } from '../../../services/auth-session-persistence.service';
import { AuthRedirectService } from '../../../services/auth-redirect.service';
import { AuthErrorService } from '../../../services/auth-error.service';
import { AuthStateStore } from '../../../services/auth-state.store';
import { FingerprintService } from '../../../services/fingerprint.service';
import { SessionSyncService } from '../../../services/session-sync.service';
import { ToastService } from '../../../services/toast.service';
import { DesignService } from '../../../services/design.service';
import { MfaStrategyRegistry } from './mfa-flow.strategy';
import { MfaPageComponent } from './mfa.page.component';

describe('MFA responsive presentation', () => {
  for (const view of ['CHOOSE_METHOD', 'APP_TOTP', 'BACKUP_CODE'] as const) {
    for (const width of [320, 640]) {
      it(`keeps ${view} contained at ${width}px with an accessible error region`, async () => {
        await TestBed.configureTestingModule({
          imports: [MfaPageComponent],
          providers: [provideRouter([]), ...[AuthSessionPersistenceService, AuthRedirectService,
            AuthErrorService, AuthStateStore, FingerprintService, SessionSyncService,
            ToastService, DesignService, MfaStrategyRegistry].map(provide => ({ provide, useValue: {} }))],
        }).compileComponents();
        spyOn(MfaPageComponent.prototype, 'ngOnInit').and.resolveTo();
        const fixture = TestBed.createComponent(MfaPageComponent);
        const component = fixture.componentInstance;
        component['canView'].set(true);
        component['view'].set(view);
        component['enabledMfaStrategies'].set(['APP_TOTP', 'BACKUP_CODE']);
        component['state'].set({ kind: 'challenge-ready', strategy: 'APP_TOTP' });
        const frame = document.createElement('iframe');
        frame.style.cssText = `width:${width}px;height:320px;border:0;display:block`;
        document.body.appendChild(frame);
        try {
          fixture.detectChanges();
          const doc = frame.contentDocument!;
          const style = doc.createElement('style');
          style.textContent = Array.from(document.styleSheets)
            .flatMap(sheet => Array.from(sheet.cssRules).map(rule => rule.cssText)).join('\n');
          doc.head.appendChild(style);
          doc.body.style.cssText = 'margin:0;padding:16px;box-sizing:border-box';
          doc.body.appendChild(fixture.nativeElement);
          expect(doc.documentElement.scrollWidth).toBeLessThanOrEqual(doc.documentElement.clientWidth);
          for (const element of doc.querySelectorAll('button, input, a')) {
            const bounds = element.getBoundingClientRect();
            expect(bounds.left).toBeGreaterThanOrEqual(0);
            expect(bounds.right).toBeLessThanOrEqual(doc.documentElement.clientWidth + 1);
          }
          const input = doc.querySelector('input');
          if (input) {
            expect(input.autocomplete).toBe('one-time-code');
            expect(input.inputMode).toBe(view === 'BACKUP_CODE' ? 'text' : 'numeric');
            expect(doc.getElementById(input.getAttribute('aria-describedby')!)).not.toBeNull();
            component['serverError'].set('Il codice inserito non è corretto.');
            fixture.detectChanges();
            expect(input.getAttribute('aria-invalid')).toBe('true');
            expect(doc.getElementById('mfa-code-error')?.textContent).toContain('Il codice inserito non è corretto.');
          }
        } finally {
          fixture.destroy();
          frame.remove();
        }
      });
    }
  }
});
