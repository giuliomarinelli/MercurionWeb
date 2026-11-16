import { Injectable } from '@nestjs/common'
import {
  socketEventRegistry,
  type SocketStateChangedPayload
} from '@mercurion/socket-contracts'
import { LoggerPort, type LoggerContext } from 'src/logging/logger.port'
import {
  afterTransactionCommit,
  type TransactionContext
} from 'src/persistence/transaction-context'
import { getClientInstanceId } from 'src/observability/correlation-context'
import { RealtimePublisherService } from './realtime-publisher.service'

@Injectable()
export class RealtimeStateSyncService {
  private readonly logger: LoggerContext

  constructor(
    private readonly publisher: RealtimePublisherService,
    loggerFactory: LoggerPort
  ) {
    this.logger = loggerFactory.forContext(RealtimeStateSyncService.name)
  }

  publishToUser(
    userId: string,
    payload: SocketStateChangedPayload,
    originClientInstanceId: string | undefined = getClientInstanceId()
  ): void {
    try {
      this.publisher.emitToUserExceptClient(
        userId,
        originClientInstanceId,
        socketEventRegistry.stateChanged.name,
        payload
      )
    } catch (error) {
      this.logger.warn('Best-effort realtime state invalidation failed', error as object)
    }
  }

  publishToUsers(
    userIds: readonly string[],
    payload: SocketStateChangedPayload,
    originClientInstanceId: string | undefined = getClientInstanceId()
  ): void {
    for (const userId of new Set(userIds)) {
      this.publishToUser(userId, payload, originClientInstanceId)
    }
  }

  publishAfterCommit(
    context: TransactionContext,
    userIds: readonly string[],
    payload: SocketStateChangedPayload
  ): void {
    const originClientInstanceId = getClientInstanceId()
    afterTransactionCommit(context, async () => {
      this.publishToUsers(userIds, payload, originClientInstanceId)
    })
  }
}
