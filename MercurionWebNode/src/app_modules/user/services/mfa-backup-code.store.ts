import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import type { UUID } from 'crypto'
import { Repository } from 'typeorm'

import { MfaBackupCode } from '../Models/entities/backup-code.entity'

export interface BackupCodeRecord {
  readonly id: UUID
  readonly hash: string
  readonly used: boolean
  readonly usedAt?: number | null
}

@Injectable()
export class MfaBackupCodeStore {
  constructor(
    @InjectRepository(MfaBackupCode)
    private readonly repository: Repository<MfaBackupCode>
  ) {}

  findUnused(userId: UUID): Promise<BackupCodeRecord[]> {
    return this.repository.find({ where: { userId, used: false } })
  }

  async markUsed(code: BackupCodeRecord): Promise<void> {
    await this.repository.update({ id: code.id }, { used: true, usedAt: Date.now() })
  }

  async hasValid(userId: UUID): Promise<boolean> {
    return (await this.repository.count({ where: { user: { id: userId }, used: false } })) > 0
  }

  async status(userId: UUID): Promise<{ total: number; used: number; remaining: number }> {
    const codes = await this.repository.find({ where: { user: { id: userId } } })
    const used = codes.filter((code) => code.used).length
    return { total: codes.length, used, remaining: codes.length - used }
  }

  async destroy(userId: UUID): Promise<void> {
    await this.repository.delete({ userId })
  }
}
