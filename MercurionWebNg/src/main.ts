import { bootstrapApplication } from '@angular/platform-browser'
import { appConfig } from './app/app.config'
import { AppComponent } from './app/app.component'

// Sync a CSS custom property with the current viewport height.
// Needed for iOS Safari, which reports 100vh including the URL bar unless a dynamic value is used.
function setAppViewportHeight() {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;

  // Solo iOS Safari (se un domani ti servirà davvero)
  const ua = navigator.userAgent;
  const isIOS = /iPad|iPhone|iPod/.test(ua) || (ua.includes('Mac') && 'ontouchend' in document);
  const isSafari = /Safari/.test(ua) && !/Chrome|CriOS|FxiOS|EdgiOS/.test(ua);

  // Standard browsers: NON fare nulla -> --app-vh resta 1vh => 100vh stabile
  if (!(isIOS && isSafari)) return;

  const root = document.documentElement;

  const setVh = () => {
    // su iOS Safari puoi usare vv.height per URL bar, ma NON gestiamo Android qui
    const h = (window.visualViewport?.height ?? window.innerHeight);
    root.style.setProperty('--app-vh', `${h * 0.01}px`);
  };

  setVh();

  // Se proprio vuoi, aggiorna SOLO su orientation change (non keyboard)
  window.addEventListener('orientationchange', () => queueMicrotask(setVh), { passive: true });
}


setAppViewportHeight()

bootstrapApplication(AppComponent, appConfig).catch(err => console.error(err))
