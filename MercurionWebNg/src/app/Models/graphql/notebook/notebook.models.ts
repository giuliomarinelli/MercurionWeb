export interface NotebookTree {
  id: string
  title: string
  chapters: ChapterTree[]
}

export interface ChapterTree {
  id: string
  title: string
  sections: SectionTree[]
}

export interface SectionTree {
  id: string
  title: string
  pages: PageTree[]
}

export interface PageTree {
  id: string
  title: string
  content: string
}
