import { TestBed } from '@angular/core/testing';
import { AppComponent } from './app.component';
import { RealtimeStateSyncService } from './services/realtime-state-sync.service';

describe('AppComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AppComponent],
      providers: [
        {
          provide: RealtimeStateSyncService,
          useValue: { start: jasmine.createSpy(), stop: jasmine.createSpy() }
        }
      ],
    }).compileComponents();
  });

  it('should create the application shell', () => {
    const fixture = TestBed.createComponent(AppComponent);
    expect(fixture.componentInstance).toBeTruthy();
  });
});
