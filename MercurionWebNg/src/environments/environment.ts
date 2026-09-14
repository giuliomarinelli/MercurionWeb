import { createEnvironmentConfig } from './environment.config'

export const environment = createEnvironmentConfig({
  name: 'production',
  minLogLevel: 'warn',
  CLOUDFLARE_SITE_KEY: '0x4AAAAAABdOWnfz_3r4JGDK',
  DISABLE_TURNSTILE: false,
  logoSrc: {
    PICTOGRAM_LIGHT: 'logo/pictogram-light-logo.svg',
    PICTOGRAM_DARK: 'logo/pictogram-dark-logo-2.svg'
  }
})
