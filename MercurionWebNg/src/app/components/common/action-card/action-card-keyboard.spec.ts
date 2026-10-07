import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActionCardComponent } from './action-card.component';
import { ActionFooterComponent } from '../action-footer/action-footer.component';
import { DialogShellComponent } from '../dialog-shell/dialog-shell.component';

@Component({
  imports: [ActionCardComponent, ActionFooterComponent, DialogShellComponent],
  template: `
    <m-dialog-shell [mounted]="true" [open]="true" panelVariant="action" backdropVariant="action" label="Keyboard test">
      <div class="flex justify-center items-start md:items-center px-2 m-overlay-screen">
        <m-action-card closeLabel="Close" labelledBy="keyboard-title">
          <h2 action-card-title id="keyboard-title">Action form</h2>
          <div action-card-body>
            @for (id of fields; track id) {
              <label class="block p-4">Field {{ id }}<input [id]="'field-' + id" class="block w-full p-4" /></label>
            }
          </div>
          <m-action-footer action-card-footer>
            <button action-footer-secondary>Cancel</button>
            <button action-footer-primary>Confirm</button>
          </m-action-footer>
        </m-action-card>
      </div>
    </m-dialog-shell>
  `,
})
class KeyboardHostComponent {
  readonly fields = Array.from({ length: 12 }, (_, index) => index);
}

const nextFrame = () => new Promise<void>(resolve => requestAnimationFrame(() => resolve()));

describe('Action card with a reduced visual viewport', () => {
  let fixture: ComponentFixture<KeyboardHostComponent>;
  let originalVisual: PropertyDescriptor | undefined;
  let visual: EventTarget & { width: number; height: number; offsetTop: number; offsetLeft: number; scale: number };
  let previousStyles: string;

  beforeEach(() => {
    originalVisual = Object.getOwnPropertyDescriptor(window, 'visualViewport');
    previousStyles = document.documentElement.style.cssText;
    visual = Object.assign(new EventTarget(), { width: 390, height: 600, offsetTop: 0, offsetLeft: 0, scale: 1 });
    Object.defineProperty(window, 'visualViewport', { configurable: true, value: visual });
    const matchMedia = window.matchMedia.bind(window);
    spyOn(window, 'matchMedia').and.callFake(query => {
      const media = matchMedia(query);
      if (query === '(prefers-reduced-motion: reduce)') Object.defineProperty(media, 'matches', { value: true });
      return media;
    });
    TestBed.configureTestingModule({ imports: [KeyboardHostComponent] });
    fixture = TestBed.createComponent(KeyboardHostComponent);
    fixture.detectChanges();
  });

  afterEach(() => {
    fixture.destroy();
    TestBed.resetTestingModule();
    if (originalVisual) Object.defineProperty(window, 'visualViewport', originalVisual);
    else Reflect.deleteProperty(window, 'visualViewport');
    document.documentElement.style.cssText = previousStyles;
  });

  async function resizeVisual(height: number, offsetTop: number) {
    visual.height = height;
    visual.offsetTop = offsetTop;
    visual.dispatchEvent(new Event('resize'));
    visual.dispatchEvent(new Event('scroll'));
    await Promise.resolve();
    fixture.detectChanges();
    await nextFrame();
    await nextFrame();
  }

  it('fits above the keyboard while the layout viewport stays unchanged and restores on close', async () => {
    const layoutHeight = window.innerHeight;
    await resizeVisual(300, 70);
    const dialog = fixture.nativeElement.querySelector('[role="dialog"]') as HTMLElement;
    const card = fixture.nativeElement.querySelector('.m-action-card') as HTMLElement;
    const footer = fixture.nativeElement.querySelector('.m-action-footer') as HTMLElement;
    expect(window.innerHeight).toBe(layoutHeight);
    expect(dialog.getBoundingClientRect().top).toBeCloseTo(70, 0);
    expect(dialog.getBoundingClientRect().height).toBeCloseTo(300, 0);
    expect(card.getBoundingClientRect().bottom).toBeLessThanOrEqual(370);
    expect(card.scrollHeight).toBeGreaterThan(card.clientHeight);
    card.scrollTop = card.scrollHeight;
    expect(footer.getBoundingClientRect().bottom).toBeLessThanOrEqual(370);

    await resizeVisual(600, 0);
    expect(dialog.getBoundingClientRect().top).toBeCloseTo(0, 0);
    expect(dialog.getBoundingClientRect().height).toBeCloseTo(600, 0);
  });

  it('scrolls the focused field into the card below its sticky header after keyboard resize', async () => {
    await Promise.resolve();
    const input = fixture.nativeElement.querySelector('#field-11') as HTMLInputElement;
    input.focus();
    await resizeVisual(300, 50);
    const card = fixture.nativeElement.querySelector('.m-action-card') as HTMLElement;
    const header = fixture.nativeElement.querySelector('.m-action-card__header') as HTMLElement;
    expect(document.activeElement).toBe(input);
    expect(input.getBoundingClientRect().top).toBeGreaterThanOrEqual(header.getBoundingClientRect().bottom - 1);
    const footer = fixture.nativeElement.querySelector('m-action-footer') as HTMLElement;
    expect(input.getBoundingClientRect().bottom).toBeLessThanOrEqual(footer.getBoundingClientRect().top - 3);
    expect(input.getBoundingClientRect().bottom).toBeLessThanOrEqual(card.getBoundingClientRect().bottom + 1);
  });

  it('allows the whole card to scroll when its header and footer cannot fit together', async () => {
    await resizeVisual(150, 0);
    const card = fixture.nativeElement.querySelector('.m-action-card') as HTMLElement;
    const footer = fixture.nativeElement.querySelector('.m-action-footer') as HTMLElement;
    expect(card.scrollHeight).toBeGreaterThan(card.clientHeight);
    card.scrollTop = card.scrollHeight;
    expect(footer.getBoundingClientRect().bottom).toBeLessThanOrEqual(card.getBoundingClientRect().bottom + 1);
  });
});
