import { Injectable } from '@angular/core'

@Injectable({ providedIn: 'root' })
export class ClientInstanceIdService {
  private readonly value =
    globalThis.crypto?.randomUUID?.() ??
    `ci_${Date.now().toString(36)}_${Math.random().toString(36).slice(2)}`

  get(): string {
    return this.value
  }
}
