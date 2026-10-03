import { Injectable } from '@angular/core'
import { AuthSessionPersistenceService } from './auth-session-persistence.service'

@Injectable({ providedIn: 'root' })
export class ClientInstanceIdService {
  constructor(private readonly persistence: AuthSessionPersistenceService) {}

  get(): string {
    return this.persistence.getTabId()
  }
}
