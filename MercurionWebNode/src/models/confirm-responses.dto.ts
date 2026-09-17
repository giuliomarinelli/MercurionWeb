
import { LogLevel } from "@nestjs/common"
import type {
    Confirm_Login_FirstStepDTO,
    ConfirmChangeDTO,
    ConfirmDTO,
    ConfirmMfaChange,
    ConfirmWithAccessTokenAndInitialsDTO,
    ConfirmWithObsContDTO,
    ConfirmWithPhoneMfaFeedback,
    ConfirmWithRecoveryCodeDTO,
    ConfirmWithRecoveryTokenDTO,
    ConfirmWithTotpMetaDTO
} from '@mercurion/rest-contracts'

export type {
    Confirm_Login_FirstStepDTO,
    ConfirmChangeDTO,
    ConfirmDTO,
    ConfirmMfaChange,
    ConfirmWithObsContDTO,
    ConfirmWithPhoneMfaFeedback,
    ConfirmWithRecoveryCodeDTO,
    ConfirmWithRecoveryTokenDTO,
    ConfirmWithTotpMetaDTO
}

export type ConfirmWithTokenPairAndInitialsDTO = ConfirmWithAccessTokenAndInitialsDTO

export type ConfirmNewLogLevelsDTO = ConfirmDTO & {
    currentLogLevels: LogLevel[]
}
