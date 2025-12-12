import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RedirectToLoginComponent } from './redirect-to-login.component';

describe('RedirectToLoginComponentComponent', () => {
  let component: RedirectToLoginComponent;
  let fixture: ComponentFixture<RedirectToLoginComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RedirectToLoginComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(RedirectToLoginComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
