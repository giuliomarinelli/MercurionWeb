import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NotFound404LandingPageComponent } from './not-found-404-landing.page.component';

describe('NotFound404TemplateComponent', () => {
  let component: NotFound404LandingPageComponent;
  let fixture: ComponentFixture<NotFound404LandingPageComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NotFound404LandingPageComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(NotFound404LandingPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
