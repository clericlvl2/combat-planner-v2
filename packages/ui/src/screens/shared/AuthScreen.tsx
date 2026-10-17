import { IconSwords } from '@tabler/icons-react';
import type { ReactNode } from 'react';
import { Link } from 'react-router';
import classes from './AuthScreen.module.css';
import { ScreenToast } from './ScreenToast.tsx';

export interface AuthScreenProps {
  title: string;
  subtitle: string;
  switchText: string;
  switchLabel: string;
  switchTo: string;
  children: ReactNode;
}

export function AuthScreen({
  title,
  subtitle,
  switchText,
  switchLabel,
  switchTo,
  children,
}: AuthScreenProps) {
  return (
    <div className={classes.root}>
      <div className={classes.body}>
        <span className={classes.logo} aria-hidden="true">
          <IconSwords size={32} stroke={2} />
        </span>
        <div className={classes.heading}>
          <h1 className={classes.title}>{title}</h1>
          <p className={classes.subtitle}>{subtitle}</p>
        </div>
        {children}
        <p className={classes.switch}>
          {switchText}{' '}
          <Link className={classes.link} to={switchTo}>
            {switchLabel}
          </Link>
        </p>
      </div>
      <ScreenToast />
    </div>
  );
}
