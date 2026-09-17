import { IoAdapter } from '@nestjs/platform-socket.io'
import { createNatsTransportOptions } from '../../nats-transport'
import type { BootstrapDependencies } from '../bootstrap.types'
import { FastifyFormidableFastify5 } from './fastify-formidable.compat'
import {
  DOCUMENT_UPLOAD_MAX_FILE_SIZE
} from '../../app_modules/dropbox-object-store/transport/document-upload.policy'
import { correlationMiddleware } from '../../observability/correlation-middleware'

export async function configureTransport(
  dependencies: Pick<BootstrapDependencies, 'app' | 'config'>
): Promise<void> {
  const fastify = dependencies.app.getHttpAdapter().getInstance()
  await fastify.register(FastifyFormidableFastify5, {
    formidable: {
      maxFileSize: DOCUMENT_UPLOAD_MAX_FILE_SIZE,
      maxFiles: 1,
      allowEmptyFiles: false,
      multiples: true
    }
  })
  dependencies.app.use(correlationMiddleware)
  dependencies.app.useWebSocketAdapter(new IoAdapter(dependencies.app))
  dependencies.app.connectMicroservice(
    createNatsTransportOptions(dependencies.config)
  )
}
