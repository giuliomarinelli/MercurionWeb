import { ComponentFixture, TestBed } from '@angular/core/testing';

import { WelcomeCloudLogoComponent } from './welcome-cloud-logo.component';

describe('WelcomeCloudLogoComponent', () => {
  let component: WelcomeCloudLogoComponent;
  let fixture: ComponentFixture<WelcomeCloudLogoComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [WelcomeCloudLogoComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(WelcomeCloudLogoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
