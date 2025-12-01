import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HelpService } from './services/help.service';
import { Ticket } from './Models/entities/ticket.entity';
import { TicketMessage } from './Models/entities/ticket-message.entity';
import { NotificationModule } from '../notification/notification.module';
import { HelpResolver } from './resolvers/help.resolver';

@Module({
    imports: [
        TypeOrmModule.forFeature([  
            Ticket,
            TicketMessage
        ]),
        forwardRef(() => NotificationModule)
    ],
    exports: [TypeOrmModule],
    providers: [
        HelpService,
        HelpResolver
    ]
})
export class HelpModule {}
