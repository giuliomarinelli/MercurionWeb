import { Injectable } from '@nestjs/common';

@Injectable()
export class MoleculeSearchService {
  async searchMolecules(query: string): Promise<any[]> {
    // 🔹 Qui faremo la chiamata a Meilisearch
    return [];
  }
}
