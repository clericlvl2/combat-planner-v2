import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { Logo } from '../../atoms/Logo/Logo.tsx';
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
        <div className={classes.heading}>
          <div className={classes.brand}>
            <span className={classes.logo} aria-hidden="true">
              <Logo size={24} />
            </span>
            <h1 className={classes.title}>{title}</h1>
          </div>
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
