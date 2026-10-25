const postcss = require('postcss');

const focusOutline = 'outline: 2px solid var(--cp-state-focus); outline-offset: -2px;';
const keyboardPointer = '@media (hover: hover) and (pointer: fine)';

const cssMixin = (css) => (rule) => {
  const parsed = postcss.parse(css, { from: rule.source?.input.file });
  rule.parent.insertBefore(rule, parsed.nodes);
};

module.exports = {
  plugins: {
    'postcss-preset-mantine': {
      mixins: {
        'focus-ring': cssMixin(
          `&:focus-visible { outline: none; } ${keyboardPointer} { &:focus-visible { ${focusOutline} } } &[data-focus] { ${focusOutline} }`,
        ),
        'focus-ring-keyboard': cssMixin(`${keyboardPointer} { ${focusOutline} }`),
        'focus-ring-outline': cssMixin(focusOutline),
      },
    },
    'postcss-simple-vars': {
      variables: {
        'mantine-breakpoint-xs': '36em',
        'mantine-breakpoint-sm': '48em',
        'mantine-breakpoint-md': '62em',
        'mantine-breakpoint-lg': '75em',
        'mantine-breakpoint-xl': '88em',
      },
    },
  },
};
