const path = require('path');

module.exports = (options) => ({
  ...options,
  externals: [
    ...(Array.isArray(options.externals) ? options.externals : options.externals ? [options.externals] : []),
  ],
  resolve: {
    ...options.resolve,
    alias: {
      ...(options.resolve && options.resolve.alias ? options.resolve.alias : {}),
      '@geveze/shared': path.resolve(__dirname, '../../packages/shared/src/index.ts'),
    },
  },
});
