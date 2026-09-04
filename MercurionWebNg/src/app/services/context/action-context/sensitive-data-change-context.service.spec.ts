import { TestBed } from '@angular/core/testing';

import { SensitiveDataChangeContextService } from './sensitive-data-change-context.service';
import { ActionOverlayContextService } from './action-overlay-context.service';

describe('SensitiveDataChangeContextService', () => {
  let service: SensitiveDataChangeContextService;
  let overlay: ActionOverlayContextService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(SensitiveDataChangeContextService);
    overlay = TestBed.inject(ActionOverlayContextService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('reflects only the current session innerScope across reopenings', () => {
    overlay.open('SensitiveDataChange', { innerScope: 'ChangeEmail' });
    expect(service.innerScope()).toBe('ChangeEmail');

    overlay.close();
    overlay.open('SensitiveDataChange', { innerScope: 'ChangePhone' });
    expect(service.innerScope()).toBe('ChangePhone');
  });

  it('does not leak into an unrelated scope opening', () => {
    overlay.open('SensitiveDataChange', { innerScope: 'ChangeEmail' });
    overlay.close();
    overlay.open('CreateCollection');

    expect(service.innerScope()).toBe('');
  });
});
