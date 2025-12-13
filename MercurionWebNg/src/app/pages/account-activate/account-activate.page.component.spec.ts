import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { ActivatedRoute, convertToParamMap, Router } from '@angular/router';
import { of } from 'rxjs';

import { AccountActivatePageComponent } from './account-activate.page.component';
import { AccountService } from '../../services/account.service';
import { UserContextService } from '../../services/context/user-context.service';

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

class RouterStub {
  navigateByUrl(): Promise<boolean> {
    return Promise.resolve(true);
  }
}

describe('AccountActivatePageComponent', () => {
  let component: AccountActivatePageComponent;
  let fixture: ComponentFixture<AccountActivatePageComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RouterTestingModule, AccountActivatePageComponent],
      providers: [
        { provide: ActivatedRoute, useClass: ActivatedRouteStub },
        { provide: AccountService, useClass: AccountServiceStub },
        { provide: UserContextService, useClass: UserContextServiceStub },
        { provide: Router, useClass: RouterStub }
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
});
