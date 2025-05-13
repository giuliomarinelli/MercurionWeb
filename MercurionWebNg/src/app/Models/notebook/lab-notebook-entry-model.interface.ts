export interface LabNotebookEntry {
  id: string
  userId: string
  title: string
  content: string // Tiptap JSON stringificato
  createdAt: number
  updatedAt: number
}
