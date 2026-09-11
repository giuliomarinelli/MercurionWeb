import { TestBed } from '@angular/core/testing';
import { ShellLayoutService } from './shell-layout.service';

describe('ShellLayoutService', () => {
  let service: ShellLayoutService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ShellLayoutService);
  });

  it('keeps shell geometry independent from scroll operations', () => {
    expect(service.headerHeight()).toBe(0);
    service.setHeaderHeight(72);
    expect(service.headerHeight()).toBe(72);
  });

  it('publishes semantic off-canvas close requests without numeric API consumers', () => {
    expect(service.closeOffCanvasRequest()).toBe(0);
    service.requestCloseOffCanvas();
    expect(service.closeOffCanvasRequest()).toBe(1);
  });
});
