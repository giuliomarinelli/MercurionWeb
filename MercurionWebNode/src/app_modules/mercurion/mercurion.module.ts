import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { MercurionService } from './services/mercurion.service';
import { MercurionController } from './controllers/mercurion.controller';

@Module({
    imports: [
        ConfigModule,
        ClientsModule.registerAsync([
            {
                name: 'MERCURION_CLIENT',
                imports: [ConfigModule],
                inject: [ConfigService],
                useFactory: async (config: ConfigService) => ({
                    transport: Transport.NATS,
                    options: {
                        servers: [`nats://localhost:${config.get<number>('App.natsPort') ?? 4223}`],
                    },
                }),
            },
        ]),
    ],
    providers: [MercurionService],
    controllers: [MercurionController]
})
export class MercurionModule { }
