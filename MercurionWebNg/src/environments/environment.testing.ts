export const environment = {
  CLOUDFLARE_SITE_KEY: '0x4AAAAAABdOWnfz_3r4JGDK',
  PUBLIC_EXACT_PATHS: [
    '/login',
    '/register',
    '/forgot',
    '/privacy',
    '/',
    '/forgot-password',
    '/account-recovery',
    '/404-not-found',
    '/403-forbidden',
    '/terms-and-policies',
    '/contacts'
  ],
  LOGGED_OUT_ONLY_PATHS: ['/login', '/register', '/forgot', '/', '/forgot-password', '/account-recovery', '/welcome'],
  PUBLIC_PREFIXES: ['/login/mfa', '/molecules/detail', '/password-recovery', '/oauth2/callback', '/account/activate', '/admin/maintenance'],
  wsUrl: '/',
  logoSrc: {
    PICTOGRAM_LIGHT: 'logo/pictogram-light-logo.svg',
    PICTOGRAM_DARK: 'logo/pictogram-dark-logo-2.svg'
  },
  production: true,
  testing: false,
  beta: true,
  feedbackEnv: 'staging',
  version: '1.0.0i'
}
