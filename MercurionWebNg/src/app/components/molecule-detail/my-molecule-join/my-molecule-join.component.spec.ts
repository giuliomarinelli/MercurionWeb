import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MyMoleculeJoinComponent } from './my-molecule-join.component';

describe('MyMoleculeJoinComponent', () => {
  let component: MyMoleculeJoinComponent;
  let fixture: ComponentFixture<MyMoleculeJoinComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MyMoleculeJoinComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MyMoleculeJoinComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
