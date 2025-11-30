export type AuthProvider = 'Mercurion' | 'Google' | 'Microsoft' | 'Apple' | 'Facebook'

export type SSO_AuthProvider = Omit<AuthProvider, 'Mercurion'>
