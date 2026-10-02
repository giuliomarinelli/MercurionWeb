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
    fixture.componentRef.setInput('cardsData', []);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('keeps the historical two-column default while allowing a compact single-column layout', () => {
    const grid = fixture.nativeElement.querySelector('.grid') as HTMLElement;

    expect(component.columns()).toBe(2);
    expect(component.density()).toBe('default');
    expect(grid.classList.contains('lg:grid-cols-2')).toBeTrue();

    fixture.componentRef.setInput('columns', 1);
    fixture.componentRef.setInput('density', 'compact');
    fixture.detectChanges();

    expect(grid.classList.contains('lg:grid-cols-2')).toBeFalse();
    expect(grid.classList.contains('gap-3')).toBeTrue();
  });
});
