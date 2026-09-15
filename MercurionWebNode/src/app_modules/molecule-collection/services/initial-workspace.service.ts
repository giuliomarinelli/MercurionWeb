import { Injectable } from '@nestjs/common'
import { uuidv7 } from '@kripod/uuidv7'
import type { UUID } from 'crypto'

import { transactionManager, type TransactionContext } from 'src/persistence/transaction-context'
import { ChEMBLMoleculeItemEntity } from '../Models/entities/chembl-molecule-item.entity'
import { MoleculeCollection } from '../Models/entities/molecule-collection.entity'
import { MoleculeCollectionItemJoin } from '../Models/entities/molecule-collection-item-join.entity'

const INITIAL_MOLECULES = [
  [1280, 'ASPIRINA', 'ASPIRIN', 'Acido acetilsalicilico', 'La mia prima molecola su Mercurion'],
  [11674, 'IBUPROFENE', 'IBUPROFEN', 'Antinfiammatorio non steroideo derivato dell\'acido arilpropionico', 'La mia seconda molecola su Mercurion'],
  [5080, 'KETOROLAC', 'KETOROLAC', null, 'La mia terza molecola su Mercurion'],
  [173, 'INDOMETACINA', 'INDOMETHACIN', 'Indometacina', 'Gastrotossica, nefrotossica'],
  [16591, 'KETOPROFENE', 'KETOPROFEN', null, 'Potente antinfiammatorio, buon analgesico']
] as const

@Injectable()
export class InitialWorkspaceService {
  async createForUser(userId: UUID, context: TransactionContext): Promise<void> {
    const manager = transactionManager(context)
    const now = Date.now()
    const molecules = INITIAL_MOLECULES.map(([chemblMolregno, name, nameEn, label, notes], index) =>
      manager.create(ChEMBLMoleculeItemEntity, {
        id: uuidv7() as UUID,
        chemblMolregno,
        name,
        nameEn,
        userId,
        label,
        notes,
        type: 'chembl',
        createdAt: now,
        updatedAt: now,
        touchedAt: now - index
      })
    )
    await manager.save(molecules)

    const collection = await manager.save(manager.create(MoleculeCollection, {
      id: uuidv7() as UUID,
      name: 'La mia prima collezione',
      createdAt: now,
      updatedAt: now,
      touchedAt: now,
      userId
    }))
    await manager.save(molecules.map((molecule) => manager.create(MoleculeCollectionItemJoin, {
      id: uuidv7() as UUID,
      userId,
      collectionId: collection.id,
      itemId: molecule.id
    })))
  }
}
