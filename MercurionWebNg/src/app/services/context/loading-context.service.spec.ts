import { TestBed } from '@angular/core/testing';

import { LoadingContextService } from './loading-context.service';

describe('LoadingContextService', () => {
  let service: LoadingContextService;

  beforeEach(() => {
    jasmine.clock().install();
    TestBed.configureTestingModule({});
    service = TestBed.inject(LoadingContextService);
  });

  afterEach(() => jasmine.clock().uninstall());

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('cancels stale transitions when loading reverses rapidly', () => {
    service.start();
    jasmine.clock().tick(5);
    service.stop();
    jasmine.clock().tick(5);
    service.start();
    jasmine.clock().tick(10);

    expect(service.isMounted()).toBeTrue();
    expect(service.isVisible()).toBeTrue();

    service.stop();
    jasmine.clock().tick(300);

    expect(service.isMounted()).toBeFalse();
    expect(service.isVisible()).toBeFalse();
  });

  it('keeps repeated intents deterministic', () => {
    service.start();
    service.start();
    jasmine.clock().tick(10);
    expect(service.isVisible()).toBeTrue();

    service.stop();
    service.stop();
    jasmine.clock().tick(299);
    expect(service.isMounted()).toBeTrue();
    jasmine.clock().tick(1);
    expect(service.isMounted()).toBeFalse();
    expect(service.isVisible()).toBeFalse();
  });
});
