import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideRouter, Router, RouterLink } from '@angular/router';

import { ButtonComponent, ButtonSize, ButtonVariant } from './button.component';

@Component({
  standalone: true,
  imports: [ButtonComponent],
  template: `
    <form (submit)="$event.preventDefault(); submitted = true">
      <m-button
        [variant]="variant"
        [size]="size"
        [fullWidth]="fullWidth"
        [loading]="loading"
        [disabled]="disabled"
        [routerLink]="routerLink"
        [queryParams]="queryParams"
        [fragment]="fragment"
        [target]="target"
        type="submit"
        (pressed)="pressed = true"
      >
        Save
      </m-button>
      <m-button (pressed)="defaultPressed = true">Cancel</m-button>
    </form>
  `,
})
class HostComponent {
  variant: ButtonVariant = 'primary';
  size: ButtonSize = 'md';
  fullWidth = false;
  loading = false;
  disabled = false;
  pressed = false;
  submitted = false;
  defaultPressed = false;
  routerLink: RouterLink['routerLink'] = null;
  queryParams: RouterLink['queryParams'];
  fragment: RouterLink['fragment'];
  target: RouterLink['target'];
}

@Component({ standalone: true, template: '' })
class DestinationComponent {}

@Component({
  standalone: true,
  imports: [ButtonComponent, RouterLink],
  template: `<m-button routerLink="/destination/42" [disabled]="disabled">Go</m-button>`,
})
class RouterLinkHostComponent {
  disabled = false;
}

const luminance = (color: string): number => {
  const channels = color.match(/[\d.]+/g)?.slice(0, 3).map(value => Number(value) / 255) ?? [];
  return channels.reduce((sum, channel, index) => {
    const linear = channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
    return sum + linear * [0.2126, 0.7152, 0.0722][index];
  }, 0);
};

const contrastRatio = (foreground: string, background: string): number => {
  const values = [luminance(foreground), luminance(background)];
  return (Math.max(...values) + 0.05) / (Math.min(...values) + 0.05);
};

