import { Global, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ClientsModule } from '@nestjs/microservices';
import { MercurionAIService } from './services/mercurion-ai.service';
import { MercurionAIController } from './controllers/mercurion-ai.controller';
import { RDKitService } from './services/rd-kit.service';
import { PcpService } from './services/pcp.service';
import { RdKitController } from './controllers/rd-kit.controller';
import { createNatsTransportOptions } from '../../nats-transport';
import { ScientificRpcPolicy } from './services/scientific-rpc.policy';
import { PcpController } from './controllers/pcp.controller';


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
    providers: [ScientificRpcPolicy, MercurionAIService, RDKitService, PcpService],
    controllers: [MercurionAIController, RdKitController, PcpController],
    exports: [RDKitService, PcpService]
})
export class MercurionAIModule { }

export async function createMercurionAIClientOptions(
    config: Pick<ConfigService, 'getOrThrow'>
) {
    return createNatsTransportOptions(config);
}
