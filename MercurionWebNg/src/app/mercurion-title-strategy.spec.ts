import { TestBed } from '@angular/core/testing';

import { MercurionTitleStrategy } from './mercurion-title-strategy';

describe('MercurionTitleStrategyService', () => {
  let service: MercurionTitleStrategy;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(MercurionTitleStrategy);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
