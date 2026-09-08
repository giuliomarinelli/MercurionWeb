import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { throwError } from 'rxjs';

import { PasswordRecoveryPageComponent } from './password-recovery.page.component';
import { AccountService } from '../../services/account.service';

describe('PasswordRecoveryComponent', () => {
  let component: PasswordRecoveryPageComponent;
  let fixture: ComponentFixture<PasswordRecoveryPageComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PasswordRecoveryPageComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PasswordRecoveryPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('clears the pending forgot-password redirect timer on destroy (no late navigation after teardown)', () => {
    const c = component as any;
    jasmine.clock().install();
    try {
      const navSpy = jasmine.createSpy('navigateByUrl');
      c.router = { navigateByUrl: navSpy };
      c.redirectTimeoutId = setTimeout(() => c.router.navigateByUrl('/forgot-password'), 3000);

      fixture.destroy();
      jasmine.clock().tick(3000);

      expect(navSpy).not.toHaveBeenCalled();
    } finally {
      jasmine.clock().uninstall();
    }
  });

  it('a second failed submit resets the redirect timer instead of stacking a duplicate navigation', () => {
    const accountService = TestBed.inject(AccountService);
    const router = TestBed.inject(Router);
    const navSpy = spyOn(router, 'navigateByUrl');
    spyOn(accountService, 'recoverPassword').and.returnValue(
      throwError(() => ({ error: {}, status: 500 }))
    );

    (component as any).changePasswordToken = () => 'fake-token';
    component.canView.set(true);
    component.form.patchValue({ password: 'password123' as any, confirmPassword: 'password123' as any });

    jasmine.clock().install();
    try {
      component.send();
      jasmine.clock().tick(2000);

      // second submit before the first redirect fires: must reset the timer, not add a second one
      component.send();
      jasmine.clock().tick(2000);
      expect(navSpy).not.toHaveBeenCalled();

      jasmine.clock().tick(1000);
      expect(navSpy).toHaveBeenCalledTimes(1);
    } finally {
      jasmine.clock().uninstall();
    }
  });
});