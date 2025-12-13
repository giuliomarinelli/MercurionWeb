import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { convertToParamMap } from '@angular/router';
import { of } from 'rxjs';

import { SsoPageComponent } from './sso.page.component';
import { ActivatedRoute } from '@angular/router';
import { TypeGuardsService } from '../../services/type-guards.service';
import { FingerprintService } from '../../services/fingerprint.service';
import { AuthService } from '../../services/auth.service';
import { SessionSyncService } from '../../services/session-sync.service';

class ActivatedRouteStub {
  queryParamMap = of(convertToParamMap({ t: 'a.b.c', provider: 'provider' }));
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
  sso_authorizeFlow() {
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
        { provide: AuthService, useClass: AuthServiceStub },
        { provide: SessionSyncService, useClass: SessionSyncServiceStub }
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SsoPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
