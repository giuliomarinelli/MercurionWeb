import { AxeResults, ElementContext, Result, RunOptions, run } from 'axe-core';

export const blockingAxeOptions: RunOptions = {
  resultTypes: ['violations'],
};

export function blockingViolations(results: AxeResults): Result[] {
  return results.violations.filter(({ impact }) => impact === 'critical' || impact === 'serious');
}

export function formatAxeViolations(violations: readonly Result[]): string {
  return violations
    .map(({ id, impact, help, nodes }) => {
      const targets = nodes.map(node => node.target.join(' ')).join(', ');
      return `${id} (${impact}): ${help} [${targets}]`;
    })
    .join('\n');
}

export async function runAxe(
  context: ElementContext,
  options: RunOptions = blockingAxeOptions,
): Promise<AxeResults> {
  return run(context, options);
}
