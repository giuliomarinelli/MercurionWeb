import { compile } from '@fastify/proxy-addr'

import { Environment } from './config.schema'

type TrustProxyFunction = (address: string, hop: number) => boolean

export interface TransportSecurityPolicy {
  readonly corsEnabled: false
  readonly rateLimitSkipOnError: boolean
  readonly trustedProxyCidrs: readonly string[]
}

export function createTransportSecurityPolicy(
  env: Environment,
  trustedProxyCidrs: readonly string[]
): TransportSecurityPolicy {
  return {
    corsEnabled: false,
    rateLimitSkipOnError:
      env === Environment.Development || env === Environment.Test,
    trustedProxyCidrs
  }
}

export interface ProxyTrustController {
  readonly trust: TrustProxyFunction
  configure(cidrs: readonly string[]): void
}

export function createProxyTrustController(): ProxyTrustController {
  let isTrusted: TrustProxyFunction = () => false
  return {
    trust: (address, hop) => isTrusted(address, hop),
    configure(cidrs) {
      isTrusted = compile([...cidrs])
    }
  }
}
