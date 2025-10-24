import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CustomDetailsComponent } from './custom-details.component';

describe('MyMoleculeCustomDetailsComponent', () => {
  let component: CustomDetailsComponent;
  let fixture: ComponentFixture<CustomDetailsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CustomDetailsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CustomDetailsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
