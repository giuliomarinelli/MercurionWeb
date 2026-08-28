import { ComponentFixture, TestBed } from '@angular/core/testing';

import { WelcomeFeatureGridComponent } from './welcome-feature-grid.component';

describe('WelcomeFeatureGridComponent', () => {
  let component: WelcomeFeatureGridComponent;
  let fixture: ComponentFixture<WelcomeFeatureGridComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [WelcomeFeatureGridComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(WelcomeFeatureGridComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
