import { IsBoolean, IsString, MaxLength } from 'class-validator'
import type {
  NotificationBulkThroughRequest,
  SetNotificationReadRequest
} from '@mercurion/rest-contracts'

export class SetNotificationReadDTO implements SetNotificationReadRequest {
  @IsBoolean()
  read!: boolean
}

export class NotificationBulkThroughDTO implements NotificationBulkThroughRequest {
  @IsString()
  @MaxLength(512)
  throughCursor!: string
}
