export function queryByRole<T extends HTMLElement>(
  root: ParentNode,
  role: string,
  name?: string,
): T {
  const selectors: Record<string, string> = {
    button: 'button, [role="button"]',
    combobox: 'input[role="combobox"], [role="combobox"]',
    dialog: '[role="dialog"]',
  };
  const matches = Array.from(
    root.querySelectorAll<HTMLElement>(selectors[role] ?? `[role="${role}"]`),
  );
  const namedMatches = name === undefined
    ? matches
    : matches.filter(element => accessibleName(element, root) === name);
  const match = namedMatches[0];

  if (!match) {
    throw new Error(`Expected role="${role}"${name ? ` name="${name}"` : ''}`);
  }

  return match as T;
}

export function accessibleName(element: HTMLElement, root?: ParentNode): string {
  const labelledBy = element.getAttribute('aria-labelledby');
  const labelledByText = labelledBy
    ?.split(/\s+/)
    .map(id => root?.querySelector<HTMLElement>(`#${CSS.escape(id)}`)?.textContent ?? '')
    .join(' ');
  const label = element.id
    ? root?.querySelector<HTMLLabelElement>(`label[for="${CSS.escape(element.id)}"]`)?.textContent
    : '';

  const name = element.getAttribute('aria-label')
    || labelledByText
    || label
    || element.innerText
    || element.textContent
    || element.parentElement?.textContent
    || '';

  return name.replace(/\s+/g, ' ').trim();
}
