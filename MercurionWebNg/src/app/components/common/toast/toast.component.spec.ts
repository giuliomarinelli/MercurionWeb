import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ToastContext } from '../../../Models/toast.models';
import { ToastService } from '../../../services/toast.service';
import { ToastComponent } from './toast.component';

describe('ToastComponent', () => {
  let component: ToastComponent;
  let fixture: ComponentFixture<ToastComponent>;
  let toast: ToastService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ToastComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ToastComponent);
    component = fixture.componentInstance;
    toast = TestBed.inject(ToastService);
    jasmine.clock().install();
    fixture.detectChanges();
  });

  afterEach(() => {
    toast.ngOnDestroy();
    jasmine.clock().uninstall();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  const contextClasses: Record<ToastContext, string> = {
    error: 'bg-[#7f1d1d]',
    success: 'bg-[#065f46]',
    warn: 'bg-[#78350f]'
  };

  (Object.keys(contextClasses) as ToastContext[]).forEach((context) => {
    it(`renders the ${context} notification with its accessible alert semantics`, () => {
      fixture.componentRef.setInput('context', context);
      toast.trigger(`${context} message`, context, 1000);
      jasmine.clock().tick(30);
      fixture.detectChanges();

      const alert = fixture.nativeElement.querySelector('[role="alert"]') as HTMLElement;
      const closeButton = fixture.nativeElement.querySelector('button') as HTMLButtonElement;

      expect(alert).not.toBeNull();
      expect(alert.textContent).toContain(`${context} message`);
      expect(alert.classList).toContain(contextClasses[context]);
      expect(alert.getAttribute('aria-live')).toBe('assertive');
      expect(closeButton.getAttribute('aria-label')).toBe('Chiudi notifica');
    });
  });

  it('dismisses from the close button after the exit transition', () => {
    toast.trigger('manual close', 'success', 5000);
    jasmine.clock().tick(30);
    fixture.detectChanges();

    const closeButton = fixture.nativeElement.querySelector('button') as HTMLButtonElement;
    closeButton.click();
    fixture.detectChanges();

    expect(toast.state().phase).toBe('leaving');
    expect(fixture.nativeElement.querySelector('[role="alert"]')).not.toBeNull();

    jasmine.clock().tick(300);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[role="alert"]')).toBeNull();
  });
});
