import type { MoleculeSearchQuery } from "../../../generated/graphql"

export type MoleculeSearchResult = MoleculeSearchQuery['moleculeSearch'][number] & {
  known?: boolean
}
