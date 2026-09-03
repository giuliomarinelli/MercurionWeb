import {
  socketEventRegistry,
  type ClientToServerEvents,
  type ServerToClientEvents
} from './index'

declare const clientToServer: ClientToServerEvents
declare const serverToClient: ServerToClientEvents

clientToServer[socketEventRegistry.authRefresh.name]('token')
clientToServer[socketEventRegistry.publicTestRequest.name]('PING')
clientToServer[socketEventRegistry.privateTestRequest.name]('PING')
clientToServer[socketEventRegistry.sessionInit.name](undefined, (acknowledgement) => {
  const detail: 'websocket session init successful' = acknowledgement.detail
  void detail
})

serverToClient[socketEventRegistry.publicTestResponse.name]('PING RESP')
serverToClient[socketEventRegistry.privateTestResponse.name]('PING PRIVATE RESP')
serverToClient[socketEventRegistry.applicationError.name]({ detail: 'Unauthorized' })
serverToClient[socketEventRegistry.sessionExpired.name]({
  detail: 'session expired',
  reason: 'expired'
})

// @ts-expect-error Public test requests require string payloads.
clientToServer[socketEventRegistry.publicTestRequest.name](123)

// @ts-expect-error Session-init acknowledgements have a stable detail literal.
clientToServer[socketEventRegistry.sessionInit.name](undefined, (acknowledgement: { detail: 'changed' }) => acknowledgement)

// @ts-expect-error Undeclared client events are not part of the event map.
clientToServer['so.pub.undeclared']('payload')

// @ts-expect-error Application errors use the declared transport error shape.
serverToClient[socketEventRegistry.applicationError.name]({ message: 'Unauthorized' })
