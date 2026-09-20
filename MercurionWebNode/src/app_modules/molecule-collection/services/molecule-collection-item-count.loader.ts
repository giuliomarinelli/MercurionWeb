import { Injectable, Scope } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { UUID } from 'crypto';
import { MoleculeCollectionItemJoin } from '../models/entities/molecule-collection-item-join.entity';
import { Repository } from 'typeorm';

type PendingCount = {
  userId: UUID;
  collectionId: UUID;
  resolve: (count: number) => void;
  reject: (error: unknown) => void;
};

@Injectable({ scope: Scope.REQUEST })
export class MoleculeCollectionItemCountLoader {
  private readonly cache = new Map<string, Promise<number>>();
  private readonly pending = new Map<string, PendingCount>();
  private flushScheduled = false;

  constructor(
    @InjectRepository(MoleculeCollectionItemJoin)
    private readonly joinRepo: Repository<MoleculeCollectionItemJoin>,
  ) {}

  load(userId: UUID, collectionId: UUID): Promise<number> {
    const key = this.key(userId, collectionId);
    const cached = this.cache.get(key);
    if (cached) return cached;

    const promise = new Promise<number>((resolve, reject) => {
      this.pending.set(key, { userId, collectionId, resolve, reject });
    });
    this.cache.set(key, promise);
    this.scheduleFlush();
    return promise;
  }

  private key(userId: UUID, collectionId: UUID): string {
    return `${userId}:${collectionId}`;
  }

  private scheduleFlush(): void {
    if (this.flushScheduled) return;
    this.flushScheduled = true;
    queueMicrotask(() => {
      this.flushScheduled = false;
      void this.flush();
    });
  }

  private async flush(): Promise<void> {
    const pending = Array.from(this.pending.values());
    this.pending.clear();
    if (pending.length === 0) return;

    const requestsByUser = new Map<string, PendingCount[]>();
    for (const request of pending) {
      const requests = requestsByUser.get(String(request.userId)) ?? [];
      requests.push(request);
      requestsByUser.set(String(request.userId), requests);
    }

    try {
      await Promise.all(
        Array.from(requestsByUser.values()).map((requests) =>
          this.flushForUser(requests),
        ),
      );
    } catch (error) {
      for (const request of pending) {
        this.cache.delete(this.key(request.userId, request.collectionId));
        request.reject(error);
      }
    }
  }

  private async flushForUser(requests: PendingCount[]): Promise<void> {
    const userId = requests[0].userId;
    const collectionIds = requests.map(({ collectionId }) => collectionId);
    const rows = await this.joinRepo
      .createQueryBuilder('join')
      .select('join.collectionId', 'collectionId')
      .addSelect('COUNT(*)', 'count')
      .where('join.userId = :userId', { userId })
      .andWhere('join.collectionId IN (:...collectionIds)', { collectionIds })
      .groupBy('join.collectionId')
      .getRawMany<{ collectionId: UUID; count: string }>();
    const counts = new Map(
      rows.map((row) => [String(row.collectionId), Number(row.count)]),
    );

    for (const request of requests) {
      request.resolve(counts.get(String(request.collectionId)) ?? 0);
    }
  }
}
