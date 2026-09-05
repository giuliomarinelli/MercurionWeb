import { fakeAsync, tick } from '@angular/core/testing'

import { ChemistryCapabilityState } from '../chemistry-adapter.models'
import { createKetcherEditorAdapter } from './ketcher-editor.adapter'

describe('Ketcher editor adapter', () => {
  it('translates the vendor ready/export protocol into the application editor contract', async () => {
    const frame = document.createElement('iframe')
    document.body.appendChild(frame)
    const targetWindow = frame.contentWindow!
    const postMessage = spyOn(targetWindow, 'postMessage')
    const session = createKetcherEditorAdapter({
      resourceUrl: '/ketcher/index.html',
      targetOrigin: window.location.origin,
      toMolfile: async () => 'molfile'
    })
    const states: ChemistryCapabilityState[] = []
    session.onStateChange(state => states.push(state))
    session.attach(frame)

    window.dispatchEvent(new MessageEvent('message', {
      data: { type: 'ketcherReady' },
      source: targetWindow
    }))
    await session.setStructure('CC')
    const exported = session.exportStructure()
    await new Promise(resolve => setTimeout(resolve, 0))
    window.dispatchEvent(new MessageEvent('message', {
      data: { type: 'smiles', payload: 'CC' },
      source: targetWindow
    }))

    await expectAsync(exported).toBeResolvedTo('CC')
    expect(states.map(state => state.status)).toEqual(['loading', 'ready'])
    expect(postMessage).toHaveBeenCalled()
    const [message, targetOrigin] = postMessage.calls.first().args as unknown[]
    expect(message).toEqual({ type: 'setMolecule', payload: 'molfile' })
    expect(targetOrigin).toBe(window.location.origin)
    session.dispose()
    frame.remove()
  })

  it('reports a typed recoverable unavailable state when readiness times out', fakeAsync(() => {
    const frame = document.createElement('iframe')
    document.body.appendChild(frame)
    const session = createKetcherEditorAdapter({
      resourceUrl: '/ketcher/index.html',
      targetOrigin: window.location.origin,
      toMolfile: async () => undefined
    })
    let latestState: ChemistryCapabilityState = { status: 'loading' }
    session.onStateChange(state => {
      latestState = state
    })
    session.attach(frame)

    tick(15_000)

    expect(latestState.status).toBe('unavailable')
    expect(latestState.error?.code).toBe('initialization-timeout')
    expect(latestState.error?.recoverable).toBeTrue()
    session.dispose()
    frame.remove()
  }))
})
