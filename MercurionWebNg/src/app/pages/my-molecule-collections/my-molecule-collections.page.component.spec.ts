import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MyMoleculeCollectionsPageComponent } from './my-molecule-collections.page.component';

describe('MyMoleculeCollectionsComponent', () => {
  let component: MyMoleculeCollectionsPageComponent;
  let fixture: ComponentFixture<MyMoleculeCollectionsPageComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MyMoleculeCollectionsPageComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MyMoleculeCollectionsPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
