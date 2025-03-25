import { Module } from '@nestjs/common';
import { SmsSenderService } from './services/sms-sender/sms-sender.service';
import { MailSenderService } from './services/mail-sender/mail-sender.service';

@Module({
    providers: [SmsSenderService, MailSenderService],
    exports: [SmsSenderService, MailSenderService]
})
export class NotificationModule {}
