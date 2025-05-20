import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NotebookEditComponent } from './edit.component';

describe('EditComponent', () => {
  let component: NotebookEditComponent;
  let fixture: ComponentFixture<NotebookEditComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NotebookEditComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(NotebookEditComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
