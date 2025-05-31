import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NotebookTocComponent } from './notebook-roc.component';

describe('NotebookTreeIndexComponent', () => {
  let component: NotebookTocComponent;
  let fixture: ComponentFixture<NotebookTocComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NotebookTocComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(NotebookTocComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
