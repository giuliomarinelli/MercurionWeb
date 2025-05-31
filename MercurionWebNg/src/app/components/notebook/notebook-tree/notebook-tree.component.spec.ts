import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NotebookTreeComponent } from './notebook-tree.component';

describe('NotebookTreeComponent', () => {
  let component: NotebookTreeComponent;
  let fixture: ComponentFixture<NotebookTreeComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NotebookTreeComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(NotebookTreeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
