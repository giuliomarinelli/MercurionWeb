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

  it('renders the classic arc with configurable stroke and a visible label', () => {
    fixture.componentRef.setInput('size', 45);
    fixture.componentRef.setInput('stroke', 4);
    fixture.componentRef.setInput('color', '#123456');
    fixture.componentRef.setInput('label', '  Caricamento  ');
    fixture.detectChanges();

    const status = fixture.debugElement.query(By.css('[role="status"]')).nativeElement as HTMLElement;
    const svg = status.querySelector('svg')!;
    const arc = status.querySelector('.m-progress-indicator__arc') as SVGCircleElement;
    expect(svg.getAttribute('width')).toBe('45');
    expect(svg.getAttribute('height')).toBe('45');
    expect(arc.getAttribute('stroke-width')).toBe('4');
    expect(arc.style.stroke).toBe('rgb(18, 52, 86)');
    expect(status.querySelector('.m-progress-indicator__label')?.textContent).toBe('Caricamento');
    expect(status.getAttribute('aria-label')).toBe('Caricamento');
    expect(status.classList).toContain('m-progress-indicator--labeled');
  });

  it('keeps the accessible label override and overlay mode', () => {
    fixture.componentRef.setInput('size', 'sm');
    fixture.componentRef.setInput('overlay', true);
    fixture.componentRef.setInput('ariaLabel', 'Operazione in corso');
    fixture.detectChanges();

    const status = fixture.debugElement.query(By.css('[role="status"]')).nativeElement as HTMLElement;
    expect(status.classList).toContain('m-progress-indicator--overlay');
    expect(status.querySelector('svg')?.getAttribute('width')).toBe('16');
    expect(status.getAttribute('aria-label')).toBe('Operazione in corso');
    expect(status.querySelector('.m-progress-indicator__label')).toBeNull();
  });
});
