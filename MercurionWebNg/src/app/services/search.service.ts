import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class SearchService {

  searchMolecule(q: string) {
    console.log(q)
  }

}
