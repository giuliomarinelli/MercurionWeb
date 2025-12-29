import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TermsAndPoliciesPageComponent } from './terms-and-policies.page.component';

describe('TermsAndPoliciesPageComponent', () => {
  let component: TermsAndPoliciesPageComponent;
  let fixture: ComponentFixture<TermsAndPoliciesPageComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TermsAndPoliciesPageComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TermsAndPoliciesPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
