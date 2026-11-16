import { inject, InjectionToken, DOCUMENT } from '@angular/core'


export const BASE_PATH = new InjectionToken<string>('BASE_PATH', {
  providedIn: 'root',
  factory: () => {
    // 1️⃣ se in bootstrap è fornito APP_BASE_HREF lo usa
    // 2️⃣ altrimenti legge il <base href="…"> inserito da Angular
    const doc = inject(DOCUMENT)
    return doc.querySelector('base')?.getAttribute('href') ?? '/'
  }
})
