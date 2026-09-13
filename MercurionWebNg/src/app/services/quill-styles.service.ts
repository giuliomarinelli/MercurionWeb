import { DOCUMENT } from '@angular/common'
import { Injectable, inject } from '@angular/core'

@Injectable({ providedIn: 'root' })
export class QuillStylesService {
  private readonly document = inject(DOCUMENT)
  private loaded = false

  load(): void {
    if (this.loaded || !this.document) return
    this.loaded = true
    for (const file of ['quill.core.css', 'quill.bubble.css', 'quill.snow.css']) {
      if (this.document.head.querySelector(`link[data-mercurion-quill="${file}"]`)) continue
      const link = this.document.createElement('link')
      link.rel = 'stylesheet'
      link.href = `/quill/${file}`
      link.dataset['mercurionQuill'] = file
      this.document.head.appendChild(link)
    }
  }
}
