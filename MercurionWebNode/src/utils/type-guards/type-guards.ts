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

}
