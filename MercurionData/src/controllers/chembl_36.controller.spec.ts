import { Test, TestingModule } from '@nestjs/testing';
import { Chembl36Controller } from './chembl_36.controller';

describe('Chembl36Controller', () => {
  let controller: Chembl36Controller;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [Chembl36Controller],
    }).compile();

    controller = module.get<Chembl36Controller>(Chembl36Controller);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
