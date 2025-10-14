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
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
