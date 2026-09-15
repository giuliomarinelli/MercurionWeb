import { UUID } from 'crypto'
import { Column, Entity, Index } from 'typeorm'

@Entity('account_activation_receipts')
@Index('uq_account_activation_receipts_jti', ['jti'], { unique: true })
export class ActivationReceipt {
  @Column({ type: 'varchar', length: 255, primary: true })
  jti!: string

  @Column({ type: 'uuid' })
  userId!: UUID

  @Column({ type: 'varchar', length: 320 })
  email!: string

  /**
   * The recovery code is returned again only for the same committed
   * activation.  It is encrypted at rest and never used as an activation
   * credential.
   */
  @Column({ type: 'text' })
  recoveryCode!: string

  @Column({ type: 'bigint' })
  createdAt!: number
}
