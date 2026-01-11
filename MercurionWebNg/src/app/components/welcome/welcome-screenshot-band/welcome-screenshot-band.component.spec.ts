import { ComponentFixture, TestBed } from '@angular/core/testing';

import { WelcomeScreenshotBandComponent } from './welcome-screenshot-band.component';

describe('WelcomeScreenshotBandComponent', () => {
  let component: WelcomeScreenshotBandComponent;
  let fixture: ComponentFixture<WelcomeScreenshotBandComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [WelcomeScreenshotBandComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(WelcomeScreenshotBandComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
