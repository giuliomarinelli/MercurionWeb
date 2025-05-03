export interface MoleculeProperties {
    mwFreebase: number | string    // peso molecolare, può arrivare come stringa (in Dalton cioè unità di massa atomica)
    alogp: number | string         // coefficiente di ripartizione logP
    hba: number                    // hydrogen bond acceptors
    hbd: number                    // hydrogen bond donors
    psa: number | string           // polar surface area
    rtb: number                    // rotatable bonds
}
