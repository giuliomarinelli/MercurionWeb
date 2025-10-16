import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AllMyMoleculesPageComponent } from './all-my-molecules.page.component';

describe('AllMyMoleculesPageComponent', () => {
  let component: AllMyMoleculesPageComponent;
  let fixture: ComponentFixture<AllMyMoleculesPageComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AllMyMoleculesPageComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AllMyMoleculesPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
