import { ComponentFixture, TestBed } from '@angular/core/testing';

import { WelcomeSecondaryFeaturesComponent } from './welcome-secondary-features.component';

describe('WelcomeSecondaryFeaturesComponent', () => {
  let component: WelcomeSecondaryFeaturesComponent;
  let fixture: ComponentFixture<WelcomeSecondaryFeaturesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [WelcomeSecondaryFeaturesComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(WelcomeSecondaryFeaturesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
