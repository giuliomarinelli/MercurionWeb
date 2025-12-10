import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { MercurionAIService } from './services/mercurion-ai.service';
import { MercurionAIController } from './controllers/mercurion-ai.controller';
import { JwtToolsService } from '../auth/services/jwt-tools.service';
import { AuthModule } from '../auth/auth.module';
import { UserModule } from '../user/user.module';
import { RedisModule } from '../redis/redis.module';
import { MeilisearchModule } from '../meilisearch/meilisearch.module';
import { RDKitService } from './services/rd-kit.service';
import { RdKitController } from './controllers/rd-kit.controller';


@Module({
    imports: [
        ConfigModule,
        ClientsModule.registerAsync([
            {
                name: 'MERCURION_AI_CLIENT',
                imports: [ConfigModule],
                inject: [ConfigService],
                useFactory: async (config: ConfigService) => ({
                    transport: Transport.NATS,
                    options: {
                        servers: [`${config.get<string>('App.natsHost')}:${config.get<number>('App.natsPort') ?? 4222}`],
                    },
                }),
            },
        ]),
        AuthModule,
        UserModule,
        RedisModule,
        MeilisearchModule
    ],
    providers: [MercurionAIService, JwtToolsService, RDKitService],
    controllers: [MercurionAIController, RdKitController]
})
export class MercurionAIModule { }
