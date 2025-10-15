import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NotebookEditPageComponent } from './edit.page.component';

describe('EditComponent', () => {
  let component: NotebookEditPageComponent;
  let fixture: ComponentFixture<NotebookEditPageComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NotebookEditPageComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(NotebookEditPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
