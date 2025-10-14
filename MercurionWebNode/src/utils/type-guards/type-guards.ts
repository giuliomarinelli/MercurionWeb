import { StorageAction } from "src/app_modules/dropbox-object-store/Models/enums/storage-action.type";
import { ChEMBLMoleculeItemEntity } from "src/app_modules/user/Models/entities/molecule-collection/chembl-molecule-item.entity";
import { CustomMoleculeItemEntity } from "src/app_modules/user/Models/entities/molecule-collection/custom-molecule-item.entity";
import { MoleculeCollectionItemEntity } from "src/app_modules/user/Models/entities/molecule-collection/molecule-collection-item.entity";

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
        // Gli enum numerici hanno una "reverse mapping", quindi escludiamo le chiavi numeriche
        const enumValues = Object.values(enumObj).filter(v => typeof v !== 'number' || typeof value === 'number');
        return enumValues.includes(value);
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

}
