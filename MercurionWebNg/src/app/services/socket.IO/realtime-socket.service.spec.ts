import { TestBed } from '@angular/core/testing';

import { RealtimeSocketService } from './realtime-socket.service';
import { socketEventRegistry } from '@mercurion/socket-contracts';

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
});
