import { bootstrapApplication } from '@angular/platform-browser'
import { appConfig } from './app/app.config'
import { AppComponent } from './app/app.component'

// Sync a CSS custom property with the current viewport height.
// Needed for iOS Safari, which reports 100vh including the URL bar unless a dynamic value is used.
function setAppViewportHeight() {
  if (typeof window === 'undefined' || typeof document === 'undefined') return

  const setVh = () => {
    const viewportHeight = (window.visualViewport?.height ?? window.innerHeight) * 0.01
    document.documentElement.style.setProperty('--app-vh', `${viewportHeight}px`)
  }

  const handleKeyboardToggle = () => {
    const vv = window.visualViewport
    const root = document.documentElement
    if (!vv || !root) return

    // Heuristic: keyboard open when the viewport height shrinks compared to innerHeight.
    const keyboardOpen = vv.height < window.innerHeight - 80
    root.classList.toggle('keyboard-open', keyboardOpen)
  }

  setVh()

  const onResize = () => {
    queueMicrotask(setVh)
    handleKeyboardToggle()
  }

  window.visualViewport?.addEventListener('resize', onResize, { passive: true })
  window.visualViewport?.addEventListener('scroll', onResize, { passive: true })
  window.addEventListener('resize', onResize, { passive: true })
  window.addEventListener('orientationchange', onResize, { passive: true })
}

setAppViewportHeight()

bootstrapApplication(AppComponent, appConfig).catch(err => console.error(err))
