import { Module } from '@nestjs/common'
import { NestFactory } from '@nestjs/core'
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify'
import { IoAdapter } from '@nestjs/platform-socket.io'
import { OnGatewayInit, SubscribeMessage, WebSocketGateway } from '@nestjs/websockets'
import { io } from 'socket.io-client'
import { socketEventRegistry, type SocketSessionInitAcknowledgement } from '@mercurion/socket-contracts'

// Exercise real Nest gateway discovery and HTTP upgrade without external
// services. Mocking SocketModule would hide a workspace dependency-hoisting
// regression in which Nest boots successfully but /socket.io returns 404.
@WebSocketGateway()
class RuntimeProbeGateway implements OnGatewayInit {
  initialized = false

  afterInit(): void { this.initialized = true }

  @SubscribeMessage(socketEventRegistry.sessionInit.name)
  sessionInit(): SocketSessionInitAcknowledgement {
    return { detail: 'websocket session init successful', state: 'authenticated' }
  }
}

@Module({ providers: [RuntimeProbeGateway] })
class RuntimeProbeModule {}

describe('Socket.IO runtime registration', () => {
  let app: NestFastifyApplication | undefined

  afterEach(async () => { await app?.close() })

  it('registers a gateway and acknowledges a real websocket handshake', async () => {
    app = await NestFactory.create<NestFastifyApplication>(RuntimeProbeModule, new FastifyAdapter(), { logger: false })
    app.useWebSocketAdapter(new IoAdapter(app))
    await app.listen(0, '127.0.0.1')

    expect(app.get(RuntimeProbeGateway).initialized).toBe(true)
    const client = io(await app.getUrl(), { transports: ['websocket'], reconnection: false, autoConnect: false })
    try {
      await new Promise<void>((resolve, reject) => {
        client.once('connect', resolve)
        client.once('connect_error', reject)
        client.connect()
      })
      const acknowledgement = await client.timeout(2000).emitWithAck(socketEventRegistry.sessionInit.name)
      expect(acknowledgement).toEqual({ detail: 'websocket session init successful', state: 'authenticated' })
    } finally {
      client.disconnect()
    }
  })
})
