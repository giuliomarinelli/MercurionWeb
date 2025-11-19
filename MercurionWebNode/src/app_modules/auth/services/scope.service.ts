import { Injectable } from '@nestjs/common';
import { Scope } from 'src/app_modules/user/Models/enums/scope.enum';
import { SercurityService } from './sercurity.service';
import { GeneralUtils } from 'src/utils/general-utils/general-utils';

@Injectable()
export class ScopeService {

    private readonly scopeValues: string[] = Object.values(Scope).map(s => s.toString())

    private standardScopes: Scope[] = [
        Scope.UseInference,
        Scope.UploadMolecule,
        Scope.ViewMolecule,
        Scope.EditOwnProfile,
        Scope.DeleteOwnAccount,
        Scope.ManageMFA
    ]

    constructor(private readonly securityService: SercurityService) { }

    getEncryptedStandardScopes() {
        return this.encryptScopes(...this.standardScopes)
    }

    decryptScopes(...encryptedScopeVals: string[]): Scope[] {
        if (encryptedScopeVals.length === 0) {
            return []
        }
        return encryptedScopeVals.map((es) => this.securityService.decrypt_AES256(es))
            .filter((ds) => (this.scopeValues).includes(ds))
            .map((strScopeVal) => GeneralUtils.getEnumValue(Scope, strScopeVal)!)
    }

    encryptScopes(...decryptedScopeVals: Scope[]): string[] {
        if (decryptedScopeVals.length === 0) {
            return []
        }
        return decryptedScopeVals.filter((ds) => this.scopeValues.includes(ds))
            .map((ds) => this.securityService.encrypt_AES256(ds))
    }

    // validateScopes(...scopes: Scope[]): boolean {

    // }

}
