import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MyMoleculeCollectionsComponent } from './my-molecule-collections.component';

describe('MyMoleculeCollectionsComponent', () => {
  let component: MyMoleculeCollectionsComponent;
  let fixture: ComponentFixture<MyMoleculeCollectionsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MyMoleculeCollectionsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MyMoleculeCollectionsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
