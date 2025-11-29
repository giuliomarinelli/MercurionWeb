import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SsoPageComponent } from './sso.page.component';

describe('SsoPageComponent', () => {
  let component: SsoPageComponent;
  let fixture: ComponentFixture<SsoPageComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SsoPageComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SsoPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
