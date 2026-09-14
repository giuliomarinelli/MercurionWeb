import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MoleculeBadgeComponent } from './molecule-badge.component';

describe('MoleculeBadgeComponent', () => {
  let component: MoleculeBadgeComponent;
  let fixture: ComponentFixture<MoleculeBadgeComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MoleculeBadgeComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MoleculeBadgeComponent);
    fixture.componentRef.setInput('name', 'Test molecule');
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('renders the current input value', () => {
    expect(fixture.nativeElement.textContent).toContain('Test molecule');
    expect(fixture.nativeElement.querySelector('button')?.getAttribute('aria-label'))
      .toBe('Molecola Test molecule');
  });
});
