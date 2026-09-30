import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { convertToParamMap, Router } from '@angular/router';
import { of } from 'rxjs';

import { SsoPageComponent } from './sso.page.component';
import { ActivatedRoute } from '@angular/router';
import { TypeGuardsService } from '../../services/type-guards.service';
import { FingerprintService } from '../../services/fingerprint.service';
import { AuthTransportService } from '../../services/auth-transport.service';
import { SessionSyncService } from '../../services/session-sync.service';
import { AuthStateStore } from '../../services/auth-state.store';

class ActivatedRouteStub {
  queryParamMap = of(convertToParamMap({ provider: 'ORCID' }));
  fragment = of('t=a.b.c');
}

class TypeGuardsStub {
  is_SSO_AuthProvider(): boolean {
    return true;
  }
}

class FingerprintServiceStub {
  getSanitizedFingerprint(): Promise<any> {
    return Promise.resolve({ fingerprintDataEnc: 'fp', sessionDeviceInfo: {} });
  }
}

class AuthServiceStub {
  ssoAuthorizeFlow() {
    return of({ accessToken: 'token', ws_accessToken: 'ws', initials: 'U' });
  }
  setAccessToken(): void { /* no-op */ }
  setWs_accessToken(): void { /* no-op */ }
}

class SessionSyncServiceStub {
  resumeSession(): void { /* no-op */ }
}

describe('SsoPageComponent', () => {
  let component: SsoPageComponent;
  let fixture: ComponentFixture<SsoPageComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RouterTestingModule, SsoPageComponent],
      providers: [
        { provide: ActivatedRoute, useClass: ActivatedRouteStub },
        { provide: TypeGuardsService, useClass: TypeGuardsStub },
        { provide: FingerprintService, useClass: FingerprintServiceStub },
        { provide: AuthTransportService, useClass: AuthServiceStub },
        { provide: SessionSyncService, useClass: SessionSyncServiceStub }
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SsoPageComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  it('completes SSO with one client navigation and no page reload', async () => {
    const state = TestBed.inject(AuthStateStore);
    spyOn(state, 'beginAuthentication');
    spyOn(state, 'activateAuthenticatedSession');
    const resume = spyOn(TestBed.inject(SessionSyncService), 'resumeSession');
    const navigate = spyOn(TestBed.inject(Router), 'navigateByUrl').and.resolveTo(true);

    fixture.detectChanges();
    await fixture.whenStable();

    expect(state.activateAuthenticatedSession).toHaveBeenCalledTimes(1);
    expect(resume).toHaveBeenCalledOnceWith('U');
    expect(navigate).toHaveBeenCalledOnceWith('/dashboard', { replaceUrl: true });
  });
});
