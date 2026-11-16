export type NatsServerUrl = string & {
    readonly __natsServerUrl: unique symbol
}

export function createNatsServerUrl(hostUrl: string, port: number): NatsServerUrl {
    const endpoint = new URL(hostUrl)
    endpoint.port = String(port)
    return endpoint.toString() as NatsServerUrl
}

export function formatNatsServerUrlForLog(serverUrl: NatsServerUrl): string {
    const endpoint = new URL(serverUrl)
    endpoint.username = ''
    endpoint.password = ''
    return endpoint.toString()
}
