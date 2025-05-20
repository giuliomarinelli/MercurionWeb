import { ChemblModule } from './chembl.module';

import { Test } from '@nestjs/testing';

describe('ChemblModule', () => {
  it('should compile the chembl feature module', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [ChemblModule],
    }).compile();
    expect(moduleRef).toBeDefined();
  });
});
