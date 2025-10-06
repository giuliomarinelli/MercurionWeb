export interface MoleculeProperties {
    mwFreebase: number | null    // peso molecolare, può arrivare come stringa (in Dalton cioè unità di massa atomica)
    alogp: number | null         // coefficiente di ripartizione logP
    hba: number | null                   // hydrogen bond acceptors
    hbd: number | null                   // hydrogen bond donors
    psa: number | null           // polar surface area
    rtb: number | null                   // rotatable bonds
}
