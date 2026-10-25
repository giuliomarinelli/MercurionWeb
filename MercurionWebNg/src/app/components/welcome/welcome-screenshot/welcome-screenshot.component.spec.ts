import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BASE_PATH } from '../../../pipes/base-path.token';
import { ThemeManagerService } from '../../../services/context/theme-manager.service';
import { WelcomeScreenshotComponent } from './welcome-screenshot.component';

describe('WelcomeScreenshotComponent', () => {
  let fixture: ComponentFixture<WelcomeScreenshotComponent>;
  const theme = signal<'light' | 'dark'>('light');

  beforeEach(async () => {
    theme.set('light');
    await TestBed.configureTestingModule({
      imports: [WelcomeScreenshotComponent],
      providers: [
        { provide: ThemeManagerService, useValue: { theme } },
        { provide: BASE_PATH, useValue: '/m/' }
      ]
    }).compileComponents();
    fixture = TestBed.createComponent(WelcomeScreenshotComponent);
    fixture.componentRef.setInput('lightSrc', '/welcome/editor-live-light.png');
    fixture.componentRef.setInput('darkSrc', '/welcome/editor-live-dark.png');
    fixture.componentRef.setInput('alt', 'Editor in modalità Analisi live.');
    fixture.componentRef.setInput('width', 1302);
    fixture.componentRef.setInput('height', 795);
    fixture.detectChanges();
  });

  it('renders only the active theme image and keeps the full-size link synchronized under a base path', () => {
    const image = fixture.nativeElement.querySelector('img') as HTMLImageElement;
    const link = fixture.nativeElement.querySelector('a') as HTMLAnchorElement;
    expect(fixture.nativeElement.querySelectorAll('img').length).toBe(1);
    expect(image.getAttribute('src')).toBe('/m/welcome/editor-live-light.png');
    expect(link.getAttribute('href')).toBe(image.getAttribute('src'));
    theme.set('dark');
    fixture.detectChanges();
    expect(image.getAttribute('src')).toBe('/m/welcome/editor-live-dark.png');
    expect(link.getAttribute('href')).toBe(image.getAttribute('src'));
    expect(link.target).toBe('_blank');
    expect(link.rel).toContain('noopener');
    expect(link.getAttribute('aria-label')).toContain('nuova scheda');
  });

  it('reserves the image ratio before loading and retains it across a theme change', () => {
    const image = fixture.nativeElement.querySelector('img') as HTMLImageElement;
    expect(image.width).toBeGreaterThan(0);
    expect(image.getAttribute('width')).toBe('1302');
    expect(image.getAttribute('height')).toBe('795');
    const ratio = image.getBoundingClientRect().height / image.getBoundingClientRect().width;
    expect(ratio).toBeCloseTo(795 / 1302, 2);
    theme.set('dark');
    fixture.detectChanges();
    expect(image.getBoundingClientRect().height / image.getBoundingClientRect().width).toBeCloseTo(ratio, 2);
    expect(image.loading).toBe('lazy');
    fixture.componentRef.setInput('loading', 'eager');
    fixture.detectChanges();
    expect(image.loading).toBe('eager');
    expect(image.getAttribute('fetchpriority')).toBe('high');
  });
});
