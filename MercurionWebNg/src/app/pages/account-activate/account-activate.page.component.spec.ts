import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { of } from 'rxjs';

import { AccountActivatePageComponent } from './account-activate.page.component';
import { AccountService } from '../../services/account.service';
import { UserContextService } from '../../services/context/user-context.service';
import { CopyUiService } from '../../services/copy-ui.service';

class ActivatedRouteStub {
  queryParamMap = of(convertToParamMap({ t: 'a.b.c' }));
}

class AccountServiceStub {
  activateAccount() {
    return of({ recoveryCode: 'CODE' });
  }
}

class UserContextServiceStub {
  logout(): void { /* no-op */ }
}

describe('AccountActivatePageComponent', () => {
  let component: AccountActivatePageComponent;
  let fixture: ComponentFixture<AccountActivatePageComponent>;
  let copyUiService: jasmine.SpyObj<CopyUiService>;

  beforeEach(async () => {
    copyUiService = jasmine.createSpyObj<CopyUiService>('CopyUiService', ['copy']);
    copyUiService.copy.and.resolveTo(true);

    await TestBed.configureTestingModule({
      imports: [RouterTestingModule, AccountActivatePageComponent],
      providers: [
        { provide: ActivatedRoute, useClass: ActivatedRouteStub },
        { provide: AccountService, useClass: AccountServiceStub },
        { provide: UserContextService, useClass: UserContextServiceStub },
        { provide: CopyUiService, useValue: copyUiService },
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AccountActivatePageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('copies the recovery code through the shared button', () => {
    component.recoveryCode.set('CODE');
    component.loading.set(false);
    component.canView.set(true);
    fixture.detectChanges();

    const button = fixture.nativeElement.querySelector('button[aria-label="Copia il codice di recupero"]') as HTMLButtonElement;
    expect(button).not.toBeNull();
    button.click();

    expect(copyUiService.copy).toHaveBeenCalledOnceWith('CODE', jasmine.objectContaining({ showToast: true }));
  });
});
