import { Pipe, PipeTransform, inject } from '@angular/core';
import { BASE_PATH } from './base-path.token';

@Pipe({ name: 'public', standalone: true })
export class PublicPipe implements PipeTransform {

  private base = inject(BASE_PATH)              // ⇐ '/app/'  o  '/'

  transform(path: string): string {
    // eliminazione slash finali/iniziali per evitare ///
    const cleanBase = this.base.replace(/\/$/, '')
    const cleanRel  = path.replace(/^\//, '')
    return `${cleanBase}/${cleanRel}`
  }
}
