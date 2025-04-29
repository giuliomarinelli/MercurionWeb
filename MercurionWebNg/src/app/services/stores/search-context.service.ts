import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class SearchContextService {

  isOpenedSearchOverlay = signal<boolean>(false)

}
