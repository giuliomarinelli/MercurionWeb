import { inject, Injectable } from '@angular/core'
import { ToastContext } from '../components/common/toast/toast.component'
import { CopyService } from './copy.service'
import { ToastService } from './toast.service'
import { CopyPayload, CopyUiOptions } from '../Models/copy.models'

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
        opts.successContext ?? ('success' as ToastContext),
        duration,
        opts.forceToast ?? false
      )
      return true
    }

    this.safeToast(
      opts.errorMessage ?? 'Copia non riuscita 😤',
      opts.errorContext ?? ('error' as ToastContext),
      duration,
      opts.forceToast ?? false
    )
    return false
  }

  private safeToast(
    message: string,
    context: ToastContext,
    duration: number,
    force: boolean
  ) {
    if (force && this.toast.show()) {
      this.toast.close()
      setTimeout(() => this.toast.trigger(message, context, duration), 310)
      return
    }
    this.toast.trigger(message, context, duration)
  }
}
