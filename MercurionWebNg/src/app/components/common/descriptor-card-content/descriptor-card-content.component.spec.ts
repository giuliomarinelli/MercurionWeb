import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DescriptorCardContentComponent } from './descriptor-card-content.component';

describe('DescriptorCardContentComponent', () => {
  let component: DescriptorCardContentComponent;
  let fixture: ComponentFixture<DescriptorCardContentComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DescriptorCardContentComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DescriptorCardContentComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
