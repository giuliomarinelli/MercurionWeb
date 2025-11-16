export type Theme = "light" | "dark"

export type ThemeOwner = "OS" | "User"

export type ThemeChoice = "light" | "dark" | "OS"

export interface ThemeStorage {

  theme: Theme | null
  themeOwner: ThemeOwner
  isEnabled: boolean

}
