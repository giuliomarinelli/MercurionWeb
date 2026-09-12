import { DOCUMENT } from '@angular/common';
import { Injectable, inject } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class DialogScrollLockService {
  private readonly document = inject(DOCUMENT);
  private count = 0;
  private previousOverflow: string | null = null;

  lock(): void {
    if (this.count++ > 0) return;
    const body = this.document.body;
    this.previousOverflow = body.style.overflow;
    body.style.overflow = 'hidden';
  }

  unlock(): void {
    if (this.count === 0) return;
    this.count--;
    if (this.count > 0) return;
    this.document.body.style.overflow = this.previousOverflow ?? '';
    this.previousOverflow = null;
  }
}
