import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NotebookLandingComponent } from './notebook-landing.component';

describe('NotebookLandingComponent', () => {
  let component: NotebookLandingComponent;
  let fixture: ComponentFixture<NotebookLandingComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NotebookLandingComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(NotebookLandingComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
