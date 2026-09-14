import { HandlebarsAdapter } from '@nestjs-modules/mailer/adapters/handlebars.adapter';
import Handlebars from 'handlebars';
import { readFileSync, readdirSync } from 'node:fs';
import { extname, join, relative } from 'node:path';

/**
 * The mailer adapter's glob-based partial discovery is not deterministic on
 * Windows absolute paths. Register the repository-owned partials explicitly,
 * using names relative to the canonical template root.
 */
export class DeterministicHandlebarsAdapter extends HandlebarsAdapter {
  constructor(private readonly templateRoot: string) {
    super(undefined, { inlineCssEnabled: false });
    this.registerPartials(templateRoot);
  }

  private registerPartials(directory: string): void {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const entryPath = join(directory, entry.name);
      if (entry.isDirectory()) {
        this.registerPartials(entryPath);
        continue;
      }
      const relativePath = relative(this.templateRoot, entryPath);
      if (
        extname(entry.name) !== '.hbs' ||
        (!relativePath.includes('partials') && !relativePath.includes('layouts'))
      ) {
        continue;
      }
      const partialName = relative(this.templateRoot, entryPath)
        .replace(/\\/g, '/')
        .replace(/\.hbs$/, '');
      Handlebars.registerPartial(partialName, readFileSync(entryPath, 'utf8'));
    }
  }
}
