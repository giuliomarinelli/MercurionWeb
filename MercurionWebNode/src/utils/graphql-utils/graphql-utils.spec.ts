import { GraphQLUtils } from './graphql-utils';
import { GraphQLResolveInfo, OperationDefinitionNode, parse } from 'graphql';

describe('GraphqlUtils', () => {
  it('should be defined', () => {
    expect(new GraphQLUtils()).toBeDefined();
  });

  it('reads requested fields through the CommonJS graphql-fields export', () => {
    const document = parse('{ molecules { id molecule { name } } }');
    const operation = document.definitions[0] as OperationDefinitionNode;

    const info = {
      fieldNodes: [operation.selectionSet.selections[0]],
      fragments: {},
      variableValues: {},
    } as unknown as GraphQLResolveInfo;

    expect(GraphQLUtils.getFieldsMap(info)).toEqual({
      id: {},
      molecule: { name: {} },
    });
  });
});
