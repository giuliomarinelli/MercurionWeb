import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ButtonPendingContentComponent } from './button-pending-content.component';

@Component({
  imports: [ButtonPendingContentComponent],
  template: `<button><m-button-pending-content [pending]="pending()">Verifica</m-button-pending-content></button>`,
})
class HostComponent {
  readonly pending = signal(false);
}

describe('ButtonPendingContentComponent', () => {
  it('preserves button dimensions during pending and restores the label', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    const button: HTMLButtonElement = fixture.nativeElement.querySelector('button');
    const original = button.getBoundingClientRect();
    expect(button.querySelector('m-progress-indicator')).toBeNull();
    fixture.componentInstance.pending.set(true);
    fixture.detectChanges();
    expect(button.getBoundingClientRect().width).toBe(original.width);
    expect(button.getBoundingClientRect().height).toBe(original.height);
    expect(button.querySelector('m-progress-indicator')).not.toBeNull();
    fixture.componentInstance.pending.set(false);
    fixture.detectChanges();
    expect(button.querySelector('m-progress-indicator')).toBeNull();
    expect(button.textContent).toContain('Verifica');
  });
});
