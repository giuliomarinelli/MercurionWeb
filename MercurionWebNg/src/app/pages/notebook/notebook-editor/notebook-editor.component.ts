import { BASE_PATH } from './../../../pipes/base-path.token';
import { Component, Inject, OnInit, effect, inject } from '@angular/core';
import { APP_BASE_HREF, CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { NotebookService } from '../../../services/notebook.service';
import { LabNotebookEntry } from '../../../Models/notebook/lab-notebook-entry-model.interface';
import { PublicPipe } from '../../../pipes/public.pipe';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { ThemeManagerService } from '../../../services/stores/theme-manager.service';


@Component({
  selector: 'app-notebook-editor',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <div class="p-4">
      <h2 class="text-xl font-bold mb-4">{{ isNew ? 'Nuova Nota' : 'Modifica Nota' }}</h2>

      <input [(ngModel)]="note.title" placeholder="Titolo" class="p-2 border w-full mb-4 rounded" />

      <!-- iframe tiptap app -->
      <iframe id="TipTapEditor"
        [src]="editorSrc"
        class="w-full h-[500px] border mb-4 rounded"
        #editorIframe
      ></iframe>

      <button (click)="save()" class="bg-green-600 text-white px-4 py-2 rounded">💾 Salva</button>
    </div>
  `
})
export class NotebookEditorComponent implements OnInit {

  protected editorSrc: SafeResourceUrl = ''

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly notebookService: NotebookService,
    private readonly sanitizer: DomSanitizer,
    @Inject(APP_BASE_HREF)
    private readonly base: string,
    private readonly themeManager: ThemeManagerService
  ) {
    effect(() => {
        const iframe = document?.querySelector('iframe')
        if (!iframe) return

        iframe.addEventListener('load', () => {
          const html = iframe.contentWindow?.document.documentElement
          if (!html) return;
          if (this.themeManager.theme() === 'dark') {
            html.classList.add('dark');
          } else {
            html.classList.remove('dark');
          }
        })

        const html = iframe.contentWindow?.document.documentElement
        if (!html) return;
        if (this.themeManager.theme() === 'dark') {
          html.classList.add('dark');
        } else {
          html.classList.remove('dark');
        }
      })
  }

  note: Partial<LabNotebookEntry> = { title: '', content: '', userId: '' };
  isNew = true

  ngOnInit() {
    const cleanBase = this.base.replace(/\/$/, '');
    const cleanPath = 'tiptap-editor.html'.replace(/^\//, '');
    const fullPath = `${cleanBase}/${cleanPath}`;
    const id = this.route.snapshot.paramMap.get('id');
    this.note.userId = localStorage.getItem('userId') ?? '';
    this.editorSrc = this.sanitizer.bypassSecurityTrustResourceUrl(fullPath)
    console.log(this.editorSrc)
    if (id) {
      this.isNew = false
      this.notebookService.getNote(id).subscribe((note: LabNotebookEntry) => this.note = note)
    }
  }

  save() {
    const iframe = document.querySelector('iframe')!
    const content = (iframe.contentWindow as any)?.getEditorContent?.()
    this.note.content = JSON.stringify(content)

    if (this.isNew) {
      this.notebookService.createNote(this.note).subscribe(() => this.router.navigate(['/notebook']))
    } else {
      this.notebookService.updateNote(this.note!.id!, this.note).subscribe(() => this.router.navigate(['/notebook']))
    }
  }

}
