import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { MfaPageComponent } from './mfa.page.component';
import { AuthSessionPersistenceService } from '../../../services/auth-session-persistence.service';
import { AuthRedirectService } from '../../../services/auth-redirect.service';
import { AuthErrorService } from '../../../services/auth-error.service';
import { AuthStateStore } from '../../../services/auth-state.store';
import { FingerprintService } from '../../../services/fingerprint.service';
import { SessionSyncService } from '../../../services/session-sync.service';
import { ToastService } from '../../../services/toast.service';
import { DesignService } from '../../../services/design.service';
import { MfaStrategyRegistry } from './mfa-flow.strategy';

describe('MFA pending button', () => {
  it('does not spin during initialization and keeps geometry during submission', () => {
    TestBed.configureTestingModule({
      imports: [MfaPageComponent],
      providers: [provideRouter([]), ...[AuthSessionPersistenceService, AuthRedirectService,
        AuthErrorService, AuthStateStore, FingerprintService, SessionSyncService, ToastService,
        DesignService, MfaStrategyRegistry].map(provide => ({ provide, useValue: {} }))],
    });
    spyOn(MfaPageComponent.prototype, 'ngOnInit').and.resolveTo();
    const fixture = TestBed.createComponent(MfaPageComponent);
    const component = fixture.componentInstance;
    component['canView'].set(true);
    component['view'].set('APP_TOTP');
    fixture.detectChanges();
    const button: HTMLButtonElement = fixture.nativeElement.querySelector('button[type="submit"]');
    expect(button.querySelector('m-progress-indicator')).toBeNull();
    expect(button.disabled).toBeTrue();
    component['codeControl'].setValue('123456');
    component['state'].set({ kind: 'challenge-ready', strategy: 'APP_TOTP' });
    fixture.detectChanges();
    expect(button.disabled).toBeFalse();
    const original = button.getBoundingClientRect();
    component['state'].set({ kind: 'submitting', strategy: 'APP_TOTP' });
    fixture.detectChanges();
    expect(button.querySelector('m-progress-indicator')).not.toBeNull();
    expect(button.disabled).toBeTrue();
    expect(button.getBoundingClientRect().height).toBe(original.height);
    expect(button.getBoundingClientRect().width).toBe(original.width);
    component['state'].set({ kind: 'recoverable-error', strategy: 'APP_TOTP', message: 'Riprova' });
    fixture.detectChanges();
    expect(button.querySelector('m-progress-indicator')).toBeNull();
    expect(button.disabled).toBeFalse();
  });
});
