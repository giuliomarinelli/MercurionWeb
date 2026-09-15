import type { FastifyInstance, FastifyReply } from 'fastify'
import {
  CONTRACT_VERSION_RESPONSE_HEADERS,
  CURRENT_CONTRACT_MAJOR,
  PUBLIC_CONTRACT_VERSION_METADATA,
  SUPPORTED_CONTRACT_MAJOR_RANGE,
  contractVersionDetails,
  contractVersionWarning,
  formatSupportedMajorRange,
  restMajorFromPath
} from '@mercurion/rest-contracts'
import { createRestErrorResponse } from '../exception-handling/application-error-envelope'

interface ContractVersionLogger {
  warn(message: string): void
}

interface RegisterRestContractVersioningOptions {
  isProduction: boolean
  logger: ContractVersionLogger
}

export function applyContractVersionResponseHeaders(reply: FastifyReply): void {
  reply.header(
    CONTRACT_VERSION_RESPONSE_HEADERS.currentMajor,
    String(CURRENT_CONTRACT_MAJOR)
  )
  reply.header(
    CONTRACT_VERSION_RESPONSE_HEADERS.supportedMajorRange,
    formatSupportedMajorRange(SUPPORTED_CONTRACT_MAJOR_RANGE)
  )
}

export function registerRestContractVersioningHook(
  fastify: FastifyInstance,
  options: RegisterRestContractVersioningOptions
): void {
  fastify.addHook('onRequest', (req, reply, done) => {
    const path = req.url.split('?')[0]
    if (!path.startsWith('/api/') || path === PUBLIC_CONTRACT_VERSION_METADATA.graphql.endpoint) {
      done()
      return
    }

    const selection = restMajorFromPath(path)
    applyContractVersionResponseHeaders(reply)
    const warning = contractVersionWarning(selection)
    if (warning) {
      reply.header('Warning', warning)
      options.logger.warn(`REST request ${req.method} ${path}: ${warning}`)
    }
    if (selection.kind === 'invalid' || selection.kind === 'unsupported') {
      reply.status(400).send(createRestErrorResponse({
        status: 400,
        code: selection.code,
        message: selection.code === 'CONTRACT_VERSION_INVALID'
          ? 'Invalid contract major version'
          : 'Unsupported contract major version',
        details: contractVersionDetails(selection),
        correlationId: req.id,
        isProduction: options.isProduction,
        path
      }))
      return
    }
    done()
  })
}
