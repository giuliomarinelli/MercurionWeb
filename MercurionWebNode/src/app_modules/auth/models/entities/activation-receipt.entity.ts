import { UUID } from 'crypto'
import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm'
import { User } from '../../../user/models/entities/user.entity'

@Entity('account_activation_receipts')
@Index('idx_account_activation_receipts_user', ['userId'])
export class ActivationReceipt {
  @Column({ type: 'varchar', length: 255, primary: true })
  jti!: string

  @Column({ type: 'uuid' })
  userId!: UUID

  @ManyToOne(() => User, {
    onDelete: 'CASCADE',
    nullable: false
  })
  @JoinColumn({ name: 'user_id' })
  user!: User

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
