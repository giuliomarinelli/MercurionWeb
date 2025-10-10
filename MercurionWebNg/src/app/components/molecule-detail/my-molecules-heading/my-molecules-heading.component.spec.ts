import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MyMoleculesHeadingComponent } from './my-molecules-heading.component';

describe('MyMoleculesHeadingComponent', () => {
  let component: MyMoleculesHeadingComponent;
  let fixture: ComponentFixture<MyMoleculesHeadingComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MyMoleculesHeadingComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MyMoleculesHeadingComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
