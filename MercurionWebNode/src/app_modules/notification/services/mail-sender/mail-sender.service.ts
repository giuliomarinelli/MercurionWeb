import { MailerService } from '@nestjs-modules/mailer';
import { Injectable } from '@nestjs/common';
import { UUID } from 'crypto';
import { SentMessageInfo } from 'nodemailer';
import { TicketMessage } from 'src/app_modules/help/Models/entities/ticket-message.entity';
import { Ticket } from 'src/app_modules/help/Models/entities/ticket.entity';

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

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    public async notifySupportNewTicket(ticket: Ticket, message: TicketMessage): Promise<void> {
        // TODO
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    public async confirmUserTicketOpened(ticket: Ticket, message: TicketMessage): Promise<void> {
        // TODO
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    public async notifySupportNewMessage(ticket: Ticket): Promise<void> {
        // TODO
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    public async notifyUserSupportReplied(ticket: Ticket, userId: UUID): Promise<void> {
        // TODO
    }


}
