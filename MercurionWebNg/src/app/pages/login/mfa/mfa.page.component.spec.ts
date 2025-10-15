import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MfaPageComponent } from './mfa.page.component';

describe('MfaComponent', () => {
  let component: MfaPageComponent;
  let fixture: ComponentFixture<MfaPageComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MfaPageComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MfaPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
