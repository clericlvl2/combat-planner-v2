import type { KeyboardEvent } from 'react';

export const submitOnEnter =
  (submit: () => void) =>
  (event: KeyboardEvent<HTMLElement>): void => {
    if (event.key !== 'Enter' || event.nativeEvent.isComposing) return;
    event.preventDefault();
    submit();
  };
