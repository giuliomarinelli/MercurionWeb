export interface SocialButtonConfig {
  provider: string
  type: 'a' | 'button'
  href?: string
  action?: () => void
  icon?: SVGSVGElement
  label: string
}
