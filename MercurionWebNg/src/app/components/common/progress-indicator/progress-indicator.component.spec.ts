import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';

import { ProgressIndicatorComponent } from './progress-indicator.component';

describe('ProgressIndicatorComponent', () => {
  let fixture: ComponentFixture<ProgressIndicatorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProgressIndicatorComponent],
    }).compileComponents();
    fixture = TestBed.createComponent(ProgressIndicatorComponent);
    fixture.detectChanges();
  });

  it('provides an accessible busy status with the canonical sizes', () => {
    const status = fixture.debugElement.query(By.css('[role="status"]')).nativeElement as HTMLElement;
    expect(status.getAttribute('aria-label')).toBe('Loading…');
    expect(status.querySelector('svg')).not.toBeNull();
    expect(status.classList).toContain('m-progress-indicator--md');
  });

  it('supports legacy pixel-sized call sites while keeping one implementation', () => {
    fixture.componentRef.setInput('size', 24);
    fixture.detectChanges();
    const status = fixture.debugElement.query(By.css('[role="status"]')).nativeElement as HTMLElement;
    expect(status.style.width).toBe('24px');
    expect(status.style.height).toBe('24px');
  });
});
