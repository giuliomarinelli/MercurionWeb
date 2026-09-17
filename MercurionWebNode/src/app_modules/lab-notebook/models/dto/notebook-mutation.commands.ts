export interface LabNotebookPatchCommand {
  title?: string
}

export interface NotebookChapterCreateCommand {
  title: string
}

export interface NotebookChapterPatchCommand {
  title?: string
  order?: number
}

export interface NotebookSectionCreateCommand {
  title: string
  description?: string
}

export interface NotebookSectionPatchCommand {
  title?: string
  description?: string
}

export interface NotebookPageCreateCommand {
  title?: string
  content?: string
}

export interface NotebookPagePatchCommand {
  title?: string
  content?: string
  order?: number
}

export function toLabNotebookPatch(input: LabNotebookPatchCommand) {
  return { title: input.title }
}

export function toNotebookChapterPatch(input: NotebookChapterPatchCommand) {
  return { title: input.title, order: input.order }
}

export function toNotebookSectionPatch(input: NotebookSectionPatchCommand) {
  return { title: input.title, description: input.description }
}

export function toNotebookPagePatch(input: NotebookPagePatchCommand) {
  return { title: input.title, content: input.content, order: input.order }
}
