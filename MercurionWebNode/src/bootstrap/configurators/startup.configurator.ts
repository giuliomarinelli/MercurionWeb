import { formatNatsServerUrlForLog } from '../../config/nats-endpoint'
import { getNatsServerUrl } from '../../nats-transport'
import type { BootstrapDependencies } from '../bootstrap.types'

export async function startApplication(
  dependencies: Pick<BootstrapDependencies, 'app' | 'config' | 'env' | 'logger'>
): Promise<void> {
  const port = dependencies.config.get<number>('App.port') ?? 8098
  const host = dependencies.config.get<string>('App.host') as string
  await dependencies.app.startAllMicroservices()
  await dependencies.app.listen(port, host.replace('http://', ''))

  const appUrl = `${host}:${port}`
  const lastColon = appUrl.lastIndexOf(':')
  const coloredUrl =
    '\x1b[36m' + appUrl.slice(0, lastColon) +
    '\x1b[34m:\x1b[31m' + appUrl.slice(lastColon + 1) + '\x1b[0m'
  dependencies.logger.log(
    `MercurionWebNode started in \x1b[36m${dependencies.env.toUpperCase()} \x1b[32menvironment`
  )
  dependencies.logger.log(`Fastify listening on ${coloredUrl}`)
  dependencies.logger.log(
    `NATS client connected to NATS server on ${formatNatsServerUrlForLog(
      getNatsServerUrl(dependencies.config)
    )}`
  )
}
