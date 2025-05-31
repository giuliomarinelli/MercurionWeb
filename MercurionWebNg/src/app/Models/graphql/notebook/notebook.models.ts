import { WritableSignal } from "@angular/core"


export interface NotebookTree {
  id: string
  title: string
  chapters: ChapterTree[]
}

export interface ChapterTree {
  id: string
  title: string
  sections: SectionTree[]
  expanded?: WritableSignal<boolean>
}

export interface SectionTree {
  id: string
  title: string
  pages: PageTree[]
  expanded?: WritableSignal<boolean>
}

export interface PageTree {
  id: string
  title: string
}
