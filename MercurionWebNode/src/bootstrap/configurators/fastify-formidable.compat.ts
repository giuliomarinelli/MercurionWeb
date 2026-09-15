import fastifyPlugin from 'fastify-plugin'
import FastifyFormidable from 'fastify-formidable'
import type { FastifyInstance, FastifyPluginAsync } from 'fastify'
import type { FastifyFormidableOptions } from 'fastify-formidable'

/**
 * fastify-formidable@3 advertises Fastify 4, although its registration
 * implementation is compatible with the Fastify 5 request APIs used here.
 * Keep the compatibility declaration local rather than weakening the
 * repository's Fastify version or patching node_modules.
 */
export const FastifyFormidableFastify5 = fastifyPlugin(
  (async (instance, options: FastifyFormidableOptions) => {
    const fastify = instance as FastifyInstance
    const addContentTypeParser = fastify.addContentTypeParser.bind(fastify)

    // Fastify 5 validates content types strictly. The legacy plugin passes
    // "multipart", which Fastify 4 accepted as an alias for form-data.
    fastify.addContentTypeParser = ((contentType: string | RegExp, ...args: unknown[]) => {
      const normalized = contentType === 'multipart'
        ? /^multipart\/form-data(?:;|$)/i
        : contentType
      return addContentTypeParser(normalized, ...args as [never, never])
    }) as FastifyInstance['addContentTypeParser']

    try {
      await FastifyFormidable(fastify, options)
    } finally {
      fastify.addContentTypeParser = addContentTypeParser
    }
  }) as FastifyPluginAsync<FastifyFormidableOptions>,
  {
    name: 'fastify-formidable-fastify5',
    fastify: '5.x'
  }
)
