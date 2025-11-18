// Browser shim for Node's "fs" used indirectly by @rdkit/rdkit.

function readFileSync(..._args: unknown[]): never {
  throw new Error('fs.readFileSync is not available in the browser');
}

const fs = { readFileSync };

module.exports = fs;
