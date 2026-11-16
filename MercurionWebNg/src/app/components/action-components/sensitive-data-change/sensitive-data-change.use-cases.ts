import { Inject, Injectable, inject } from '@angular/core'
import type { ChangePasswordDTO, MfaStrategy } from '../../../Models/account/account.models'
import type {
  ConfirmChangeDTO,
  ConfirmDTO,
  ConfirmMfaChange,
  ConfirmWithPhoneMfaFeedback,
} from '@mercurion/rest-contracts'
import { SensitiveDataChangeFacade } from './sensitive-data-change-facade.service'
import { Observable, Subject, catchError, mergeMap, takeUntil, throwError } from 'rxjs'

export type SensitiveDataCommands = Pick<
  SensitiveDataChangeFacade,
  | 'getBackupCodes'
  | 'changePassword'
  | 'changeEmailFirstStep'
  | 'changeEmailSecondStep'
  | 'changePhoneFirstStep'
  | 'changePhoneSecondStep'
  | 'deletePhoneFirstStep'
  | 'deletePhoneSecondStep'
  | 'enableMfaFirstStep'
  | 'enableMfaSecondStep'
  | 'disableMfaFirstStep'
  | 'disableMfaSecondStep'
  | 'maskEmail'
>

/**
 * The use-case services are the application boundary for this action.
 * Components own rendering and validation; these classes own the command
 * sequence and its session cancellation semantics.
 */
abstract class SensitiveDataUseCase {
  private cancelled$ = new Subject<void>()

  protected constructor(protected readonly commands: SensitiveDataCommands) {}

  protected active<T>(source: Observable<T>): Observable<T> {
    return source.pipe(takeUntil(this.cancelled$))
  }

  cancel(): void {
    this.cancelled$.next()
    this.cancelled$.complete()
    this.cancelled$ = new Subject<void>()
  }
}

export type EmailChangeFailure = Error & {
  status?: number
  obscuredEmail?: string
}

@Injectable()
export class SensitiveEmailUseCase extends SensitiveDataUseCase {
  constructor(
    @Inject(SensitiveDataChangeFacade)
    commands: SensitiveDataCommands = inject(SensitiveDataChangeFacade)
  ) {
    super(commands)
  }

  requestChange(email: string): Observable<ConfirmChangeDTO & { obscuredEmail?: string }> {
    return this.active(
      this.commands.changeEmailFirstStep(email).pipe(
        catchError(error =>
          this.commands.maskEmail(email).pipe(
            mergeMap(obscuredEmail =>
              throwError(() => ({ ...error, obscuredEmail } as EmailChangeFailure))
            )
          )
        )
      )
    )
  }

  confirmChange(otp: string, secureToken: string): Observable<ConfirmDTO> {
    return this.active(this.commands.changeEmailSecondStep(otp, secureToken))
  }
}

@Injectable()
export class SensitivePhoneUseCase extends SensitiveDataUseCase {
  constructor(
    @Inject(SensitiveDataChangeFacade)
    commands: SensitiveDataCommands = inject(SensitiveDataChangeFacade)
  ) {
    super(commands)
  }

  requestChange(prefix: string, phone: string): Observable<ConfirmChangeDTO> {
    return this.active(this.commands.changePhoneFirstStep(prefix, phone))
  }

  confirmChange(otp: string, secureToken: string): Observable<ConfirmDTO> {
    return this.active(this.commands.changePhoneSecondStep(otp, secureToken))
  }

  requestRemoval(): Observable<ConfirmChangeDTO> {
    return this.active(this.commands.deletePhoneFirstStep())
  }

  confirmRemoval(
    otp: string,
    secureToken: string
  ): Observable<ConfirmWithPhoneMfaFeedback> {
    return this.active(this.commands.deletePhoneSecondStep(otp, secureToken))
  }
}

@Injectable()
export class SensitivePasswordUseCase extends SensitiveDataUseCase {
  constructor(
    @Inject(SensitiveDataChangeFacade)
    commands: SensitiveDataCommands = inject(SensitiveDataChangeFacade)
  ) {
    super(commands)
  }

  change(dto: ChangePasswordDTO): Observable<ConfirmDTO> {
    return this.active(this.commands.changePassword(dto))
  }
}

@Injectable()
export class SensitiveMfaUseCase extends SensitiveDataUseCase {
  constructor(
    @Inject(SensitiveDataChangeFacade)
    commands: SensitiveDataCommands = inject(SensitiveDataChangeFacade)
  ) {
    super(commands)
  }

  enableFirstStep(strategy: MfaStrategy): Observable<ConfirmMfaChange> {
    return this.active(this.commands.enableMfaFirstStep(strategy))
  }

  enableSecondStep(
    strategy: MfaStrategy,
    otp: string,
    secureToken: string
  ): Observable<ConfirmDTO> {
    return this.active(this.commands.enableMfaSecondStep(strategy, otp, secureToken))
  }

  disableFirstStep(strategy: MfaStrategy): Observable<ConfirmMfaChange> {
    return this.active(this.commands.disableMfaFirstStep(strategy))
  }

  disableSecondStep(
    strategy: MfaStrategy,
    otp: string,
    secureToken: string
  ): Observable<ConfirmDTO> {
    return this.active(this.commands.disableMfaSecondStep(strategy, otp, secureToken))
  }
}

@Injectable()
export class SensitiveBackupCodesUseCase extends SensitiveDataUseCase {
  constructor(
    @Inject(SensitiveDataChangeFacade)
    commands: SensitiveDataCommands = inject(SensitiveDataChangeFacade)
  ) {
    super(commands)
  }

  regenerate(): Observable<string[]> {
    return this.active(this.commands.getBackupCodes())
  }
}

export interface SensitiveDataUseCaseSet {
  readonly email: SensitiveEmailUseCase
  readonly phone: SensitivePhoneUseCase
  readonly password: SensitivePasswordUseCase
  readonly mfa: SensitiveMfaUseCase
  readonly backupCodes: SensitiveBackupCodesUseCase
}

/** Cancels every pending command when the action session closes. */
export function cancelSensitiveDataUseCases(useCases: SensitiveDataUseCaseSet): void {
  useCases.email.cancel()
  useCases.phone.cancel()
  useCases.password.cancel()
  useCases.mfa.cancel()
  useCases.backupCodes.cancel()
}
