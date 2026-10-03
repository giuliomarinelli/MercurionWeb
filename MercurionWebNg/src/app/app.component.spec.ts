import { TestBed } from '@angular/core/testing';
import { AppComponent } from './app.component';
import { RealtimeStateSyncService } from './services/realtime-state-sync.service';
import { DOCUMENT } from '@angular/common';
import { ScrollContextService } from './services/context/scroll-context.service';

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

  it('registers the document as the application scroll root', () => {
    TestBed.createComponent(AppComponent);
    const doc = TestBed.inject(DOCUMENT);
    const scroll = TestBed.inject(ScrollContextService);
    expect(scroll.scrollRootRef()?.nativeElement).toBe(doc.scrollingElement as HTMLElement ?? doc.documentElement);
    expect(scroll.intersectionRoot()).toBeNull();
  });
});
