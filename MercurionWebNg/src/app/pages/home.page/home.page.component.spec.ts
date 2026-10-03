import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { UserContextService } from '../../services/context/user-context.service';

import { HomePageComponent } from './home.page.component';

describe('HomePageComponent', () => {
  let component: HomePageComponent;
  let fixture: ComponentFixture<HomePageComponent>;
  const isLoggedIn = signal(false);

  beforeEach(async () => {
    isLoggedIn.set(false);
    await TestBed.configureTestingModule({
      imports: [HomePageComponent],
      providers: [{ provide: UserContextService, useValue: { isLoggedIn } }]
    })
    .compileComponents();

    fixture = TestBed.createComponent(HomePageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
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
});
