import { TestBed } from '@angular/core/testing';
import { ActionOverlayContextService } from './action-overlay-context.service';



describe('SaveToCollectionContextService', () => {
  let service: ActionOverlayContextService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ActionOverlayContextService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
