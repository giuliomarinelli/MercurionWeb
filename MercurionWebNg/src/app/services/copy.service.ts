// src/app/core/services/copy.service.ts
import { Injectable, inject } from '@angular/core'
import { Clipboard } from '@angular/cdk/clipboard'
import { CopyOptions, CopyPayload } from '../Models/copy.models'


@Injectable({ providedIn: 'root' })
export class CopyService {
  private readonly clipboard = inject(Clipboard)

  async copy(value: CopyPayload, opts: CopyOptions = {}): Promise<boolean> {
    const stringify =
      opts.stringify ??
      ((v: CopyPayload) => {
        if (v === null || v === undefined) return ''
        if (typeof v === 'object') return JSON.stringify(v, null, 2)
        return String(v)
      })

    const text = stringify(value)
    const normalized = text?.toString() ?? ''

    if (opts.refuseEmpty && normalized.trim().length === 0) {
      opts.onError?.(new Error('EMPTY_COPY_BLOCKED'))
      return false
    }

    try {
      const ok = this.clipboard.copy(normalized)
      if (!ok) {
        throw new Error('CLIPBOARD_COPY_FAILED')
      }
      opts.onSuccess?.(normalized)
      return true
    } catch (err) {
      opts.onError?.(err)
      return false
    }
  }
}
