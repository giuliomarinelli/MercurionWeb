import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ToastComponent } from './toast.component';
import { ToastService } from '../../../services/toast.service';

describe('ToastComponent', () => {
  let component: ToastComponent;
  let fixture: ComponentFixture<ToastComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ToastComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ToastComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('renders the neutral model variants with variant-specific styling', () => {
    const toastService = TestBed.inject(ToastService);

    toastService.trigger('success message', 'success', 0);
    toastService.trigger('warning message', 'warn', 0);
    toastService.trigger('error message', 'error', 0);
    fixture.detectChanges();

    const toasts = fixture.nativeElement.querySelectorAll('.toast');

    expect(toasts).toHaveSize(3);
    expect(toasts[0].classList).toContain('toast--error');
    expect(toasts[1].classList).toContain('toast--warn');
    expect(toasts[2].classList).toContain('toast--success');
  });
});
