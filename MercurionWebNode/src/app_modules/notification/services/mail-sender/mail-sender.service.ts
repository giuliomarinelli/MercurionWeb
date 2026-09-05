import { MailerService } from '@nestjs-modules/mailer';
import { Injectable } from '@nestjs/common';
import { UUID } from 'crypto';
import { SentMessageInfo } from 'nodemailer';
import { TicketMessage } from 'src/app_modules/help/Models/entities/ticket-message.entity';
import { Ticket } from 'src/app_modules/help/Models/entities/ticket.entity';
import { SupportContext } from '../../Models/contexts/support.context';
import { ConfigService } from '@nestjs/config';
import { UserService } from 'src/app_modules/user/services/user.service';
import { resolve } from 'path';
import { MeiliLoggerService } from 'src/app_modules/meilisearch/services/meili-logger.service';
import { MeiliContextLogger } from 'src/app_modules/meilisearch/Models/interfaces/meili-context-logger.interface';

@Injectable()
export class MailSenderService {

    private readonly supportEmail: string
    private readonly logger: MeiliContextLogger

    constructor(
        private readonly configService: ConfigService,
        private readonly mailerService: MailerService,
        private readonly userService: UserService,
        loggerFactory: MeiliLoggerService
    ) {
        this.supportEmail = this.configService.get<string>('App.supportEmail')!
        this.logger = loggerFactory.forContext(MailSenderService.name)
    }

    private generateUrl(mode: 'user' | 'support', ticketId: UUID): string {
        const base = this.configService.get<string>('App.activationOrigin')!
        return `${base}/help?m=${mode}&t_id=${ticketId}`
    }

    public async sendEmail<T extends { [key: string]: any }>(to: string, subject: string, context: T, templatePath: string): Promise<SentMessageInfo> {
        return await this.mailerService.sendMail({
            to,
            subject,
            context,
            template: templatePath
        })
    }

    public async notifySupportNewTicket(ticket: Ticket, message: TicketMessage): Promise<void> {
        if (!message.authorId) {
            return
        }
        const userFirstName = await this.userService.getUserFirstNameById((message.authorId))
        if (!userFirstName) {
            return
        }
        const context: SupportContext = {
            ticketPublicId: ticket.publicId,
            ticketMessageBody: message.contentHtml,
            userFirstName,
            url: this.generateUrl('support', ticket.id)
        }
        this.sendEmail<SupportContext>(this.supportEmail, 'Un nuovo ticket è stato aperto', context, resolve('dist/src/app_modules/notification/email-templates/support---notify-support-new-ticket.hbs'))
            .catch((e) => this.logger.warn('notifySupportNewTicket > Error: ', (e.stack ?? e) as object))
    }

    public async confirmUserTicketOpened(ticket: Ticket, message: TicketMessage): Promise<void> {
        if (!message.authorId) {
            return
        }
        const userFirstName = await this.userService.getUserFirstNameById((message.authorId))
        const userEmail = (await this.userService.getUserProvidedEmailById(ticket.userId))?.email
        if (!userFirstName || !userEmail) {
            return
        }
        const context: SupportContext = {
            ticketPublicId: ticket.publicId,
            ticketMessageBody: message.contentHtml,
            userFirstName,
            url: this.generateUrl('user', ticket.id)
        }
        this.sendEmail<SupportContext>(userEmail, 'Supporto Mercurion: un nuovo ticket è stato aperto', context, resolve('dist/src/app_modules/notification/email-templates/support---confirm-user-ticket-opened.hbs'))
            .catch((e) => this.logger.warn('confirmUserTicketOpened > Error: ', (e.stack ?? e) as object))
    }

    public async notifySupportNewMessage(ticket: Ticket, message: TicketMessage): Promise<void> {
        if (!message.authorId) {
            return
        }
        const userFirstName = await this.userService.getUserFirstNameById((message.authorId))
        if (!userFirstName) {
            return
        }
        const context: SupportContext = {
            ticketPublicId: ticket.publicId,
            ticketMessageBody: message.contentHtml,
            userFirstName,
            url: this.generateUrl('support', ticket.id)
        }
        this.sendEmail<SupportContext>(this.supportEmail, `Un nuovo ticket messaggio è stato pubblicato nel ticket #${ticket.publicId}`, context, resolve('dist/src/app_modules/notification/email-templates/support---notify-support-new-message.hbs'))
            .catch((e) => this.logger.warn('notifySupportNewMessage > Error: ', (e.stack ?? e) as object))
    }

    public async notifyUserSupportReplied(ticket: Ticket, userId: UUID): Promise<void> {
        if (!userId) {
            return
        }
        const userFirstName = await this.userService.getUserFirstNameById(userId)
        const userEmail = (await this.userService.getUserProvidedEmailById(userId))?.email ?? ''
        if (!userFirstName || !userEmail ) {
            return
        }
        const context: SupportContext = {
            ticketPublicId: ticket.publicId,
            ticketMessageBody: null,
            userFirstName,
            url: this.generateUrl('user', ticket.id)
        }
        this.sendEmail<SupportContext>(userEmail, `Supporto Mercurion: Il ticket #${ticket.publicId} ha ricevuto una nuova risposta`, context, resolve('dist/src/app_modules/notification/email-templates/support---notify-user-support-replied.hbs'))
            .catch((e) => this.logger.warn('notifyUserSupportReplied > Error: ', (e.stack ?? e) as object))
    }


}
