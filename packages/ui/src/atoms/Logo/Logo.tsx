import type { ComponentPropsWithoutRef } from 'react';

const shield =
  'M3 1.5H13Q14.5 1.5 14.5 3V8.4C14.5 11.8 11.9 13.9 8 15.3C4.1 13.9 1.5 11.8 1.5 8.4V3Q1.5 1.5 3 1.5Z';
const sword =
  'M11.83 4.93L7.661 9.1L8.05 9.49A0.75 0.75 0 0 1 6.99 10.55L6.6 10.161L5.73 11.03A0.75 0.75 0 0 1 4.67 9.97L5.539 9.1L5.15 8.71A0.75 0.75 0 0 1 6.21 7.65L6.6 8.039L10.77 3.87A0.75 0.75 0 0 1 11.83 4.93Z';

const logoPath = `${shield}${sword}`;

export interface LogoProps extends Omit<
  ComponentPropsWithoutRef<'svg'>,
  'children' | 'width' | 'height' | 'viewBox' | 'fill'
> {
  size?: number;
}

export function Logo({ size = 24, 'aria-hidden': ariaHidden = true, ...rest }: LogoProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 16 16"
      width={size}
      height={size}
      fill="currentColor"
      aria-hidden={ariaHidden}
      focusable="false"
      data-logo=""
      {...rest}
    >
      <path fillRule="evenodd" d={logoPath} />
    </svg>
  );
}
