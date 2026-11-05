import assert from 'node:assert/strict';
import { isTextEditingSurface } from './check-angular-interactive-semantics.mjs';

assert.equal(isTextEditingSurface('<div contenteditable="true" role="textbox" aria-label="Nome" (keydown)="edit($event)">'), true);
assert.equal(isTextEditingSurface('<div contenteditable="plaintext-only" role="textbox" aria-label="Nome" (keydown)="edit($event)">'), true);
const boundEditor = `<div [attr.contenteditable]="editing ? 'true' : null" [attr.role]="editing ? 'textbox' : null" [attr.aria-label]="editing ? 'Modifica nome' : 'Nome'" (keydown)="edit($event)">`;
assert.equal(isTextEditingSurface(boundEditor), true);
for (const element of [
  '<div (keydown)="save()">',
  '<div role="textbox" aria-label="Nome" (keydown)="save()">',
  '<div contenteditable="false" role="textbox" aria-label="Nome" (keydown)="save()">',
  '<div contenteditable="true" role="textbox" (keydown)="edit($event)">',
  '<div contenteditable="true" role="button" aria-label="Salva" (keydown)="save()">',
  boundEditor.replace('(keydown)', '(click)'),
  boundEditor.replace("'true'", "'false'")
]) {
  assert.equal(isTextEditingSurface(element), false, element);
}
console.log('Interactive semantics fixtures accept labelled native editors and reject generic controls.');
