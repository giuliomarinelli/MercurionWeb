import { DOCUMENT } from '@angular/common';
import { Injectable, inject } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class DialogScrollLockService {
  private readonly document = inject(DOCUMENT);
  private count = 0;
  private previousStyles: { name: string; value: string; priority: string }[] = [];
  private scrollPosition = { x: 0, y: 0 };
  private previouslyLocked = false;

  lock(): void {
    if (this.count++ > 0) return;
    const body = this.document.body;
    const win = this.document.defaultView;
    this.scrollPosition = { x: win?.scrollX ?? 0, y: win?.scrollY ?? 0 };
    this.previousStyles = ['overflow', 'position', 'top', 'left', 'width'].map(name => ({
      name, value: body.style.getPropertyValue(name), priority: body.style.getPropertyPriority(name)
    }));
    this.previouslyLocked = this.document.documentElement.classList.contains('m-dialog-open');
    this.document.documentElement.classList.add('m-dialog-open');
    body.style.overflow = 'hidden';
    body.style.position = 'fixed';
    body.style.top = `${-this.scrollPosition.y}px`;
    body.style.left = `${-this.scrollPosition.x}px`;
    body.style.width = '100%';
  }

  unlock(): void {
    if (this.count === 0) return;
    this.count--;
    if (this.count > 0) return;
    for (const { name, value, priority } of this.previousStyles) {
      if (value) this.document.body.style.setProperty(name, value, priority);
      else this.document.body.style.removeProperty(name);
    }
    if (!this.previouslyLocked) this.document.documentElement.classList.remove('m-dialog-open');
    this.document.defaultView?.scrollTo({ left: this.scrollPosition.x, top: this.scrollPosition.y, behavior: 'instant' });
    this.previousStyles = [];
  }
}
