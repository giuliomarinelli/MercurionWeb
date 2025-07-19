import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { MercurionAIService } from './services/mercurion.service';
import { MercurionAIController } from './controllers/mercurion.controller';
import { JwtToolsService } from '../auth/services/jwt-tools.service';
import { AuthModule } from '../auth/auth.module';
import { UserModule } from '../user/user.module';
import { RedisModule } from '../redis/redis.module';


@Module({
    imports: [
        ConfigModule,
        ClientsModule.registerAsync([
            {
                name: 'MERCURION_TOX_21_CLIENT',
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
        AuthModule,
        UserModule,
        RedisModule
    ],
    providers: [MercurionAIService, JwtToolsService],
    controllers: [MercurionAIController]
})
export class MercurionModule { }
