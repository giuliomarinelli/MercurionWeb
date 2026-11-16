const { createRequire } = require('node:module');

// Node 22 can require this ESM dependency from Fastify's CommonJS plugin;
// Jest's VM cannot. Use the native loader and preserve the real implementation
// and the exact dependency version resolved by @fastify/static.
module.exports = createRequire(require.resolve('@fastify/static'))('content-disposition');
