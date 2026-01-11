import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { AppComponent } from './app/app.component';

// Sync a CSS custom property with the current viewport height.
// Needed for iOS Safari, which reports 100vh including the URL bar unless a dynamic value is used.
function setAppViewportHeight() {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;

  const setVh = () => {
    const viewportHeight = (window.visualViewport?.height ?? window.innerHeight) * 0.01;
    document.documentElement.style.setProperty('--app-vh', `${viewportHeight}px`);
  };

  setVh();

  const onResize = () => queueMicrotask(setVh);

  window.visualViewport?.addEventListener('resize', onResize, { passive: true });
  window.addEventListener('resize', onResize, { passive: true });
  window.addEventListener('orientationchange', onResize, { passive: true });
}

setAppViewportHeight();

bootstrapApplication(AppComponent, appConfig)
  .catch((err) => console.error(err));
