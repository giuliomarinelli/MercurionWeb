import { BackupCodeDTO } from "src/app_modules/auth/models/dto/backup-code.cls.dto";
import { TotpBodyDTO } from "src/app_modules/auth/models/dto/totp.cls.dto";
import { VerifyBodyDTO } from "src/app_modules/auth/models/dto/verify-body.cls.dto.";
import { StorageAction } from "src/app_modules/dropbox-object-store/models/enums/storage-action.type";
import { ChEMBLMoleculeItemEntity } from "src/app_modules/molecule-collection/models/entities/chembl-molecule-item.entity";
import { CustomMoleculeItemEntity } from "src/app_modules/molecule-collection/models/entities/custom-molecule-item.entity";
import { MoleculeCollectionItemEntity } from "src/app_modules/molecule-collection/models/entities/molecule-collection-item.entity";
import { AuthProvider } from "src/app_modules/sso/models/enums/auth-provider.enum";
import { MfaStrategy } from "src/app_modules/user/models/enums/mfa-strategy.enum";

export class TypeGuards {

    static isChemblMolecule(item: MoleculeCollectionItemEntity): item is ChEMBLMoleculeItemEntity {
        return item.type === 'chembl'

    }

    static isCustomMolecule(item: MoleculeCollectionItemEntity): item is CustomMoleculeItemEntity {
        return item.type === 'custom'
    }

    static isEnumValue<T extends Record<string, string | number>>(
        enumObj: T,
        value: string | number
    ): value is T[keyof T] {
        const enumValues = Object.values(enumObj).filter(v => typeof v !== 'number' || typeof value === 'number')
        return enumValues.includes(value)
    }

    static isStorageAction(item: string | null | undefined): item is StorageAction {
        switch (item) {
            case 'ChangeProfileImage':
            case null:
            case undefined:
                return true
        }
        return false
    }

    static isThruthyString(item: unknown): item is string {
        return !!item && typeof item === 'string'
    }

    static isMfaStrategy(item: unknown): item is MfaStrategy {
        if (!item) {
            return false
        }
        if (Object.values(MfaStrategy).includes(item as MfaStrategy)) {
            return true
        }
        return false
    }

    static isTotpBodyDTO(item: TotpBodyDTO | BackupCodeDTO): item is TotpBodyDTO {
        return (
            item != null &&
            typeof item === 'object' &&
            'totp' in item &&
            !('code' in item)
        )
    }

    static isBackupCodeDTO(item: TotpBodyDTO | BackupCodeDTO): item is BackupCodeDTO {
        return (
            item != null &&
            typeof item === 'object' &&
            'code' in item &&
            !('totp' in item)
        )
    }

    static isVerifyBodyDTO(item: unknown): item is VerifyBodyDTO {
        return (
            item != null &&
            typeof item === 'object' &&
            'kind' in item &&
            ('payload' in item)
        )
    }

    static isAuthProvider(item: unknown): item is AuthProvider {
        if (!item) {
            return false
        }
        return Object.values(AuthProvider).map((p) => p as string).includes(item as string)
    }

    static is_SSO_AuthProvider(item: unknown): item is AuthProvider {
        if (!item) {
            return false
        }
        return Object.values(AuthProvider).filter((p) => p !== AuthProvider.Mercurion)
            .map((p) => p as string).includes(item as string)
    }


}
