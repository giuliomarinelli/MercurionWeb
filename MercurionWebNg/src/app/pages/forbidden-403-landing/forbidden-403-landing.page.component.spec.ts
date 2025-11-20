import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Forbidden403LandingPageComponent } from './forbidden-403-landing.page.component';

describe('Forbidden403LandingPageComponent', () => {
  let component: Forbidden403LandingPageComponent;
  let fixture: ComponentFixture<Forbidden403LandingPageComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Forbidden403LandingPageComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Forbidden403LandingPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
