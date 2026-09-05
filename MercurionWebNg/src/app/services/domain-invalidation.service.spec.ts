import { TestBed } from '@angular/core/testing';
import { DomainInvalidationService } from './domain-invalidation.service';

describe('DomainInvalidationService', () => {
  it('publishes typed payloads, including repeated events', () => {
    TestBed.configureTestingModule({});
    const service = TestBed.inject(DomainInvalidationService);
    const first = { domain: 'molecule-collection' as const, action: 'molecules-added' as const, collectionId: 'c-1' };
    service.publish(first);
    expect(service.last()).toEqual(first);
    service.publish({ ...first });
    expect(service.last()).toEqual(first);
  });

  it('preserves domain identity so consumers can isolate unrelated changes', () => {
    TestBed.configureTestingModule({});
    const service = TestBed.inject(DomainInvalidationService);
    service.publish({ domain: 'molecule', action: 'collections-bound', moleculeId: 'm-1' });
    expect(service.last()?.domain).toBe('molecule');
    expect(service.last()?.domain).not.toBe('molecule-collection');
  });
});
