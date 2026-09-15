import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HelpService } from './services/help.service';
import { Ticket } from './Models/entities/ticket.entity';
import { TicketMessage } from './Models/entities/ticket-message.entity';
import { HelpResolver } from './resolvers/help.resolver';

@Global()
@Module({
    imports: [
        TypeOrmModule.forFeature([  
            Ticket,
            TicketMessage
        ]),
    ],
    exports: [HelpService],
    providers: [
        HelpService,
        HelpResolver
    ]
})
export class HelpModule {}
