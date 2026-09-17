import { UUID } from 'crypto';
import { Column, Entity, Index, OneToMany, PrimaryColumn, TableInheritance } from 'typeorm';
import { MoleculeCollectionItemJoin } from './molecule-collection-item-join.entity';
import { Field, ID, InterfaceType } from '@nestjs/graphql';

@InterfaceType({
  resolveType: value => {
    if (value.type === 'custom') return 'CustomMoleculeItemEntity'
    if (value.type === 'chembl') return 'ChEMBLMoleculeItemEntity'
    return null
  }
})
@Entity('molecule_collection_items')
@TableInheritance({ column: { type: 'varchar', name: 'type' } })
@Index('uq_molecule_collection_items_id_user', ['id', 'userId'], { unique: true })
@Index('uq_molecule_collection_items_user_system_key', ['userId', 'systemKey'], { unique: true })
@Index('idx_molecule_collection_items_user_touched', ['userId', 'touchedAt'])
export abstract class MoleculeCollectionItemEntity {

  @Field(() => ID)
  @PrimaryColumn({ type: 'uuid' })
  id!: UUID

  @Index()
  @Column({ type: 'uuid' })
  userId!: UUID

  @Field(() => String, { nullable: true })
  @Column({ nullable: true, type: 'varchar' })
  label!: string | null

  @Field(() => String, { nullable: true })
  @Column({ nullable: true, type: 'text' })
  notes!: string | null

  @Field()
  @Column({ type: 'varchar' })
  type!: string

  @Field(() => [MoleculeCollectionItemJoin], { nullable: true })
  @OneToMany(() => MoleculeCollectionItemJoin, join => join.item)
  joins!: MoleculeCollectionItemJoin[]

  @Field(() => String)
  @Column({ type: 'bigint' })
  createdAt!: number

  @Field(() => String)
  @Column({ type: 'bigint' })
  updatedAt!: number

  @Field(() => String)
  @Column({ type: 'bigint' })
  touchedAt!: number

  @Column({ type: 'varchar', nullable: true })
  alias!: string | null

  /**
   * Stable application identity for system-created items.  It is nullable so
   * existing user-created items and legacy starter rows remain compatible.
   */
  @Column({ type: 'varchar', nullable: true })
  systemKey!: string | null

}
