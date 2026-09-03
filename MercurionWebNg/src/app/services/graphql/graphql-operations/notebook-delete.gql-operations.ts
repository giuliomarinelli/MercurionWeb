import { gql } from 'apollo-angular';

export const DELETE_LAB_NOTEBOOK = gql`
  mutation DeleteLabNotebook($id: ID!) {
    deleteLabNotebook(id: $id)
  }
`;

export const DELETE_CHAPTER = gql`
  mutation DeleteChapter($id: ID!) {
    deleteChapter(id: $id)
  }
`;

export const DELETE_SECTION = gql`
  mutation DeleteSection($id: ID!) {
    deleteSection(id: $id)
  }
`;
