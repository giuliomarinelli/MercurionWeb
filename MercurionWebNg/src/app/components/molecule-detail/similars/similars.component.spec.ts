import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SimilarsComponent } from './similars.component';

describe('SimilarsComponent', () => {
  let component: SimilarsComponent;
  let fixture: ComponentFixture<SimilarsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SimilarsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SimilarsComponent);
    fixture.componentRef.setInput('molecules', []);
    fixture.componentRef.setInput('onlyKnown', false);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
