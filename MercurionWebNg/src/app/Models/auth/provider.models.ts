export type AuthProvider = 'Mercurion' | 'Google' | 'GitHub' | 'Apple' | 'Facebook'

export type SSO_AuthProvider = Omit<AuthProvider, 'Mercurion'>
