export interface SelectState {
  readonly isOpen: boolean;
  readonly activeIndex: number;
  readonly searchTerm: string;
  readonly hasFocus: boolean;
}

export interface SelectSelectionChange<TItem, TValue> {
  readonly item?: TItem;
  readonly value?: TValue;
  readonly values: readonly TValue[];
}
