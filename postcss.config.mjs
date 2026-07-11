/** @type {import('postcss-load-config').Config} */
const config = {
  plugins: {
    // postcss-import must run before tailwindcss so that @import directives in
    // globals.css are resolved and inlined before Tailwind processes @layer blocks.
    'postcss-import': {},
    tailwindcss: {},
  },
};

export default config;
