import { useTranslation } from 'react-i18next';
import { PageScreen } from '../shared/PageScreen.tsx';
import classes from './About.module.css';

export interface AboutProps {
  version: string;
  sourceUrl: string;
}

interface ValueRowProps {
  label: string;
  value: string;
  href?: string;
}

function ValueRow({ label, value, href }: ValueRowProps) {
  const content = (
    <>
      <span className={classes.label}>{label}</span>
      <span className={classes.value}>{value}</span>
    </>
  );
  return href ? (
    <a className={classes.row} href={href} target="_blank" rel="noopener noreferrer">
      {content}
    </a>
  ) : (
    <div className={classes.row}>{content}</div>
  );
}

interface NoteRowProps {
  label: string;
  note: string;
}

function NoteRow({ label, note }: NoteRowProps) {
  return (
    <div className={classes.row} data-stacked="">
      <span className={classes.label}>{label}</span>
      <span className={classes.note}>{note}</span>
    </div>
  );
}

export function About({ version, sourceUrl }: AboutProps) {
  const { t } = useTranslation('About');
  return (
    <PageScreen title={t('title')} section="about" openToGuests>
      <div className={classes.card}>
        <ValueRow label={t('version')} value={version} />
        <ValueRow label={t('rules')} value={t('rulesValue')} />
        <ValueRow label={t('source')} value={t('sourceValue')} href={sourceUrl} />
      </div>
      <p className={classes.text}>{t('description')}</p>
      <div className={classes.card}>
        <NoteRow label={t('privacy')} note={t('privacyNote')} />
        <NoteRow label={t('credits')} note={t('creditsNote')} />
      </div>
      <p className={classes.legal}>{t('legal')}</p>
    </PageScreen>
  );
}
