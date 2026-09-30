import { fakeAsync, TestBed, tick } from '@angular/core/testing';

import { RealtimeSocketService } from './realtime-socket.service';
import { socketEventRegistry } from '@mercurion/socket-contracts';
import { AuthSessionRepository } from '../auth-session-repository.service';

describe('RealtimeSocketService', () => {
  let service: RealtimeSocketService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(RealtimeSocketService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('removes exactly one observable listener when one owner unsubscribes', () => {
    const socket = (service as unknown as {
      socket: { listeners: (event: string) => unknown[] }
    }).socket;

    const first = service.onApplicationError().subscribe();
    const second = service.onApplicationError().subscribe();

    expect(socket.listeners(socketEventRegistry.applicationError.name)).toHaveSize(2);

    first.unsubscribe();
    expect(socket.listeners(socketEventRegistry.applicationError.name)).toHaveSize(1);

    second.unsubscribe();
    expect(socket.listeners(socketEventRegistry.applicationError.name)).toHaveSize(0);
  });

  it('keeps core ownership idempotent and releases it without broad off()', () => {
    const socket = (service as unknown as {
      socket: {
        listeners: (event: string) => unknown[]
        off: jasmine.Spy
      }
    }).socket;
    const off = spyOn(socket, 'off').and.callThrough();

    expect(socket.listeners('connect')).toHaveSize(1);
    expect(socket.listeners('disconnect')).toHaveSize(1);
    expect(socket.listeners('connect_error')).toHaveSize(1);

    service.ngOnDestroy();

    expect(socket.listeners('connect')).toHaveSize(0);
    expect(socket.listeners('disconnect')).toHaveSize(0);
    expect(socket.listeners('connect_error')).toHaveSize(0);
    expect(off).not.toHaveBeenCalledWith();
  });

  it('renews a private WS token before its 30 second expiry', fakeAsync(() => {
    const token = `header.${btoa(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 30 }))}.signature`;
    spyOn(TestBed.inject(AuthSessionRepository), 'getWsAccessToken').and.returnValue(token);
    const renew = spyOn(service, 'ensurePrivate').and.resolveTo();
    const internals = service as unknown as {
      mode: 'private'
      socket: { connected: boolean }
      onConnectCore: () => void
    };
    internals.mode = 'private';
    internals.socket.connected = true;
    internals.onConnectCore();

    tick(30_000);

    expect(renew).toHaveBeenCalledWith(undefined, { forceRefresh: true });
    internals.socket.connected = false;
    service.ngOnDestroy();
  }));
});
