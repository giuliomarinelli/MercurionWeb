import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DescriptorCardsGridComponent } from './descriptor-cards-grid.component';

describe('DescriptorCardsGridComponent', () => {
  let component: DescriptorCardsGridComponent;
  let fixture: ComponentFixture<DescriptorCardsGridComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DescriptorCardsGridComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DescriptorCardsGridComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
