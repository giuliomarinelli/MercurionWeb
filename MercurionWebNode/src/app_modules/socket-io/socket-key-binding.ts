import type { Socket } from 'socket.io'
import type { JwtToolsService } from '../auth/services/jwt-tools.service'
import { JwtKeyRuntimeError } from '../auth/keys/jwt-key-runtime-error'

const bindings = new WeakMap<Socket, { release: (() => void) | null }>()

/** A single disconnect listener per socket; reauthentication replaces the old admission watch. */
export async function bindSocketKey(client: Socket, token: string, jwtTools: JwtToolsService): Promise<void> {
    let denied = false
    const release = await jwtTools.watchVerifiedConnection(client.id, token, () => {
        denied = true
        // Initiate room removal first; do not let an async adapter delay transport disconnection.
        for (const room of client.rooms) if (/^ws_(?:user|session|client):/.test(room)) {
            try { void Promise.resolve(client.leave(room)).catch(() => undefined) } catch { /* Disconnect still follows. */ }
        }
        delete client.data.userId; delete client.data.sessionId; delete client.data.scopes; delete client.data.clientInstanceId
        client.disconnect(true)
    })
    if (denied || client.connected === false) {
        release?.()
        throw new JwtKeyRuntimeError('KEY_NOT_ADMITTED')
    }
    if (release === null) return // Ordinary legacy bootstrap has no key-registry watch.
    let binding = bindings.get(client)
    if (!binding) {
        binding = { release: null }
        bindings.set(client, binding)
        client.once('disconnect', () => { bindings.get(client)?.release?.(); bindings.delete(client) })
    }
    binding.release?.()
    binding.release = release
}
