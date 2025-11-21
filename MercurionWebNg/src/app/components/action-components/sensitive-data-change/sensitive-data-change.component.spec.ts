import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SensitiveDataChangeComponent } from './sensitive-data-change.component';

describe('SensitiveDataChangeComponent', () => {
  let component: SensitiveDataChangeComponent;
  let fixture: ComponentFixture<SensitiveDataChangeComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SensitiveDataChangeComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SensitiveDataChangeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
