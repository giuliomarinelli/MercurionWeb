import { map, Observable, tap } from "rxjs";
import { ChapterTree, NotebookTree, PageTree, SectionTree } from "../../Models/graphql/notebook/notebook.models";
import { Apollo, gql } from "apollo-angular";
import { computed, Injectable, signal } from "@angular/core";
import { GqlRes } from "../../Models/graphql/res.gql";
import { extractGqlData } from "./graphql-helpers/v1/extract-gql-data.helper";
import {
  DeleteChapterDocument,
  DeleteChapterMutation,
  DeleteChapterMutationVariables,
  DeleteLabNotebookDocument,
  DeleteLabNotebookMutation,
  DeleteLabNotebookMutationVariables,
  DeleteSectionDocument,
  DeleteSectionMutation,
  DeleteSectionMutationVariables,
} from "../../generated/graphql";



@Injectable({ providedIn: 'root' })
export class NotebookService {
  private _notebooks = signal<NotebookTree[]>([]);
  private _loading = signal<boolean>(false);

  readonly notebooks = computed(() => this._notebooks());
  readonly loading = computed(() => this._loading());

  constructor(private apollo: Apollo) { }

  // NOTEBOOK CRUD

  getAllNotebooks(): Observable<NotebookTree[]> {
    this._loading.set(true);
    return this.apollo
      .watchQuery<{ labNotebooksByUser: NotebookTree[] }>({
        query: gql`
          query GetAllNotebooks {
            labNotebooksByUser {
              id
              title
              chapters {
                id
                title
                sections {
                  id
                  title
                  pages {
                    id,
                    title
                  }
                }
              }
            }
          }
        `,
        fetchPolicy: 'network-only',
      })
      .valueChanges.pipe(
        map(res => extractGqlData(res, 'labNotebooksByUser')),
        tap(nbs => {
          this._notebooks.set(nbs)
          this._loading.set(false)
        })
      );
  }

  getNotebookById(id: string): Observable<NotebookTree> {
    return this.apollo
      .watchQuery<{ labNotebook: NotebookTree }>({
        query: gql`
          query GetNotebookDetail($id: ID!) {
            labNotebook(id: $id) {
              id
              title
              chapters {
                id
                title
                sections {
                  id
                  title
                  pages {
                    id
                    title
                    content
                  }
                }
              }
            }
          }
        `,
        variables: { id },
        fetchPolicy: 'network-only',
      })
      .valueChanges.pipe(map(res => extractGqlData(res, 'labNotebook')));
  }

  getChapterById(id: string): Observable<ChapterTree | null> {
    return this.apollo
      .watchQuery<{ chapterById: ChapterTree | null }>({
        query: gql`
          query GetChapterById($id: ID!) {
            chapterById(id: $id) {
              id
              title
            }
          }
        `,
        variables: { id },
        fetchPolicy: 'network-only',
      })
      .valueChanges.pipe(map(res => extractGqlData(res, 'chapterById')));
  }

  getSectionById(id: string): Observable<SectionTree | null> {
    return this.apollo
      .watchQuery<{ chapterById: SectionTree | null }>({
        query: gql`
          query GetSectionById($id: ID!) {
            sectionById(id: $id) {
              id
              title
            }
          }
        `,
        variables: { id },
        fetchPolicy: 'network-only',
      })
      .valueChanges.pipe(map(res => extractGqlData(res, 'sectionById')));
  }

  getPageByIdHeader(id: string): Observable<PageTree | null> {
    return this.apollo
      .watchQuery<{ chapterById: PageTree | null }>({
        query: gql`
          query GetPageHeaderById($id: ID!) {
            pageById(id: $id) {
              id
              title
            }
          }
        `,
        variables: { id },
        fetchPolicy: 'network-only',
      })
      .valueChanges.pipe(map(res => extractGqlData(res, 'pageById')));
  }



  createNotebook(title: string): Observable<NotebookTree> {
    return this.apollo
      .mutate<{ createLabNotebook: NotebookTree }>({
        mutation: gql`
          mutation CreateLabNotebook($title: String!) {
            createLabNotebook(title: $title) {
              id
              title
              chapters { id title sections { id title } }
            }
          }
        `,
        variables: { title },
      })
      .pipe(map(res => extractGqlData(res, 'createLabNotebook')));
  }

  updateNotebook(id: string, title: string): Observable<NotebookTree> {
    return this.apollo
      .mutate<{ updateLabNotebook: NotebookTree }>({
        mutation: gql`
          mutation UpdateLabNotebook($input: UpdateLabNotebookInput!) {
            updateLabNotebook(input: $input) {
              id
              title
              chapters { id title sections { id title } }
            }
          }
        `,
        variables: { input: { id, title } },
      })
      .pipe(map(res => extractGqlData(res, 'updateLabNotebook')));
  }

