import { BadRequestException, Injectable, InternalServerErrorException } from '@nestjs/common'
import { InjectDataSource } from '@nestjs/typeorm'
import { UUID } from 'crypto'
import { uuidv7 } from '@kripod/uuidv7'
import { DataSource, EntityManager } from 'typeorm'
import { RDKitService } from 'src/app_modules/mercurion-ai/services/rd-kit.service'
import { runInTransaction } from 'src/persistence/transaction-context'
import { CustomMoleculeItemInput } from '../models/dto/custom-molecule-item.input'
import { CustomMoleculeItemEntity } from '../models/entities/custom-molecule-item.entity'

/**
 * One owner-scoped identity for a canonical custom structure, irrespective of
 * collection or synthesis memberships. Never patches metadata on reuse.
 *
 * A PostgreSQL partial UNIQUE(user_id, canonical_smiles) index for type=custom
 * remains mandatory. The advisory transaction lock makes cooperating callers
 * deterministic even during the DB-first deployment transition.
 */
@Injectable()
export class CustomMoleculeResolutionService {
  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
    private readonly rdKitService: RDKitService
  ) {}

  async canonicalize(smiles: string, accessToken: string): Promise<string> {
    const canonical = await this.rdKitService.toCanonicalSmiles({ smiles, accessToken })
    if (typeof canonical !== 'string' || !canonical.trim()) {
      throw new BadRequestException('MOLECULE_STRUCTURE_INVALID')
    }
    return canonical.trim()
  }

  async resolveOrCreate(
    userId: UUID,
    input: CustomMoleculeItemInput,
    accessToken: string
  ): Promise<CustomMoleculeItemEntity> {
    const canonical = await this.canonicalize(input.canonicalSmiles, accessToken)
    return runInTransaction(this.dataSource, (_context, manager) =>
      this.resolveCanonicalWithManager(userId, canonical, input, manager)
    )
  }

  /** Use this overload inside the caller's existing Unit of Work. */
  async resolveCanonicalWithManager(
    userId: UUID,
    canonicalSmiles: string,
    input: Partial<CustomMoleculeItemInput>,
    manager: EntityManager
  ): Promise<CustomMoleculeItemEntity> {
    const canonical = canonicalSmiles.trim()
    if (!canonical) {
      throw new BadRequestException('MOLECULE_STRUCTURE_INVALID')
    }

    // Serialize competing get-or-create operations for exactly this owner and
    // structure. The partial UNIQUE index is still the authoritative invariant.
    await manager.query(
      'SELECT pg_advisory_xact_lock(hashtextextended($1::text, 17))',
      [String(userId) + ':' + canonical]
    )

    const lookup = () => manager.findOne(CustomMoleculeItemEntity, {
      where: { userId, type: 'custom', canonicalSmiles: canonical }
    })

    const existing = await lookup()
    if (existing) return existing

    const now = Date.now()
    const entity = manager.create(CustomMoleculeItemEntity, {
      id: uuidv7() as UUID,
      userId,
      type: 'custom',
      canonicalSmiles: canonical,
      name: input.name ?? null,
      molFormula: input.molFormula ?? null,
      propertiesJson: input.propertiesJson ?? null,
      label: input.label ?? null,
      notes: input.notes ?? null,
      createdAt: now,
      updatedAt: now,
      touchedAt: now
    })

    // PostgreSQL ON CONFLICT DO NOTHING allows an owner-scoped concurrent
    // creator outside the advisory protocol to win without aborting our UoW.
    await manager.createQueryBuilder()
      .insert()
      .into(CustomMoleculeItemEntity)
      .values(entity)
      .orIgnore()
      .execute()

    const persisted = await lookup()
    if (!persisted) {
      throw new InternalServerErrorException('MOLECULE_RESOLUTION_FAILED')
    }
    return persisted
  }
}
