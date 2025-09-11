/**
 * @type {import('@babel/core').TransformOptions}
 */
module.exports = {
  presets: [
    [
      '@babel/preset-env',
      {
        targets: {
          node: 'current',
          browsers: ['last 2 versions', 'ie >= 11'],
        },
      },
    ],
    [
      '@babel/preset-react',
      {
        runtime: 'automatic', // Use the new JSX transform
        importSource: 'react', // Explicitly use React's JSX runtime
      },
    ],
    '@babel/preset-typescript',
  ],
  plugins: [
    [
      'babel-plugin-css-modules-transform',
      {
        generateScopedName: '[name]__[local]___[hash:base64:5]',
        extensions: ['.css'],
      },
    ],
  ],
};
