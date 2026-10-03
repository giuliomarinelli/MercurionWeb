import { Global, Module } from '@nestjs/common';
import { SmsSenderService } from './services/sms-sender/sms-sender.service';
import { MailSenderService } from './services/mail-sender/mail-sender.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotificationOutboxEvent } from './models/entities/notification-outbox-event.entity';
import { NotificationOutboxService } from './services/outbox/notification-outbox.service';
import { NotificationOutboxDispatcherService } from './services/outbox/notification-outbox-dispatcher.service';
import { OutboxRepository } from '../../persistence/outbox/outbox-repository'
import { InAppNotificationService } from './services/in-app-notification.service';
import { UserNotification } from './models/entities/user-notification.entity';
import { UserNotificationRepository } from './repositories/user-notification.repository';
import { RealtimeModule } from '../socket-io/realtime.module';
import { InAppNotificationController } from './controllers/in-app-notification.controller';

@Global()
@Module({
    imports: [
        TypeOrmModule.forFeature([NotificationOutboxEvent, UserNotification]),
        RealtimeModule
    ],
    providers: [
        SmsSenderService,
        MailSenderService,
        NotificationOutboxService,
        NotificationOutboxDispatcherService,
        OutboxRepository,
        InAppNotificationService,
        UserNotificationRepository
    ],
    controllers: [InAppNotificationController],
    exports: [
        SmsSenderService,
        MailSenderService,
        NotificationOutboxService,
        OutboxRepository,
        InAppNotificationService
    ]
})
export class NotificationModule { }
