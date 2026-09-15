import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { DisclosureComponent, DisclosureTriggerDirective } from './disclosure.component';

@Component({
  standalone: true,
  imports: [DisclosureComponent, DisclosureTriggerDirective],
  template: `
    <m-disclosure
      label="More details"
      id="details"
      [expanded]="expanded"
      (toggled)="expanded = $event"
    >Content</m-disclosure>
    <m-disclosure id="custom" [expanded]="true">
      <ng-template mDisclosureTrigger><strong>Custom trigger</strong></ng-template>
      Dynamic content
    </m-disclosure>
  `,
})
class HostComponent {
  expanded = false;
}

describe('DisclosureComponent', () => {
  let fixture: ComponentFixture<HostComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [HostComponent] }).compileComponents();
    fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
  });

  it('exposes a native button and deterministic relationships', () => {
    const button = fixture.debugElement.query(By.css('button')).nativeElement;
    expect(button.getAttribute('aria-expanded')).toBe('false');
    expect(button.getAttribute('aria-controls')).toBe('details-panel');
    expect(button.id).toBe('details-trigger');
  });

  it('toggles the controlled region', () => {
    fixture.debugElement.query(By.css('button')).nativeElement.click();
    fixture.detectChanges();
    const button = fixture.debugElement.query(By.css('button')).nativeElement;
    expect(button.getAttribute('aria-expanded')).toBe('true');
    expect(fixture.debugElement.query(By.css('[role="region"]'))).not.toBeNull();
  });

  it('supports a projected trigger while retaining canonical button semantics', () => {
    const disclosures = fixture.debugElement.queryAll(By.css('m-disclosure'));
    const button = disclosures[1].query(By.css('button')).nativeElement as HTMLButtonElement;
    const panel = disclosures[1].query(By.css('[role="region"]')).nativeElement as HTMLElement;

    expect(button.textContent).toContain('Custom trigger');
    expect(button.getAttribute('aria-controls')).toBe('custom-panel');
    expect(panel.getAttribute('aria-labelledby')).toBe('custom-trigger');
    expect(panel.textContent).toContain('Dynamic content');
  });
});
