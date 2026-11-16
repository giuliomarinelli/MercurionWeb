export interface GitHubTokenResponse {
    access_token: string
    token_type: 'bearer'
    scope: string
}

export interface GitHubUserResponse {
    id: number
    name: string | null
    login: string
    avatar_url: string
}

export interface GitHubEmailResponse {
    email: string
    primary: boolean
    verified: boolean
    visibility: 'public' | 'private' | null
}
