import { TestBed } from '@angular/core/testing';

import { SearchContextService } from './search-context.service';

describe('SearchContextService', () => {
  let service: SearchContextService;

  beforeEach(() => {
    jasmine.clock().install();
    TestBed.configureTestingModule({});
    service = TestBed.inject(SearchContextService);
  });

  afterEach(() => jasmine.clock().uninstall());

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('does not mount after close cancels the pending show', () => {
    service.open();
    service.close();
    jasmine.clock().tick(10);

    expect(service.isMounted()).toBeTrue();
    expect(service.isVisible()).toBeFalse();

    jasmine.clock().tick(290);
    expect(service.isMounted()).toBeFalse();
    expect(service.isVisible()).toBeFalse();
  });

  it('cancels unmount when reopened and tears down pending work', () => {
    service.open();
    jasmine.clock().tick(10);
    service.close();
    jasmine.clock().tick(100);
    service.open();
    jasmine.clock().tick(10);

    expect(service.isMounted()).toBeTrue();
    expect(service.isVisible()).toBeTrue();

    service.close();
    TestBed.resetTestingModule();
    jasmine.clock().tick(300);
    expect(service.isMounted()).toBeTrue();
    expect(service.isVisible()).toBeFalse();
  });
});
