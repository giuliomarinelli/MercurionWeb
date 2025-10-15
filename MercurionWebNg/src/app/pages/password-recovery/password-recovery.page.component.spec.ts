import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PasswordRecoveryPageComponent } from './password-recovery.page.component';

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
});
