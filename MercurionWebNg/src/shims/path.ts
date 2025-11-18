// Browser shim per "path"

function join(...parts: string[]): string {
  return parts.join('/');
}

const path = { join };

module.exports = path;