  deleteNotebook(id: string): Observable<boolean> {
    return this.apollo
      .mutate<DeleteLabNotebookMutation, DeleteLabNotebookMutationVariables>({
        mutation: DeleteLabNotebookDocument,
        variables: { id },
      })
      .pipe(map(res => extractGqlData<DeleteLabNotebookMutation, 'deleteLabNotebook'>(res, 'deleteLabNotebook')));
  }

  // CAPITOLO CRUD

  createChapter(notebookId: string, title: string): Observable<ChapterTree> {
    return this.apollo
      .mutate<{ createChapter: ChapterTree }>({
        mutation: gql`
          mutation CreateChapter($input: CreateChapterInput!) {
            createChapter(input: $input) {
              id
              title
              sections { id title }
            }
          }
        `,
        variables: { input: { notebookId, title } },
      })
      .pipe(map(res => extractGqlData(res, 'createChapter')));
  }

  updateChapter(id: string, title: string): Observable<ChapterTree> {
    return this.apollo
      .mutate<{ updateChapter: ChapterTree }>({
        mutation: gql`
          mutation UpdateChapter($input: UpdateChapterInput!) {
            updateChapter(input: $input) {
              id
              title
              sections { id title }
            }
          }
        `,
        variables: { input: { id, title } },
      })
      .pipe(map(res => extractGqlData(res, 'updateChapter')));
  }

  deleteChapter(id: string): Observable<boolean> {
    return this.apollo
      .mutate<DeleteChapterMutation, DeleteChapterMutationVariables>({
        mutation: DeleteChapterDocument,
        variables: { id },
      })
      .pipe(map(res => extractGqlData<DeleteChapterMutation, 'deleteChapter'>(res, 'deleteChapter')));
  }

  // SEZIONE CRUD

  createSection(chapterId: string, title: string): Observable<SectionTree> {
    return this.apollo
      .mutate<{ createSection: SectionTree }>({
        mutation: gql`
          mutation CreateSection($input: CreateSectionInput!) {
            createSection(input: $input) {
              id
              title
              pages { id title }
            }
          }
        `,
        variables: { input: { chapterId, title } },
      })
      .pipe(map(res => extractGqlData(res, 'createSection')));
  }

  updateSection(id: string, title: string): Observable<SectionTree> {
    return this.apollo
      .mutate<{ updateSection: SectionTree }>({
        mutation: gql`
          mutation UpdateSection($input: UpdateSectionInput!) {
            updateSection(input: $input) {
              id
              title
              pages { id title }
            }
          }
        `,
        variables: { input: { id, title } },
      })
      .pipe(map(res => extractGqlData(res, 'updateSection')));
  }

  deleteSection(id: string): Observable<boolean> {
    return this.apollo
      .mutate<DeleteSectionMutation, DeleteSectionMutationVariables>({
        mutation: DeleteSectionDocument,
        variables: { id },
      })
      .pipe(map(res => extractGqlData<DeleteSectionMutation, 'deleteSection'>(res, 'deleteSection')));
  }

  // PAGINA CRUD

  createPage(sectionId: string, title: string, content: string): Observable<PageTree> {
    return this.apollo
      .mutate<{ createPage: PageTree }>({
        mutation: gql`
        mutation CreatePage($input: CreatePageInput!) {
          createPage(input: $input) {
            id
            title
            content
          }
        }
      `,
        variables: { input: { sectionId, title, content } },
      })
      .pipe(map(res => extractGqlData(res, 'createPage')));
  }

  updatePage(id: string, title: string, content: string): Observable<PageTree> {
    return this.apollo
      .mutate<{ updatePage: PageTree }>({
        mutation: gql`
          mutation UpdatePage($input: UpdatePageInput!) {
            updatePage(input: $input) {
              id
              title
            }
          }
        `,
        variables: { input: { id, title, content } },
      })
      .pipe(map(res => extractGqlData(res, 'updatePage')));
  }

  deletePage(id: string): Observable<boolean> {
    return this.apollo
      .mutate<{ deletePage: boolean }>({
        mutation: gql`
          mutation DeletePage($id: String!) {
            deletePage(id: $id)
          }
        `,
        variables: { id },
      })
      .pipe(map(res => extractGqlData(res, 'deletePage')));
  }

  refreshNotebooks() {
    return this.getAllNotebooks().subscribe()
  }
}
