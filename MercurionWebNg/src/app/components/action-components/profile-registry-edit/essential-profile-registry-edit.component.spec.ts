import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EssentialProfileRegistryEditComponent } from './essential-profile-registry-edit.component';

describe('ProfileRegistryEditComponent', () => {
  let component: EssentialProfileRegistryEditComponent;
  let fixture: ComponentFixture<EssentialProfileRegistryEditComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EssentialProfileRegistryEditComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(EssentialProfileRegistryEditComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
