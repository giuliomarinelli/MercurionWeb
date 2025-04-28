import { Resolver, Query } from '@nestjs/graphql';

@Resolver()
export class MoleculeSearchResolver {
  @Query(() => String)
  hello(): string {
    return 'Hello Molecules!';
  }
}
