import { TestBed } from '@angular/core/testing';

import {
  classifyCrossTabAuthStorageEvent,
  SessionSyncService
} from './session-sync.service';
import { RealtimeSocketService } from './socket.IO/realtime-socket.service';
import { socketEventRegistry } from '@mercurion/socket-contracts';

describe('SessionSyncService', () => {
  let service: SessionSyncService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(SessionSyncService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('classifies login marker changes as session hints, not credentials', () => {
    const loggedIn = classifyCrossTabAuthStorageEvent(new StorageEvent('storage', {
      key: 'login',
      oldValue: null,
      newValue: 'AB',
      storageArea: localStorage
    }))
    const loggedOut = classifyCrossTabAuthStorageEvent(new StorageEvent('storage', {
      key: 'login',
      oldValue: 'AB',
      newValue: null,
      storageArea: localStorage
    }))

    expect(loggedIn).toEqual({ kind: 'session-changed', key: 'login', authenticated: true })
    expect(loggedOut).toEqual({ kind: 'session-changed', key: 'login', authenticated: false })
  })

  it('keeps websocket token changes on the credential-refresh path', () => {
    expect(classifyCrossTabAuthStorageEvent(new StorageEvent('storage', {
      key: 'ws_accessToken',
      oldValue: 'old',
      newValue: 'new',
      storageArea: localStorage
    }))).toEqual({ kind: 'ws-credential-changed', key: 'ws_accessToken' })
  })

  it('ignores unrelated storage keys and other storage areas', () => {
    expect(classifyCrossTabAuthStorageEvent(new StorageEvent('storage', {
      key: 'theme',
      newValue: 'dark',
      storageArea: localStorage
    }))).toBeNull()
    expect(classifyCrossTabAuthStorageEvent(new StorageEvent('storage', {
      key: 'login',
      newValue: 'AB',
      storageArea: sessionStorage
    }))).toBeNull()
  })
  it('releases all owned realtime subscriptions on destruction', () => {
    const socket = (TestBed.inject(RealtimeSocketService) as unknown as {
      socket: { listeners: (event: string) => unknown[] }
    }).socket;

    expect(socket.listeners('connect')).toHaveSize(2);
    expect(socket.listeners('disconnect')).toHaveSize(2);
    expect(socket.listeners(socketEventRegistry.applicationError.name)).toHaveSize(1);
    expect(socket.listeners(socketEventRegistry.sessionExpired.name)).toHaveSize(1);

    service.ngOnDestroy()

    expect(socket.listeners('connect')).toHaveSize(1);
    expect(socket.listeners('disconnect')).toHaveSize(1);
    expect(socket.listeners(socketEventRegistry.applicationError.name)).toHaveSize(0);
    expect(socket.listeners(socketEventRegistry.sessionExpired.name)).toHaveSize(0);
  })
});
