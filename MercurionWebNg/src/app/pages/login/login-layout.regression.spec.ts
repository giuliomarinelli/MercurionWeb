import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { APP_CONFIG, createAppConfig } from '../../config/app-config';
import { environment } from '../../../environments/environment.development';
import { AuthFacade } from '../../services/auth.facade';
import { ThemeManagerService } from '../../services/context/theme-manager.service';
import { TurnstileComponent } from '../../components/common/turnstile/turnstile.component';
import { LoginPageComponent } from './login.page.component';
import { LoginCredentialFormComponent } from './login-credential-form.component';
import { LoginTurnstileStub } from './login-turnstile.testing';

describe('Login responsive form geometry', () => {
  let fixture: ComponentFixture<LoginPageComponent>;
  let frame: HTMLIFrameElement;

  afterEach(() => {
    fixture?.destroy();
    frame?.remove();
  });

  for (const viewport of [{ width: 320, height: 568 }, { width: 375, height: 320 },
    { width: 375, height: 812 }, { width: 639, height: 375 }, { width: 640, height: 375 },
    { width: 768, height: 1024 }, { width: 1440, height: 900 }]) {
    it(`contains email, password, errors and a real-sized security slot at ${viewport.width}×${viewport.height}`, async () => {
      const config = createAppConfig(environment);
      await TestBed.configureTestingModule({
        imports: [LoginPageComponent],
        providers: [
          provideRouter([]),
          { provide: APP_CONFIG, useValue: { ...config, capabilities: { ...config.capabilities, disableTurnstile: false } } },
          { provide: ThemeManagerService, useValue: { theme: signal('light') } },
          { provide: AuthFacade, useValue: { prepareLogin: () => of(undefined) } }
        ]
      }).overrideComponent(LoginCredentialFormComponent, {
        remove: { imports: [TurnstileComponent] }, add: { imports: [LoginTurnstileStub] }
      }).compileComponents();
      fixture = TestBed.createComponent(LoginPageComponent);
      fixture.detectChanges();
      frame = document.createElement('iframe');
      frame.style.cssText = `width:${viewport.width}px;height:${viewport.height}px;border:0;display:block`;
      document.body.appendChild(frame);
      const doc = frame.contentDocument!;
      const style = doc.createElement('style');
      style.textContent = Array.from(document.styleSheets)
        .flatMap(sheet => Array.from(sheet.cssRules).map(rule => rule.cssText)).join('\n');
      doc.head.appendChild(style);
      doc.body.style.cssText = 'margin:0;padding:16px;box-sizing:border-box';
      doc.body.appendChild(fixture.nativeElement);
      const checkBounds = () => {
        expect(doc.documentElement.scrollWidth).toBeLessThanOrEqual(doc.documentElement.clientWidth);
        for (const node of doc.querySelectorAll('input, button, a, h1')) {
          const bounds = node.getBoundingClientRect();
          expect(bounds.left).withContext(node.textContent ?? node.tagName).toBeGreaterThanOrEqual(0);
          expect(bounds.right).withContext(node.textContent ?? node.tagName).toBeLessThanOrEqual(doc.documentElement.clientWidth + 1);
        }
      };
      checkBounds();
      const form = fixture.componentInstance.credentialForm()!;
      form.form.controls.email.setValue('person@example.test');
      form.showPasswordStep();
      fixture.detectChanges();
      await fixture.whenStable();
      checkBounds();
      const password = doc.querySelector('#login-password')!;
      const before = password.getBoundingClientRect();
      form.showCredentialError('Non è stato possibile completare l’accesso. Riprova.');
      fixture.detectChanges();
      expect(password.getBoundingClientRect().top).toBeCloseTo(before.top, 1);
      checkBounds();
      expect(doc.querySelector('.credential-security-slot')!.getBoundingClientRect().width).toBe(300);
      const security = doc.querySelector('.credential-security') as HTMLElement;
      expect(getComputedStyle(security).overflowX).toBe('visible');
      expect(getComputedStyle(security).overflowY).toBe('visible');
      expect(security.clientHeight).toBeGreaterThanOrEqual(security.scrollHeight);
    });
  }
});