describe('ButtonComponent', () => {
  let fixture: ComponentFixture<HostComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HostComponent],
      providers: [provideRouter([{ path: 'destination/:id', component: DestinationComponent }])],
    }).compileComponents();
    fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
  });

  it('renders typed variant and size classes', () => {
    const button = fixture.debugElement.queryAll(By.css('button'))[0].nativeElement;
    expect(button.classList).toContain('m-button__control--primary');
    expect(button.classList).toContain('m-button__control--md');
    expect(button.type).toBe('submit');
  });

  it('fills the host with both a button and a link only when requested', () => {
    const host = fixture.componentInstance;
    const element = fixture.nativeElement.querySelector('m-button') as HTMLElement;
    element.style.width = '320px';
    expect(element.querySelector('button')!.getBoundingClientRect().width).toBeLessThan(320);

    host.fullWidth = true;
    fixture.detectChanges();
    expect(element.querySelector('button')!.getBoundingClientRect().width).toBeCloseTo(320, 0);

    host.routerLink = '/destination/42';
    fixture.detectChanges();
    expect(element.querySelector('a')!.getBoundingClientRect().width).toBeCloseTo(320, 0);
  });

  it('keeps the native control disabled and busy while loading', () => {
    const host = fixture.componentInstance;
    host.loading = true;
    fixture.detectChanges();
    const button = fixture.debugElement.queryAll(By.css('button'))[0].nativeElement;
    const width = button.getBoundingClientRect().width;
    expect(button.disabled).toBeTrue();
    expect(button.getAttribute('aria-busy')).toBe('true');
    expect(button.querySelector('.m-button__spinner')).not.toBeNull();
    expect(button.getBoundingClientRect().width).toBe(width);
  });

  it('does not emit a second command while loading or when disabled', () => {
    const host = fixture.componentInstance;
    const button = fixture.debugElement.queryAll(By.css('button'))[0].nativeElement as HTMLButtonElement;

    host.loading = true;
    fixture.detectChanges();
    button.click();
    expect(host.pressed).toBeFalse();

    host.loading = false;
    host.disabled = true;
    fixture.detectChanges();
    button.click();
    expect(host.pressed).toBeFalse();
  });

  it('does not submit when the default type is used', () => {
    const button = fixture.debugElement.queryAll(By.css('button'))[1].nativeElement;
    button.click();
    fixture.detectChanges();
    expect(fixture.componentInstance.defaultPressed).toBeTrue();
    expect(fixture.componentInstance.submitted).toBeFalse();
  });

  it('renders every typed variant and size', () => {
    const host = fixture.componentInstance;
    const button = fixture.debugElement.queryAll(By.css('button'))[0].nativeElement;
    const variants = ['primary', 'secondary', 'destructive', 'neutral', 'ghost', 'outline'] as const;
    const sizes = ['sm', 'md', 'lg'] as const;

    for (const variant of variants) {
      host.variant = variant;
      fixture.detectChanges();
      expect(button.classList).toContain(`m-button__control--${variant}`);
    }
    for (const size of sizes) {
      host.size = size;
      fixture.detectChanges();
      expect(button.classList).toContain(`m-button__control--${size}`);
    }
  });

  it('renders a real link with projected content and navigates without submitting', async () => {
    const host = fixture.componentInstance;
    host.routerLink = ['/destination', 42];
    host.queryParams = { source: 'home' };
    host.fragment = 'details';
    fixture.detectChanges();
    const link = fixture.debugElement.query(By.css('a')).nativeElement as HTMLAnchorElement;

    expect(link.getAttribute('href')).toBe('/destination/42?source=home#details');
    expect(link.textContent?.trim()).toBe('Save');
    expect(link.classList).toContain('m-button__control--primary');
    expect(link.hasAttribute('type')).toBeFalse();
    link.click();
    await fixture.whenStable();

    expect(TestBed.inject(Router).url).toBe('/destination/42?source=home#details');
    expect(host.pressed).toBeTrue();
    expect(host.submitted).toBeFalse();
  });

  it('prevents navigation and activation while a link is disabled or loading', () => {
    const host = fixture.componentInstance;
    host.routerLink = '/destination/42';
    const navigate = spyOn(TestBed.inject(Router), 'navigateByUrl');

    for (const state of ['disabled', 'loading'] as const) {
      host.disabled = state === 'disabled';
      host.loading = state === 'loading';
      fixture.detectChanges();
      const link = fixture.debugElement.query(By.css('a')).nativeElement as HTMLAnchorElement;
      expect(link.hasAttribute('href')).toBeFalse();
      expect(link.tabIndex).toBe(-1);
      expect(link.getAttribute('aria-disabled')).toBe('true');
      link.click();
      expect(navigate).not.toHaveBeenCalled();
      expect(host.pressed).toBeFalse();
    }

    host.loading = false;
    fixture.detectChanges();
    const link = fixture.debugElement.query(By.css('a')).nativeElement as HTMLAnchorElement;
    expect(link.getAttribute('href')).toBe('/destination/42');
    expect(link.hasAttribute('tabindex')).toBeFalse();
    expect(link.textContent?.trim()).toBe('Save');
  });

  it('preserves browser handling of modified clicks and target blank', () => {
    const host = fixture.componentInstance;
    host.routerLink = '/destination/42';
    fixture.detectChanges();
    const navigate = spyOn(TestBed.inject(Router), 'navigateByUrl');
    const link = fixture.debugElement.query(By.css('a'));

    link.triggerEventHandler('click', new MouseEvent('click', { ctrlKey: true }));
    expect(navigate).not.toHaveBeenCalled();

    host.target = '_blank';
    fixture.detectChanges();
    expect(link.nativeElement.getAttribute('target')).toBe('_blank');
    link.triggerEventHandler('click', new MouseEvent('click'));
    expect(navigate).not.toHaveBeenCalled();
  });

  it('switches back to a button when routerLink is removed', () => {
    const host = fixture.componentInstance;
    host.routerLink = '/destination/42';
    fixture.detectChanges();
    host.routerLink = null;
    fixture.detectChanges();

    expect(fixture.debugElement.query(By.css('a'))).toBeNull();
    const button = fixture.debugElement.query(By.css('button')).nativeElement as HTMLButtonElement;
    expect(button.type).toBe('submit');
    expect(button.textContent?.trim()).toBe('Save');
  });

  it('handles navigation only once when the consumer also imports RouterLink', () => {
    const linkFixture = TestBed.createComponent(RouterLinkHostComponent);
    linkFixture.detectChanges();
    const navigate = spyOn(TestBed.inject(Router), 'navigateByUrl').and.returnValue(Promise.resolve(true));
    const link = linkFixture.debugElement.query(By.css('a')).nativeElement as HTMLAnchorElement;
    const host = linkFixture.debugElement.query(By.css('m-button')).nativeElement as HTMLElement;
    expect(host.tabIndex).toBe(-1);

    link.click();
    expect(navigate).toHaveBeenCalledTimes(1);

    navigate.calls.reset();
    // Cancel the browser default to avoid opening a real tab in this test.
    link.addEventListener('click', event => event.preventDefault(), { once: true });
    link.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, ctrlKey: true }));
    expect(navigate).not.toHaveBeenCalled();

    linkFixture.componentInstance.disabled = true;
    linkFixture.detectChanges();
    link.click();
    expect(navigate).not.toHaveBeenCalled();
    linkFixture.destroy();
  });

  it('keeps filled button labels at enhanced text contrast in both themes', () => {
    const host = fixture.componentInstance;
    const button = fixture.debugElement.queryAll(By.css('button'))[0].nativeElement as HTMLButtonElement;

    for (const dark of [false, true]) {
      fixture.nativeElement.classList.toggle('dark', dark);
      for (const variant of ['primary', 'secondary', 'destructive'] as const) {
        host.variant = variant;
        fixture.detectChanges();
        const style = getComputedStyle(button);
        expect(contrastRatio(style.color, style.backgroundColor))
          .withContext(`${dark ? 'dark' : 'light'} ${variant}`)
          .toBeGreaterThanOrEqual(7);
      }
    }
  });
});
