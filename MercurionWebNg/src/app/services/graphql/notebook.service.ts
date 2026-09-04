import { map, Observable, tap } from "rxjs";
import { ChapterTree, NotebookTree, PageTree, SectionTree } from "../../Models/graphql/notebook/notebook.models";
import { Apollo } from "apollo-angular";
import { computed, Injectable, signal } from "@angular/core";
import { extractGqlData } from "./graphql-helpers/v1/extract-gql-data.helper";
import {
  CreateChapterDocument,
  CreateChapterMutation,
  CreateChapterMutationVariables,
  CreateLabNotebookDocument,
  CreateLabNotebookMutation,
  CreateLabNotebookMutationVariables,
  CreatePageDocument,
  CreatePageMutation,
  CreatePageMutationVariables,
  CreateSectionDocument,
  CreateSectionMutation,
  CreateSectionMutationVariables,
  DeleteChapterDocument,
  DeleteChapterMutation,
  DeleteChapterMutationVariables,
  DeleteLabNotebookDocument,
  DeleteLabNotebookMutation,
  DeleteLabNotebookMutationVariables,
  DeleteSectionDocument,
  DeleteSectionMutation,
  DeleteSectionMutationVariables,
  DeletePageDocument,
  DeletePageMutation,
  DeletePageMutationVariables,
  GetAllNotebooksDocument,
  GetAllNotebooksQuery,
  GetAllNotebooksQueryVariables,
  GetChapterByIdDocument,
  GetChapterByIdQuery,
  GetChapterByIdQueryVariables,
  GetNotebookDetailDocument,
  GetNotebookDetailQuery,
  GetNotebookDetailQueryVariables,
  GetPageHeaderByIdDocument,
  GetPageHeaderByIdQuery,
  GetPageHeaderByIdQueryVariables,
  GetSectionByIdDocument,
  GetSectionByIdQuery,
  GetSectionByIdQueryVariables,
  UpdateChapterDocument,
  UpdateChapterMutation,
  UpdateChapterMutationVariables,
  UpdateLabNotebookDocument,
  UpdateLabNotebookMutation,
  UpdateLabNotebookMutationVariables,
  UpdatePageDocument,
  UpdatePageMutation,
  UpdatePageMutationVariables,
  UpdateSectionDocument,
  UpdateSectionMutation,
  UpdateSectionMutationVariables } from "../../generated/graphql";



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
      .watchQuery<GetAllNotebooksQuery, GetAllNotebooksQueryVariables>({
        query: GetAllNotebooksDocument,
        fetchPolicy: 'network-only' })
      .valueChanges.pipe(
        map(res => extractGqlData<GetAllNotebooksQuery, 'labNotebooksByUser'>(
          res,
          'labNotebooksByUser',
        ) as NotebookTree[]),
        tap(nbs => {
          this._notebooks.set(nbs)
          this._loading.set(false)
        })
      );
  }

  getNotebookById(id: string): Observable<NotebookTree> {
    return this.apollo
      .watchQuery<GetNotebookDetailQuery, GetNotebookDetailQueryVariables>({
        query: GetNotebookDetailDocument,
        variables: { id },
        fetchPolicy: 'network-only' })
      .valueChanges.pipe(
        map(res => extractGqlData<GetNotebookDetailQuery, 'labNotebook'>(
          res,
          'labNotebook',
        ) as NotebookTree),
      );
  }

  getChapterById(id: string): Observable<ChapterTree | null> {
    return this.apollo
      .watchQuery<GetChapterByIdQuery, GetChapterByIdQueryVariables>({
        query: GetChapterByIdDocument,
        variables: { id },
        fetchPolicy: 'network-only' })
      .valueChanges.pipe(
        map(res => extractGqlData<GetChapterByIdQuery, 'chapterById'>(
          res,
          'chapterById',
          true,
        ) as ChapterTree | null),
      );
  }

  getSectionById(id: string): Observable<SectionTree | null> {
    return this.apollo
      .watchQuery<GetSectionByIdQuery, GetSectionByIdQueryVariables>({
        query: GetSectionByIdDocument,
        variables: { id },
        fetchPolicy: 'network-only' })
      .valueChanges.pipe(
        map(res => extractGqlData<GetSectionByIdQuery, 'sectionById'>(
          res,
          'sectionById',
          true,
        ) as SectionTree | null),
      );
  }

  getPageByIdHeader(id: string): Observable<PageTree | null> {
    return this.apollo
      .watchQuery<GetPageHeaderByIdQuery, GetPageHeaderByIdQueryVariables>({
        query: GetPageHeaderByIdDocument,
        variables: { id },
        fetchPolicy: 'network-only' })
      .valueChanges.pipe(
        map(res => extractGqlData<GetPageHeaderByIdQuery, 'pageById'>(
          res,
          'pageById',
          true,
        ) as PageTree | null),
      );
  }



  createNotebook(title: string): Observable<NotebookTree> {
    return this.apollo
      .mutate<CreateLabNotebookMutation, CreateLabNotebookMutationVariables>({
        mutation: CreateLabNotebookDocument,
        variables: { title } })
      .pipe(
        map(res => extractGqlData<CreateLabNotebookMutation, 'createLabNotebook'>(
          res,
          'createLabNotebook',
        ) as NotebookTree),
      );
  }

  updateNotebook(id: string, title: string): Observable<NotebookTree> {
    return this.apollo
      .mutate<UpdateLabNotebookMutation, UpdateLabNotebookMutationVariables>({
        mutation: UpdateLabNotebookDocument,
        variables: { input: { id, title } } })
      .pipe(
        map(res => extractGqlData<UpdateLabNotebookMutation, 'updateLabNotebook'>(
          res,
          'updateLabNotebook',
        ) as NotebookTree),
      );
  }

  deleteNotebook(id: string): Observable<boolean> {
    return this.apollo
      .mutate<DeleteLabNotebookMutation, DeleteLabNotebookMutationVariables>({
        mutation: DeleteLabNotebookDocument,
        variables: { id } })
      .pipe(map(res => extractGqlData<DeleteLabNotebookMutation, 'deleteLabNotebook'>(res, 'deleteLabNotebook')));
  }

  // CAPITOLO CRUD

  createChapter(notebookId: string, title: string): Observable<ChapterTree> {
    return this.apollo
      .mutate<CreateChapterMutation, CreateChapterMutationVariables>({
        mutation: CreateChapterDocument,
        variables: { input: { notebookId, title } } })
      .pipe(
        map(res => extractGqlData<CreateChapterMutation, 'createChapter'>(
          res,
          'createChapter',
        ) as ChapterTree),
      );
  }

  updateChapter(id: string, title: string): Observable<ChapterTree> {
    return this.apollo
      .mutate<UpdateChapterMutation, UpdateChapterMutationVariables>({
        mutation: UpdateChapterDocument,
        variables: { input: { id, title } } })
      .pipe(
        map(res => extractGqlData<UpdateChapterMutation, 'updateChapter'>(
          res,
          'updateChapter',
        ) as ChapterTree),
      );
  }

  deleteChapter(id: string): Observable<boolean> {
    return this.apollo
      .mutate<DeleteChapterMutation, DeleteChapterMutationVariables>({
        mutation: DeleteChapterDocument,
        variables: { id } })
      .pipe(map(res => extractGqlData<DeleteChapterMutation, 'deleteChapter'>(res, 'deleteChapter')));
  }

  // SEZIONE CRUD

  createSection(chapterId: string, title: string): Observable<SectionTree> {
    return this.apollo
      .mutate<CreateSectionMutation, CreateSectionMutationVariables>({
        mutation: CreateSectionDocument,
        variables: { input: { chapterId, title } } })
      .pipe(
        map(res => extractGqlData<CreateSectionMutation, 'createSection'>(
          res,
          'createSection',
        ) as SectionTree),
      );
  }

  updateSection(id: string, title: string): Observable<SectionTree> {
    return this.apollo
      .mutate<UpdateSectionMutation, UpdateSectionMutationVariables>({
        mutation: UpdateSectionDocument,
        variables: { input: { id, title } } })
      .pipe(
        map(res => extractGqlData<UpdateSectionMutation, 'updateSection'>(
          res,
          'updateSection',
        ) as SectionTree),
      );
  }

  deleteSection(id: string): Observable<boolean> {
    return this.apollo
      .mutate<DeleteSectionMutation, DeleteSectionMutationVariables>({
        mutation: DeleteSectionDocument,
        variables: { id } })
      .pipe(map(res => extractGqlData<DeleteSectionMutation, 'deleteSection'>(res, 'deleteSection')));
  }

  // PAGINA CRUD

  createPage(sectionId: string, title: string, content: string): Observable<PageTree> {
    return this.apollo
      .mutate<CreatePageMutation, CreatePageMutationVariables>({
        mutation: CreatePageDocument,
        variables: { input: { sectionId, title, content } } })
      .pipe(
        map(res => extractGqlData<CreatePageMutation, 'createPage'>(
          res,
          'createPage',
        ) as PageTree),
      );
  }

  updatePage(id: string, title: string, content: string): Observable<PageTree> {
    return this.apollo
      .mutate<UpdatePageMutation, UpdatePageMutationVariables>({
        mutation: UpdatePageDocument,
        variables: { input: { id, title, content } } })
      .pipe(
        map(res => extractGqlData<UpdatePageMutation, 'updatePage'>(
          res,
          'updatePage',
        ) as PageTree),
      );
  }

  deletePage(id: string): Observable<boolean> {
    return this.apollo
      .mutate<DeletePageMutation, DeletePageMutationVariables>({
        mutation: DeletePageDocument,
        variables: { id } })
      .pipe(map(res => extractGqlData<DeletePageMutation, 'deletePage'>(res, 'deletePage')));
  }

  refreshNotebooks() {
    return this.getAllNotebooks().subscribe()
  }
}
