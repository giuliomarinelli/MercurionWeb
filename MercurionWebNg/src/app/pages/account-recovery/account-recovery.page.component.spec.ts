import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AccountRecoveryPageComponent } from './account-recovery.page.component';

describe('AccountRecoveryPageComponent', () => {
  let component: AccountRecoveryPageComponent;
  let fixture: ComponentFixture<AccountRecoveryPageComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AccountRecoveryPageComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AccountRecoveryPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('stops reacting to form changes after destruction', () => {
    component.serverErrorStep.set({
      step: 1,
      error: { fieldErrors: {}, globalError: 'Il codice è errato.' }
    });

    fixture.destroy();
    component.codeCtrl.setValue('replacement-code');

    expect(component.serverErrorStep()).toEqual({
      step: 1,
      error: { fieldErrors: {}, globalError: 'Il codice è errato.' }
    });
  });
});
