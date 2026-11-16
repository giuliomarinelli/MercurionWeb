// Runtime node_modules contains the root tree, overlaid with the Nest workspace tree.
export function devOnlyDependencies(manifest, packages) {
  return Object.keys(manifest.devDependencies ?? {}).filter(name => {
    const root = packages[`node_modules/${name}`];
    const workspace = packages[`MercurionWebNode/node_modules/${name}`];
    if (!root && !workspace) throw new Error(`Missing locked development dependency: ${name}`);
    // Production-only workspace installation omits dev entries; a shared root
    // dependency may still legitimately provide the same package name.
    return (!root || root.dev === true) && (!workspace || workspace.dev === true);
  });
}
