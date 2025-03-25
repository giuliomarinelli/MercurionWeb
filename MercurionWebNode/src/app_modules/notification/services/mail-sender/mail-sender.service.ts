import { MailerService } from '@nestjs-modules/mailer';
import { Injectable } from '@nestjs/common';
import { SentMessageInfo } from 'nodemailer';

@Injectable()
export class MailSenderService {

    constructor(private mailerService: MailerService) { }

    public async sendEmail<T extends { [key: string]: any }>(to: string, subject: string, context: T, templatePath: string): Promise<SentMessageInfo> {

        return await this.mailerService.sendMail({
            to,
            subject,
            context,
            template: templatePath
        })

    }

}
