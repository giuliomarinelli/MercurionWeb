import { inject, Injectable } from '@angular/core'
import { CopyService } from './copy.service'
import { ToastService } from './toast.service'
import { CopyPayload, CopyUiOptions } from '../Models/copy.models'
import { ToastVariant } from '../Models/toast.models'

@Injectable({ providedIn: 'root' })
export class CopyUiService {

  private readonly copySvc = inject(CopyService)
  private readonly toast = inject(ToastService)

  async copy(value: CopyPayload, opts: CopyUiOptions = {}): Promise<boolean> {
    const ok = await this.copySvc.copy(value, {
      refuseEmpty: opts.refuseEmpty ?? true,
      stringify: opts.stringify
    })

    // 👇 di default niente toast
    const shouldToast = opts.showToast ?? false
    if (!shouldToast) {
      return ok
    }

    const duration = opts.durationMs ?? 1800

    if (ok) {
      this.safeToast(
        opts.successMessage ?? 'Copiato negli appunti ✅',
        opts.successContext ?? ('success' as ToastVariant),
        duration,
      )
      return true
    }

    this.safeToast(
      opts.errorMessage ?? 'Copia non riuscita 😤',
      opts.errorContext ?? ('error' as ToastVariant),
      duration,
    )
    return false
  }

  private safeToast(
    message: string,
    context: ToastVariant,
    duration: number
  ) {
    this.toast.trigger(message, context, duration)
  }
}
