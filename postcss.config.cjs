const focusOutline = { outline: '2px solid var(--cp-state-focus)', outlineOffset: '-2px' };
const keyboardPointer = '@media (hover: hover) and (pointer: fine)';

module.exports = {
  plugins: {
    'postcss-preset-mantine': {
      mixins: {
        'focus-ring': {
          '&:focus-visible': { outline: 'none' },
          [keyboardPointer]: { '&:focus-visible': focusOutline },
          '&[data-focus]': focusOutline,
        },
        'focus-ring-keyboard': { [keyboardPointer]: focusOutline },
        'focus-ring-outline': focusOutline,
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
