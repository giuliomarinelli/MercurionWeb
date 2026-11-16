import { of, Subject, throwError } from 'rxjs'
import type { ChangePasswordDTO, MfaStrategy } from '../../../Models/account/account.models'
import {
  SensitiveBackupCodesUseCase,
  SensitiveEmailUseCase,
  SensitiveMfaUseCase,
  SensitivePasswordUseCase,
  SensitivePhoneUseCase,
} from './sensitive-data-change.use-cases'

describe('sensitive-data use cases', () => {
  const commands = () => ({
    getBackupCodes: jasmine.createSpy().and.returnValue(of(['backup-1'])),
    changePassword: jasmine.createSpy().and.returnValue(of({ confirmed: true })),
    changeEmailFirstStep: jasmine.createSpy().and.returnValue(of({ emailVerificationToken: 'email-token' })),
    changeEmailSecondStep: jasmine.createSpy().and.returnValue(of({ confirmed: true })),
    changePhoneFirstStep: jasmine.createSpy().and.returnValue(of({ phoneNumberVerificationToken: 'phone-token' })),
    changePhoneSecondStep: jasmine.createSpy().and.returnValue(of({ confirmed: true })),
    deletePhoneFirstStep: jasmine.createSpy().and.returnValue(of({ phoneNumberVerificationToken: 'delete-token' })),
    deletePhoneSecondStep: jasmine.createSpy().and.returnValue(of({ phoneMfaDisabled: false })),
    enableMfaFirstStep: jasmine.createSpy().and.returnValue(of({ secureToken: 'enable-token' })),
    enableMfaSecondStep: jasmine.createSpy().and.returnValue(of({ confirmed: true })),
    disableMfaFirstStep: jasmine.createSpy().and.returnValue(of({ secureToken: 'disable-token' })),
    disableMfaSecondStep: jasmine.createSpy().and.returnValue(of({ confirmed: true })),
    maskEmail: jasmine.createSpy().and.returnValue(of('m***@example.test')),
  })

  it('keeps email transport and masking fallback in the email use case', () => {
    const port = commands()
    const useCase = new SensitiveEmailUseCase(port)

    useCase.requestChange('new@example.test').subscribe()
    useCase.confirmChange('123456', 'email-token').subscribe()

    expect(port.changeEmailFirstStep).toHaveBeenCalledWith('new@example.test')
    expect(port.changeEmailSecondStep).toHaveBeenCalledWith('123456', 'email-token')
  })

  it('maps an email request failure with the server-provided masked address', () => {
    const port = commands()
    port.changeEmailFirstStep.and.returnValue(throwError(() => ({ status: 409 })))
    const useCase = new SensitiveEmailUseCase(port)
    let failure: any

    useCase.requestChange('taken@example.test').subscribe({ error: error => (failure = error) })

    expect(port.maskEmail).toHaveBeenCalledWith('taken@example.test')
    expect(failure.obscuredEmail).toBe('m***@example.test')
  })

  it('owns phone add/change and removal commands independently', () => {
    const port = commands()
    const useCase = new SensitivePhoneUseCase(port)

    useCase.requestChange('+39', '123456789').subscribe()
    useCase.confirmChange('123456', 'phone-token').subscribe()
    useCase.requestRemoval().subscribe()
    useCase.confirmRemoval('123456', 'delete-token').subscribe()

    expect(port.changePhoneFirstStep).toHaveBeenCalledWith('+39', '123456789')
    expect(port.changePhoneSecondStep).toHaveBeenCalledWith('123456', 'phone-token')
    expect(port.deletePhoneFirstStep).toHaveBeenCalled()
    expect(port.deletePhoneSecondStep).toHaveBeenCalledWith('123456', 'delete-token')
  })

  it('owns password success and server error propagation', () => {
    const port = commands()
    const dto: ChangePasswordDTO = { oldPassword: 'old', newPassword: 'New-password1!' }
    const useCase = new SensitivePasswordUseCase(port)

    useCase.change(dto).subscribe()
    expect(port.changePassword).toHaveBeenCalledWith(dto)

    const failure = new Error('rejected')
    port.changePassword.and.returnValue(throwError(() => failure))
    useCase.change(dto).subscribe({ error: error => expect(error).toBe(failure) })
  })

  it('owns MFA enable and disable command sequences', () => {
    const port = commands()
    const useCase = new SensitiveMfaUseCase(port)
    const strategy: MfaStrategy = 'APP_TOTP'

    useCase.enableFirstStep(strategy).subscribe()
    useCase.enableSecondStep(strategy, '123456', 'enable-token').subscribe()
    useCase.disableFirstStep(strategy).subscribe()
    useCase.disableSecondStep(strategy, '123456', 'disable-token').subscribe()

    expect(port.enableMfaFirstStep).toHaveBeenCalledWith(strategy)
    expect(port.enableMfaSecondStep).toHaveBeenCalledWith(strategy, '123456', 'enable-token')
    expect(port.disableMfaFirstStep).toHaveBeenCalledWith(strategy)
    expect(port.disableMfaSecondStep).toHaveBeenCalledWith(strategy, '123456', 'disable-token')
  })

  it('owns backup-code regeneration', () => {
    const port = commands()
    const useCase = new SensitiveBackupCodesUseCase(port)
    let result: string[] = []

    useCase.regenerate().subscribe(codes => (result = codes))

    expect(result).toEqual(['backup-1'])
    expect(port.getBackupCodes).toHaveBeenCalled()
  })

  it('cancels a pending command so a closed session cannot publish late state', () => {
    const port = commands()
    const pending = new Subject<{ confirmed: boolean }>()
    port.changePassword.and.returnValue(pending)
    const useCase = new SensitivePasswordUseCase(port)
    const next = jasmine.createSpy('next')

    useCase.change({ oldPassword: 'old', newPassword: 'new' }).subscribe({ next })
    useCase.cancel()
    pending.next({ confirmed: true })

    expect(next).not.toHaveBeenCalled()
  })
})
