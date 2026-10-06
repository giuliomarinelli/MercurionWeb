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
        { provide: AppShellFacade, useValue: { shouldSkipHomeAnimations: () => storage.get(descriptor) === 'true' } }
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

  it('shows letters, logo and links without animation or delay when the local flag is true', () => {
    fixture.destroy();
    storage.set(descriptor, 'true');
    fixture = TestBed.createComponent(HomePageComponent);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.letter-appears')).toBeNull();
    const elements = Array.from(fixture.nativeElement.querySelectorAll('h1 span, section > span, section > div')) as HTMLElement[];
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
      expect(fixture.nativeElement.querySelectorAll('.letter-appears').length).toBe(12);
    }
  });

  it('renders the title with staggered entrance animations', () => {
    const letters = Array.from(fixture.nativeElement.querySelectorAll('h1 span')) as HTMLElement[];
    expect(letters.map(letter => letter.textContent).join('')).toBe('Mercurion.');
    expect(letters.length).toBe(10);
    letters.forEach((letter, index) => {
      const style = getComputedStyle(letter);
      expect(style.animationName).not.toBe('none');
      expect(parseFloat(style.animationDelay)).toBeCloseTo(index * 0.75);
      expect(style.animationFillMode).toBe('both');
    });
  });

  it('keeps the logo hidden until its entrance delay ends', () => {
    const logo = fixture.nativeElement.querySelector('img') as HTMLImageElement;
    const container = logo.parentElement!;
    expect(getComputedStyle(container).animationDelay).toBe('7.5s');
    const animation = container.getAnimations()[0];
    expect(animation).toBeDefined();
    animation.pause();
    animation.currentTime = 7499;
    expect(getComputedStyle(container).opacity).toBe('0');
    animation.currentTime = 8150;
    expect(getComputedStyle(container).opacity).toBe('1');
  });

  it('applies translation and rotation to the letters and logo during entrance', () => {
    const letter = fixture.nativeElement.querySelector('h1 span') as HTMLElement;
    const logo = (fixture.nativeElement.querySelector('img') as HTMLImageElement).parentElement!;
    for (const element of [letter, logo]) {
      const animation = element.getAnimations()[0];
      animation.pause();
      const delay = parseFloat(getComputedStyle(element).animationDelay) * 1000;
      animation.currentTime = delay;
      const start = new DOMMatrix(getComputedStyle(element).transform);
      expect(start.m41).toBeCloseTo(-18);
      expect(start.m42).toBeCloseTo(-30);
      expect(start.m22).toBeCloseTo(Math.cos(40 * Math.PI / 180));
      animation.currentTime = delay + 325;
      const middle = new DOMMatrix(getComputedStyle(element).transform);
      expect(middle.m41).toBeGreaterThan(-18);
      expect(middle.m41).toBeLessThan(0);
      animation.currentTime = delay + 650;
      expect(new DOMMatrix(getComputedStyle(element).transform).isIdentity).toBeTrue();
    }
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
});
