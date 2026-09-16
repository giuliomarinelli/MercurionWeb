import { Global, Module } from '@nestjs/common';
import { SmsSenderService } from './services/sms-sender/sms-sender.service';
import { MailSenderService } from './services/mail-sender/mail-sender.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotificationOutboxEvent } from './models/entities/notification-outbox-event.entity';
import { NotificationOutboxService } from './services/outbox/notification-outbox.service';
import { NotificationOutboxDispatcherService } from './services/outbox/notification-outbox-dispatcher.service';

@Global()
@Module({
    imports: [
        TypeOrmModule.forFeature([NotificationOutboxEvent])
    ],
    providers: [
        SmsSenderService,
        MailSenderService,
        NotificationOutboxService,
        NotificationOutboxDispatcherService
    ],
    exports: [
        SmsSenderService,
        MailSenderService,
        NotificationOutboxService
    ]
})
export class NotificationModule { }
