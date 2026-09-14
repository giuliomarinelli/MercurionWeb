import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DialogShellComponent, DialogDismissalPolicy } from './dialog-shell.component';

@Component({
  standalone: true,
  imports: [DialogShellComponent],
  template: `
    <button #opener (click)="open = true">Open</button>
    <m-dialog-shell
      [mounted]="open"
      [open]="open"
      label="Test dialog"
      [dismissalPolicy]="policy"
      (dismissed)="open = false">
      <h2>Title</h2>
      <button>Confirm</button>
    </m-dialog-shell>
  `
})
class HostComponent {
  open = false;
  policy: DialogDismissalPolicy = { escape: true, backdrop: true };
}

describe('DialogShellComponent', () => {
  let fixture: ComponentFixture<HostComponent>;
  let host: HostComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [HostComponent] }).compileComponents();
    fixture = TestBed.createComponent(HostComponent);
    host = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('exposes a labelled modal and locks body scrolling while open', () => {
    host.open = true;
    fixture.detectChanges();

    const dialog = fixture.nativeElement.querySelector('[role="dialog"]') as HTMLElement;
    expect(dialog.getAttribute('aria-label')).toBe('Test dialog');
    expect(dialog.getAttribute('aria-modal')).toBe('true');
    expect(document.body.style.overflow).toBe('hidden');

    host.open = false;
    fixture.detectChanges();
    expect(document.body.style.overflow).toBe('');
  });

  it('dismisses through Escape and restores focus to the opener', () => {
    const opener = fixture.nativeElement.querySelector('button') as HTMLButtonElement;
    opener.focus();
    host.open = true;
    fixture.detectChanges();

    const dialog = fixture.nativeElement.querySelector('[role="dialog"]') as HTMLElement;
    dialog.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    fixture.detectChanges();

    expect(host.open).toBeFalse();
    expect(document.activeElement).toBe(opener);
  });

  it('does not dismiss when the explicit policy disables backdrop and Escape', () => {
    host.policy = { escape: false, backdrop: false };
    host.open = true;
    fixture.detectChanges();
    const dialog = fixture.nativeElement.querySelector('[role="dialog"]') as HTMLElement;

    dialog.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    dialog.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    fixture.detectChanges();

    expect(host.open).toBeTrue();
    host.open = false;
    fixture.detectChanges();
  });
});
