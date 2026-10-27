import { EventEmitter } from 'node:events'
import { bindSocketKey } from './socket-key-binding'

describe('Socket key admission binding', () => {
    function fixture() {
        const events = new EventEmitter()
        const rooms = new Set(['socket-a', 'ws_user:user-a', 'ws_session:session-a', 'ws_client:client-a'])
        const leave = jest.fn((room: string) => { rooms.delete(room) })
        const socket = { id: 'socket-a', connected: true, rooms, leave,
            data: { userId: 'user-a', sessionId: 'session-a', clientInstanceId: 'client-a', scopes: ['read'] },
            disconnect: jest.fn(() => { socket.connected = false; events.emit('disconnect') }), once: events.once.bind(events) }
        let deny!: () => void
        const release = jest.fn()
        const service = { watchVerifiedConnection: jest.fn(async (_id: string, _token: string, callback: () => void) => { deny = callback; return release }) }
        return { socket, events, service, release, deny: () => deny() }
    }

    it('removes all private rooms before disconnect, without invalidating a Redis session', async () => {
        const f = fixture()
        await bindSocketKey(f.socket as never, 'verified-token', f.service as never)
        f.deny()
        expect(f.socket.rooms).toEqual(new Set(['socket-a']))
        expect(f.socket.data).toEqual({})
        expect(f.socket.disconnect).toHaveBeenCalledWith(true)
        expect(f.release).toHaveBeenCalledTimes(1)
    })

    it('keeps a single cleanup listener across repeated session-init events', async () => {
        const f = fixture()
        await bindSocketKey(f.socket as never, 'verified-token', f.service as never)
        await bindSocketKey(f.socket as never, 'verified-token', f.service as never)
        expect(f.events.listenerCount('disconnect')).toBe(1)
        f.socket.disconnect()
        expect(f.release).toHaveBeenCalledTimes(2)
    })

    it('disconnects even if room removal hangs or fails', async () => {
        const f = fixture()
        f.socket.leave.mockImplementation(() => { throw new Error('Adapter unavailable') })
        await bindSocketKey(f.socket as never, 'verified-token', f.service as never)
        f.deny()
        expect(f.socket.disconnect).toHaveBeenCalledWith(true)
    })

    it('does not retain a watch when the connection closes during registration', async () => {
        const f = fixture()
        f.service.watchVerifiedConnection.mockImplementationOnce(async () => { f.socket.connected = false; return f.release })
        await expect(bindSocketKey(f.socket as never, 'verified-token', f.service as never)).rejects.toThrow()
        expect(f.release).toHaveBeenCalled()
        expect(f.events.listenerCount('disconnect')).toBe(0)
    })
})
