import { useRef } from 'react';

export function useRetained<T>(value: T | null): T | null {
  const retained = useRef(value);
  if (value !== null) retained.current = value;
  return retained.current;
}
