import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { of } from 'rxjs';
import { NotebookEditPageComponent } from './edit.page.component';
import { NotebookService } from '../../../services/graphql/notebook.service';

describe('NotebookEditPageComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NotebookEditPageComponent],
      providers: [
        {
          provide: ActivatedRoute,
          useValue: {
            paramMap: of(convertToParamMap({ notebookId: '01990f17-0ff8-7b75-83d7-2c995ae7e2b1' })),
            queryParamMap: of(convertToParamMap({})),
            data: of({ notebookMode: 'read' }),
          },
        },
        {
          provide: NotebookService,
          useValue: {
            getNotebookById: () => of(null),
          },
        },
      ],
    }).compileComponents();
  });

  it('renders a recoverable error for a missing notebook', () => {
    const fixture = TestBed.createComponent(NotebookEditPageComponent);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[role="alert"]')).not.toBeNull();
    fixture.destroy();
  });
});
