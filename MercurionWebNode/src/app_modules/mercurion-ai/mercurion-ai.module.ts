import { Global, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ClientsModule } from '@nestjs/microservices';
import { MercurionAIService } from './services/mercurion-ai.service';
import { MercurionAIController } from './controllers/mercurion-ai.controller';
import { RDKitService } from './services/rd-kit.service';
import { RdKitController } from './controllers/rd-kit.controller';
import { createNatsTransportOptions } from '../../nats-transport';


@Global()
@Module({
    imports: [
        ConfigModule,
        ClientsModule.registerAsync([
            {
                name: 'MERCURION_AI_CLIENT',
                imports: [ConfigModule],
                inject: [ConfigService],
                useFactory: createMercurionAIClientOptions,
            },
        ]),
    ],
    providers: [MercurionAIService, RDKitService],
    controllers: [MercurionAIController, RdKitController],
    exports: [RDKitService]
})
export class MercurionAIModule { }

export async function createMercurionAIClientOptions(
    config: Pick<ConfigService, 'getOrThrow'>
) {
    return createNatsTransportOptions(config);
}
