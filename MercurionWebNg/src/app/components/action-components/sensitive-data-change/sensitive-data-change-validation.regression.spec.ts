import { signal } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { TestBed } from '@angular/core/testing';
import { SensitiveDataChangeWorkflowComponent } from './sensitive-data-change-workflow.component';

type InvalidSubmission = 'sendNewEmail' | 'confirmNewEmail' | 'deleteCurrentPhone_verifyTotp' | 'verifyNewPhone' | 'changePassword';
type WorkflowHarness = Record<InvalidSubmission, () => void> & {
  loading: ReturnType<typeof signal<boolean>>;
  emailCtrl: FormControl<string>;
  otpCtrl: FormControl<string>;
  passwordForm: FormGroup;
  secureToken: ReturnType<typeof signal<string>>;
};

describe('Sensitive data invalid keyboard submission', () => {
  it('reserves body height for the loading layer without covering header or footer', () => {
    TestBed.configureTestingModule({ imports: [SensitiveDataChangeWorkflowComponent] });
    const fixture = TestBed.createComponent(SensitiveDataChangeWorkflowComponent);
    spyOn(fixture.componentInstance, 'ngOnInit').and.stub();
    fixture.componentInstance.innerScope.set('ChangeEmail');
    fixture.componentInstance.loading.set(true);
    fixture.detectChanges();

    const body = fixture.nativeElement.querySelector('[action-card-body]') as HTMLElement;
    const loader = body.querySelector('m-progress-indicator')?.parentElement as HTMLElement;
    const bounds = body.getBoundingClientRect();
    const loaderBounds = loader.getBoundingClientRect();
    expect(bounds.height).toBeGreaterThanOrEqual(window.innerHeight * 0.4 - 1);
    expect(loaderBounds.top).toBeCloseTo(bounds.top, 0);
    expect(loaderBounds.bottom).toBeCloseTo(bounds.bottom, 0);
    fixture.destroy();
  });

  for (const action of ['sendNewEmail', 'confirmNewEmail', 'deleteCurrentPhone_verifyTotp', 'verifyNewPhone', 'changePassword'] as const) {
    it(`keeps the form usable after ${action} with invalid input`, () => {
      const workflow = Object.create(SensitiveDataChangeWorkflowComponent.prototype) as WorkflowHarness;
      workflow.loading = signal(false);
      workflow.emailCtrl = new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.email] });
      workflow.otpCtrl = new FormControl('', { nonNullable: true, validators: [Validators.required] });
      workflow.passwordForm = new FormGroup({ password: new FormControl('', Validators.required) });
      workflow.secureToken = signal('');

      workflow[action]();

      expect(workflow.loading()).toBeFalse();
      expect(action === 'sendNewEmail' ? workflow.emailCtrl.touched : action === 'changePassword' ? workflow.passwordForm.touched : workflow.otpCtrl.touched).toBeTrue();
    });
  }
});
