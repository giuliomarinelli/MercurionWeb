import { IoAdapter } from '@nestjs/platform-socket.io'
import { createNatsTransportOptions } from '../../nats-transport'
import type { BootstrapDependencies } from '../bootstrap.types'

export function configureTransport(
  dependencies: Pick<BootstrapDependencies, 'app' | 'config'>
): void {
  dependencies.app.useWebSocketAdapter(new IoAdapter(dependencies.app))
  dependencies.app.connectMicroservice(
    createNatsTransportOptions(dependencies.config)
  )
}
