module.exports = (api) => {
  const cssnano = api.mode === 'production' && !api.file.endsWith('.min.css');

  return {
    hideNothingWarning: true,
    plugins: [
      'tailwindcss',
      ['postcss-preset-env', {
        features: {
          'all-property': false,
          'case-insensitive-attribute': false,
          'logical-properties-and-values': false,
        },
      }],
      cssnano && ['cssnano', {
        preset: 'lite',
      }],
    ].filter(Boolean),
  };
};
