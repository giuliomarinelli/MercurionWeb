export function extractGqlData<T>(res: any, field: keyof T, allowNull = false): any {
  if (res.errors?.length) {
    throw new Error(`GqlError::${res.errors.map((e: any) => e.message).join(', ')}`);
  }
  if (!res.data || !(field in res.data)) {
    throw new Error('GqlError::NoData');
  }
  const value = res.data[field as any];
  if (value === null && !allowNull) {
    throw new Error('GqlError::NoData');
  }
  return value; // può essere null se allowNull=true
}


