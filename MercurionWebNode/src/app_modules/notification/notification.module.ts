import { forwardRef, Module } from '@nestjs/common';
import { SmsSenderService } from './services/sms-sender/sms-sender.service';
import { MailSenderService } from './services/mail-sender/mail-sender.service';
import { HelpModule } from '../help/help.module';
import { UserModule } from '../user/user.module';
import { MeilisearchModule } from '../meilisearch/meilisearch.module';

@Module({
    imports: [
        forwardRef(() => HelpModule),
        forwardRef(() => UserModule),
        forwardRef(() => MeilisearchModule)
    ],
    providers: [
        SmsSenderService,
        MailSenderService
    ],
    exports: [
        SmsSenderService,
        MailSenderService
    ]
})
export class NotificationModule { }
