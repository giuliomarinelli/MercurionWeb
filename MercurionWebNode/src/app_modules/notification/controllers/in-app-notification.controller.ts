import {
  BadRequestException,
  Body,
  Controller,
  DefaultValuePipe,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  ParseIntPipe,
  ParseUUIDPipe,
  Patch,
  Query
} from '@nestjs/common'
import { UUID } from 'node:crypto'
import {
  NotificationListState,
  type NotificationListState as NotificationListStateType,
  type NotificationPageResponse,
  type NotificationRecoveryResponse,
  type UserNotificationDTO
} from '@mercurion/rest-contracts'

import { AuthenticatedUserId } from 'src/metadata/metadata'
import { InAppNotificationService } from '../services/in-app-notification.service'
import {
  NotificationBulkThroughDTO,
  SetNotificationReadDTO
} from '../models/dto/in-app-notification.dto'

@Controller('notifications')
export class InAppNotificationController {
  constructor(
    private readonly notifications: InAppNotificationService
  ) {}

  @Get('recovery')
  async recover(
    @AuthenticatedUserId() userId: UUID,
    @Query('cursor') cursor?: string,
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit = 50
  ): Promise<NotificationRecoveryResponse> {
    this.assertPositiveLimit(limit)

    return this.withCursorValidation(() =>
      this.notifications.recover(userId, cursor, limit)
    )
  }

  @Get()
  async list(
    @AuthenticatedUserId() userId: UUID,
    @Query('cursor') cursor?: string,
    @Query('limit', new DefaultValuePipe(25), ParseIntPipe) limit = 25,
    @Query('state', new DefaultValuePipe(NotificationListState.All))
    stateRaw: string = NotificationListState.All
  ): Promise<NotificationPageResponse> {
    this.assertPositiveLimit(limit)
    const state = this.parseState(stateRaw)

    return this.withCursorValidation(() =>
      this.notifications.list(userId, {
        cursor,
        limit,
        state
      })
    )
  }

  @Get(':notificationId')
  async get(
    @AuthenticatedUserId() userId: UUID,
    @Param('notificationId', new ParseUUIDPipe({ version: '7' }))
    notificationId: UUID
  ): Promise<UserNotificationDTO> {
    const notification = await this.notifications.get(
      userId,
      notificationId
    )

    if (!notification) {
      throw new NotFoundException('NotificationNotFound')
    }

    return notification
  }

  @Patch(':notificationId/read')
  @HttpCode(HttpStatus.NO_CONTENT)
  async setRead(
    @AuthenticatedUserId() userId: UUID,
    @Param('notificationId', new ParseUUIDPipe({ version: '7' }))
    notificationId: UUID,
    @Body() dto: SetNotificationReadDTO
  ): Promise<void> {
    await this.notifications.setRead(userId, notificationId, dto.read)
  }

  @Patch('read-all')
  @HttpCode(HttpStatus.NO_CONTENT)
  async markAllRead(
    @AuthenticatedUserId() userId: UUID,
    @Body() dto: NotificationBulkThroughDTO
  ): Promise<void> {
    await this.withCursorValidation(() =>
      this.notifications.markAllReadThrough(userId, dto.throughCursor)
    )
  }

  @Patch('seen-all')
  @HttpCode(HttpStatus.NO_CONTENT)
  async markAllSeen(
    @AuthenticatedUserId() userId: UUID,
    @Body() dto: NotificationBulkThroughDTO
  ): Promise<void> {
    await this.withCursorValidation(() =>
      this.notifications.markSeenThrough(userId, dto.throughCursor)
    )
  }

  @Delete(':notificationId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async dismiss(
    @AuthenticatedUserId() userId: UUID,
    @Param('notificationId', new ParseUUIDPipe({ version: '7' }))
    notificationId: UUID
  ): Promise<void> {
    await this.notifications.dismiss(userId, notificationId)
  }

  @Delete()
  @HttpCode(HttpStatus.NO_CONTENT)
  async dismissAll(
    @AuthenticatedUserId() userId: UUID,
    @Body() dto: NotificationBulkThroughDTO
  ): Promise<void> {
    await this.withCursorValidation(() =>
      this.notifications.dismissAllThrough(userId, dto.throughCursor)
    )
  }

  private parseState(value: string): NotificationListStateType {
    if (
      value === NotificationListState.All ||
      value === NotificationListState.Unread
    ) {
      return value
    }

    throw new BadRequestException('Invalid notification list state')
  }

  private assertPositiveLimit(limit: number): void {
    if (!Number.isInteger(limit) || limit < 1) {
      throw new BadRequestException(
        'Notification limit must be a positive integer'
      )
    }
  }

  private async withCursorValidation<T>(
    operation: () => Promise<T>
  ): Promise<T> {
    try {
      return await operation()
    } catch (error) {
      if (error instanceof RangeError) {
        throw new BadRequestException(error.message)
      }
      throw error
    }
  }
}
