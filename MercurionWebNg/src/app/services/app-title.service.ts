import { inject, Injectable } from '@angular/core'
import { Title } from '@angular/platform-browser'

@Injectable({ providedIn: 'root' })
export class AppTitleService {

  private readonly brand = 'Mercurion'

  private readonly title = inject(Title)

  set(pageTitle?: string) {
    this.title.setTitle(pageTitle ? `${this.brand} — ${pageTitle}` : this.brand)
  }

  setSection(section: string, label?: string) {
    const t = label ? `${section} · ${label}` : section
    this.set(t)
  }

}
