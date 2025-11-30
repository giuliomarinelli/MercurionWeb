export type AuthProvider = 'Mercurion' | 'Google' | 'GitHub' | 'LinkedIn' | 'Discord'

export type SSO_AuthProvider = Omit<AuthProvider, 'Mercurion'>
