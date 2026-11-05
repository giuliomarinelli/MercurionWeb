import { fakeAsync, flushMicrotasks, tick } from '@angular/core/testing'

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
      origin: window.location.origin,
      source: targetWindow
    }))

    const setStructure = session.setStructure('CC')
    await new Promise(resolve => setTimeout(resolve, 0))
    window.dispatchEvent(new MessageEvent('message', {
      data: { ...postMessage.calls.mostRecent().args[0], type: 'moleculeSet' },
      origin: window.location.origin,
      source: targetWindow
    }))
    await setStructure

    const exported = session.exportStructure()
    await new Promise(resolve => setTimeout(resolve, 0))
    window.dispatchEvent(new MessageEvent('message', {
      data: { ...postMessage.calls.mostRecent().args[0], type: 'smiles', payload: 'CC' },
      origin: window.location.origin,
      source: targetWindow
    }))

    await expectAsync(exported).toBeResolvedTo('CC')
    expect(states.map(state => state.status)).toEqual(['loading', 'ready'])
    expect(postMessage).toHaveBeenCalled()
    const [message, targetOrigin] = postMessage.calls.first().args as unknown[]
    expect(message).toEqual(jasmine.objectContaining({ type: 'setMolecule', payload: 'molfile', sessionId: jasmine.any(String), requestId: jasmine.any(Number) }))
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

  it('ignores timed-out responses and foreign origins instead of resolving a later export', fakeAsync(() => {
    const frame = document.createElement('iframe')
    document.body.appendChild(frame)
    const targetWindow = frame.contentWindow!
    const post = spyOn(targetWindow, 'postMessage')
    const session = createKetcherEditorAdapter({ resourceUrl: '/ketcher/index.html', targetOrigin: window.location.origin, toMolfile: async () => '' })
    session.attach(frame)
    const reply = (data: unknown, origin = window.location.origin) => window.dispatchEvent(new MessageEvent('message', { data, origin, source: targetWindow }))
    reply({ type: 'ketcherReady' })
    let timedOut = false
    void session.exportStructure().catch(() => { timedOut = true })
    flushMicrotasks()
    const first = post.calls.mostRecent().args[0]
    tick(3000); flushMicrotasks(); expect(timedOut).toBeTrue()
    let value: string | undefined
    void session.exportStructure().then(result => { value = result })
    flushMicrotasks()
    const second = post.calls.mostRecent().args[0]
    reply({ ...first, type: 'smiles', payload: 'old' })
    reply({ ...second, type: 'smiles', payload: 'foreign' }, 'https://foreign.test')
    flushMicrotasks(); expect(value).toBeUndefined()
    reply({ ...second, type: 'smiles', payload: 'CC' })
    flushMicrotasks(); expect(value).toBe('CC')
    session.dispose(); frame.remove()
  }))
})
