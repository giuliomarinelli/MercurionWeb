import { Injectable } from "@nestjs/common"
import { MoleculeDetail } from "../Models/DTO/molecule-detail.gql.dtos"
import { MoleculeDetailModel } from "src/app_modules/chembl/Models/DTO/molecule-detail-model.interface"

@Injectable()
export class MoleculeService {
  async getDetailByMolregno(molregno: string): Promise<MoleculeDetail> {
    
    const raw = await this.fetchFromChembl(molregno)

    return {
      id: raw.id,
      cmbId: raw.cmbId,
      preferredName: raw.preferredName,
      canonicalSmiles: raw.canonicalSmiles,
      properties: {
        mwFreebase: raw.properties.mwFreebase,
        alogp: raw.properties.alogp,
        hba: raw.properties.hba,
        hbd: raw.properties.hbd,
        psa: raw.properties.psa,
        rtb: raw.properties.rtb
      },
      maxPhase: raw.maxPhase,
      moleculeType: raw.moleculeType,
      administrationRoutes: {
        oral: !!raw.administrationRoutes.oral,
        parenteral: !!raw.administrationRoutes.parenteral,
        topical: !!raw.administrationRoutes.topical
      },
      naturalProduct: !!raw.naturalProduct,
      prodrug: !!raw.prodrug,
      blackBoxWarning: !!raw.blackBoxWarning,
      synonyms: raw.synonyms
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private async fetchFromChembl(molregno: string) {
    // TODO: implementa fetch reale o mock
    const MOCK: MoleculeDetailModel = {
        id: 0,
        cmbId: "",
        preferredName: "",
        canonicalSmiles: "",
        standardInchi: "",
        standardInchiKey: "",
        molFormula: "",
        properties: {
            mwFreebase: null,
            alogp: null,
            hba: null,
            hbd: null,
            psa: null,
            rtb: null
        },
        maxPhase: null,
        moleculeType: "",
        administrationRoutes: {
            oral: false,
            parenteral: false,
            topical: false
        },
        naturalProduct: false,
        prodrug: false,
        blackBoxWarning: false,
        synonyms: [],
        activities: [],
        toxicityData: []
    }
    return MOCK
  }
}
