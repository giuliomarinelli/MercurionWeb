import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { UserContextService } from '../../services/context/user-context.service';
import { AppShellFacade } from '../../services/app-shell.facade';
import { BrowserStorageRegistry, storageDescriptor } from '../../services/browser-storage-registry';

import { HomePageComponent } from './home.page.component';

describe('HomePageComponent', () => {
  let component: HomePageComponent;
  let fixture: ComponentFixture<HomePageComponent>;
  const isLoggedIn = signal(false);
  const isRestoringSession = signal(false);
  const descriptor = storageDescriptor<string>('mercurion.v1.is-first-visit');
  const storage = new BrowserStorageRegistry();

  beforeEach(async () => {
    isLoggedIn.set(false);
    isRestoringSession.set(false);
    storage.remove(descriptor);
    await TestBed.configureTestingModule({
      imports: [HomePageComponent],
      providers: [
        { provide: UserContextService, useValue: { isLoggedIn, isRestoringSession } },
        { provide: AppShellFacade, useValue: {
          shouldSkipHomeAnimations: () => storage.get(descriptor) === 'true',
          markHomePresented: () => storage.set(descriptor, 'true')
        } }
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(HomePageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  afterEach(() => storage.remove(descriptor));

  it('shows the final composition without animation or delay when the local flag is true', () => {
    fixture.destroy();
    storage.set(descriptor, 'true');
    fixture = TestBed.createComponent(HomePageComponent);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.home--intro')).toBeNull();
    const elements = Array.from(fixture.nativeElement.querySelectorAll('h1 span, .home__logo, .home__orbit')) as HTMLElement[];
    expect(elements.length).toBe(12);
    for (const element of elements) {
      expect(getComputedStyle(element).animationName).toBe('none');
      expect(element.style.animationDelay).toBe('');
      expect(getComputedStyle(element).opacity).toBe('1');
    }
  });

  it('keeps entrance animations when the local flag is not exactly true', () => {
    for (const value of ['false', 'TRUE', '']) {
      fixture.destroy();
      storage.set(descriptor, value);
      fixture = TestBed.createComponent(HomePageComponent);
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('.home--intro')).not.toBeNull();
    }
  });

  it('completes the title entrance within one second', () => {
    const letters = Array.from(fixture.nativeElement.querySelectorAll('h1 span')) as HTMLElement[];
    expect(letters.map(letter => letter.textContent).join('')).toBe('Mercurion.');
    expect(letters.length).toBe(10);
    letters.forEach(letter => {
      const style = getComputedStyle(letter);
      expect(style.animationName).not.toBe('none');
      expect(parseFloat(style.animationDelay) + parseFloat(style.animationDuration)).toBeLessThanOrEqual(1);
      expect(style.animationFillMode).toBe('both');
    });
  });

  it('keeps all actions visible and outside the animated elements from the first frame', () => {
    const actions = fixture.nativeElement.querySelector('.home__actions') as HTMLElement;
    expect(getComputedStyle(actions).opacity).toBe('1');
    expect(actions.getAnimations({ subtree: true }).length).toBe(0);
    const links = Array.from(actions.querySelectorAll('a'));
    expect(links.map(link => link.getAttribute('href'))).toEqual(['/welcome', '/login', '/register']);
    links[0].focus();
    expect(document.activeElement).toBe(links[0]);
  });

  it('marks the anonymous home as presented and skips the introduction on recreation', () => {
    expect(storage.get(descriptor)).toBe('true');
    fixture.destroy();
    fixture = TestBed.createComponent(HomePageComponent);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.home--intro')).toBeNull();
  });

  it('does not consume the introduction while the session is restoring', () => {
    fixture.destroy();
    storage.remove(descriptor);
    isRestoringSession.set(true);
    fixture = TestBed.createComponent(HomePageComponent);
    fixture.detectChanges();
    expect(storage.get(descriptor)).toBeNull();
    isRestoringSession.set(false);
    fixture.detectChanges();
    expect(storage.get(descriptor)).toBe('true');
    expect(fixture.nativeElement.querySelector('.home--intro')).not.toBeNull();
  });

  it('shows the progress indicator for logged-in users', () => {
    isLoggedIn.set(true);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('m-progress-indicator')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('section')).toBeNull();
  });

  it('shows a centered spinner throughout session restoration and authentication', () => {
    isRestoringSession.set(true);
    fixture.detectChanges();
    const spinner = fixture.nativeElement.querySelector('m-progress-indicator') as HTMLElement;
    expect(spinner).not.toBeNull();
    expect(fixture.nativeElement.querySelector('section')).toBeNull();
    const main = fixture.nativeElement.querySelector('main') as HTMLElement;
    expect(getComputedStyle(main).justifyContent).toBe('center');
    expect(getComputedStyle(main).alignItems).toBe('center');

    isLoggedIn.set(true);
    isRestoringSession.set(false);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('m-progress-indicator')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('section')).toBeNull();
  });

  it('shows the public home when restoration resolves to an anonymous session', () => {
    isRestoringSession.set(true);
    fixture.detectChanges();
    isRestoringSession.set(false);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('m-progress-indicator')).toBeNull();
    expect(fixture.nativeElement.querySelector('section')).not.toBeNull();
  });

  for (const viewport of [{ width: 320, height: 568 }, { width: 375, height: 812 },
    { width: 639, height: 320 }, { width: 640, height: 375 }, { width: 1440, height: 900 }]) {
    it(`contains the home and all actions at ${viewport.width}×${viewport.height} without animation shifts`, async () => {
      const frame = document.createElement('iframe');
      frame.style.cssText = `width:${viewport.width}px;height:${viewport.height}px;border:0;display:block`;
      document.body.appendChild(frame);
      try {
        const doc = frame.contentDocument!;
        const style = doc.createElement('style');
        style.textContent = Array.from(document.styleSheets)
          .flatMap(sheet => Array.from(sheet.cssRules).map(rule => rule.cssText)).join('\n');
        doc.head.appendChild(style);
        doc.body.style.margin = '0';
        doc.body.appendChild(fixture.nativeElement);
        const main = doc.querySelector('main')!;
        const links = Array.from(main.querySelectorAll('a'));
        const bounds = links.map(link => link.getBoundingClientRect());
        for (const animation of main.getAnimations({ subtree: true })) animation.finish();
        await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
        expect(doc.documentElement.scrollWidth).toBeLessThanOrEqual(doc.documentElement.clientWidth);
        links.forEach((link, index) => {
          const rect = link.getBoundingClientRect();
          expect(rect.left).toBeGreaterThanOrEqual(0);
          expect(rect.right).toBeLessThanOrEqual(doc.documentElement.clientWidth + 1);
          expect(rect.height).toBeGreaterThanOrEqual(44);
          expect(rect.top).toBeCloseTo(bounds[index].top, 0);
          expect(rect.width).toBeCloseTo(bounds[index].width, 0);
        });
      } finally {
        frame.remove();
      }
    });
  }
});
