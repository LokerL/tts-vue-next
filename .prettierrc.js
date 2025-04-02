module.exports = {
  tabWidth: 2,
  semi: true,
  printWidth: 80,
  singleQuote: true,
  quoteProps: 'consistent',
  htmlWhitespaceSensitivity: 'strict',
  trailingComma: 'es5',
  bracketSpacing: true,
  arrowParens: 'always',
  vueIndentScriptAndStyle: true,
  overrides: [
    {
      files: '*.json',
      options: {
        tabWidth: 4,
      },
    },
    {
      files: '*.md',
      options: {
        printWidth: 100,
      },
    }
  ],
};
