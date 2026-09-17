import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HelpService } from './services/help.service';
import { Ticket } from './models/entities/ticket.entity';
import { TicketMessage } from './models/entities/ticket-message.entity';
import { HelpResolver } from './resolvers/help.resolver';
import { NotificationOutboxEvent } from '../notification/models/entities/notification-outbox-event.entity';

@Global()
@Module({
    imports: [
        TypeOrmModule.forFeature([  
            Ticket,
            TicketMessage
            ,NotificationOutboxEvent
        ]),
    ],
    exports: [HelpService],
    providers: [
        HelpService,
        HelpResolver
    ]
})
export class HelpModule {}
