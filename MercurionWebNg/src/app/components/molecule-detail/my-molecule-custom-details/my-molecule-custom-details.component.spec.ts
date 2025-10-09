import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MyMoleculeCustomDetailsComponent } from './my-molecule-custom-details.component';

describe('MyMoleculeCustomDetailsComponent', () => {
  let component: MyMoleculeCustomDetailsComponent;
  let fixture: ComponentFixture<MyMoleculeCustomDetailsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MyMoleculeCustomDetailsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MyMoleculeCustomDetailsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
