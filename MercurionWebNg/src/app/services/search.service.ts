import { Injectable, inject } from '@angular/core';
import { LoggerService } from './logger.service';

@Injectable({
  providedIn: 'root'
})
export class SearchService {
  private readonly logger = inject(LoggerService);

  searchMolecule(q: string): void {
    this.logger.debug('Search molecule query', q);
  }
}
