import type { ReactNode } from 'react';
import classes from './PageSection.module.css';

export interface PageSectionProps {
  label: string;
  note?: string;
  children: ReactNode;
}

export function PageSection({ label, note, children }: PageSectionProps) {
  return (
    <section className={classes.section}>
      <h2 className={classes.label}>{label}</h2>
      {children}
      {note ? <p className={classes.note}>{note}</p> : null}
    </section>
  );
}
