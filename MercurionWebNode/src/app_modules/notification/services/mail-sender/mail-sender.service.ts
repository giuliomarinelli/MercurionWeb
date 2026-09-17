import { MailerService } from '@nestjs-modules/mailer';
import { Injectable } from '@nestjs/common';
import { TicketMessage } from 'src/app_modules/help/models/entities/ticket-message.entity';
import { Ticket } from 'src/app_modules/help/models/entities/ticket.entity';
import { SupportContext } from '../../models/contexts/support.context';
import { ConfigService } from '@nestjs/config';
import { UserService } from 'src/app_modules/user/services/user.service';
import { LoggerPort } from 'src/logging/logger.port';
import { LoggerContext } from 'src/logging/logger.port';
import { HelpPublicId } from 'src/app_modules/help/models/value-objects/help-public-id';
import { UUID } from 'crypto';
import {
    assertEmailTemplateContext,
    EmailTemplateContextMap,
    EmailTemplateKey,
    getEmailTemplateDefinition,
    getEmailTemplatePath,
} from '../../email-template-registry';

@Injectable()
export class MailSenderService {

    private readonly supportEmail: string
    private readonly logger: LoggerContext

    constructor(
        private readonly configService: ConfigService,
        private readonly mailerService: MailerService,
        private readonly userService: UserService,
        loggerFactory: LoggerPort
    ) {
        this.supportEmail = this.configService.get<string>('App.supportEmail')!
        this.logger = loggerFactory.forContext(MailSenderService.name)
    }

    private generateUrl(mode: 'user' | 'support', ticketId: UUID): string {
        const base = this.configService.get<string>('App.activationOrigin')!
        return `${base}/help?m=${mode}&t_id=${ticketId}`
    }

    public async send<K extends EmailTemplateKey>(
        templateKey: K,
        to: string,
        context: EmailTemplateContextMap[K],
        notificationId?: UUID
    ): Promise<unknown> {
        assertEmailTemplateContext(templateKey, context)
        const definition = getEmailTemplateDefinition(templateKey)
        return await this.mailerService.sendMail({
            to,
            subject: definition.subject(context),
            context,
            template: getEmailTemplatePath(templateKey),
            headers: notificationId ? { 'X-Mercurion-Notification-Id': notificationId } : undefined
        })
    }

    public async notifySupportNewTicket(ticket: Ticket, message: TicketMessage, ticketPublicId: HelpPublicId, notificationId?: UUID): Promise<void> {
        if (!message.authorId) {
            return
        }
        const userFirstName = await this.userService.getUserFirstNameById((message.authorId))
        if (!userFirstName) {
            return
        }
        const context: SupportContext = {
            ticketPublicId,
            ticketMessageBody: message.contentHtml,
            userFirstName,
            url: this.generateUrl('support', ticket.id)
        }
        await this.send('help-ticket-opened-support', this.supportEmail, context, notificationId)
    }

    public async confirmUserTicketOpened(ticket: Ticket, message: TicketMessage, ticketPublicId: HelpPublicId, notificationId?: UUID): Promise<void> {
        if (!message.authorId) {
            return
        }
        const userFirstName = await this.userService.getUserFirstNameById((message.authorId))
        const userEmail = (await this.userService.getUserProvidedEmailById(ticket.userId))?.email
        if (!userFirstName || !userEmail) {
            return
        }
        const context: SupportContext = {
            ticketPublicId,
            ticketMessageBody: message.contentHtml,
            userFirstName,
            url: this.generateUrl('user', ticket.id)
        }
        await this.send('help-ticket-opened-user', userEmail, context, notificationId)
    }

    public async notifySupportNewMessage(ticket: Ticket, message: TicketMessage, ticketPublicId: HelpPublicId, notificationId?: UUID): Promise<void> {
        if (!message.authorId) {
            return
        }
        const userFirstName = await this.userService.getUserFirstNameById((message.authorId))
        if (!userFirstName) {
            return
        }
        const context: SupportContext = {
            ticketPublicId,
            ticketMessageBody: message.contentHtml,
            userFirstName,
            url: this.generateUrl('support', ticket.id)
        }
        await this.send('help-message-added', this.supportEmail, context, notificationId)
    }

    public async notifyUserSupportReplied(ticket: Ticket, userId: UUID, ticketPublicId: HelpPublicId, notificationId?: UUID): Promise<void> {
        if (!userId) {
            return
        }
        const userFirstName = await this.userService.getUserFirstNameById(userId)
        const userEmail = (await this.userService.getUserProvidedEmailById(userId))?.email ?? ''
        if (!userFirstName || !userEmail ) {
            return
        }
        const context: SupportContext = {
            ticketPublicId,
            ticketMessageBody: null,
            userFirstName,
            url: this.generateUrl('user', ticket.id)
        }
        await this.send('help-support-replied', userEmail, context, notificationId)
    }


}
