import { LIMITS } from '@combat-planner/domain';
import { IconChevronRight, IconLogout, IconUserX } from '@tabler/icons-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import { TextField } from '../../atoms/TextField/TextField.tsx';
import { useAccount } from '../../hooks/useAccount.ts';
import { Dialog } from '../../organisms/Dialog/Dialog.tsx';
import { PageScreen } from '../shared/PageScreen.tsx';
import { PageSection } from '../shared/PageSection.tsx';
import { submitOnEnter } from '../shared/submitOnEnter.ts';
import classes from './Account.module.css';

export function Account() {
  const { t } = useTranslation('Account');
  const { t: tDialog } = useTranslation('Dialog');
  const navigate = useNavigate();
  const { session, update, signOut, remove } = useAccount();
  const [draft, setDraft] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);

  const saved = session?.displayName ?? '';
  const displayName = draft ?? saved;
  const nameMissing = draft !== null && draft.trim() === '';

  const saveName = () => {
    if (draft === null) return;
    const next = draft.trim();
    if (next === '') return;
    if (next === saved) {
      setDraft(null);
      return;
    }
    update({ displayName: next })
      .then(() => setDraft(null))
      .catch(() => {});
  };

  const leave = () => {
    signOut()
      .then(() => navigate('/auth/sign-in'))
      .catch(() => {});
  };

  const confirmDelete = () => {
    setConfirming(false);
    remove()
      .then(() => navigate('/auth/sign-in', { state: { accountDeleted: true } }))
      .catch(() => {});
  };

  return (
    <PageScreen title={t('title')} section="account">
      <PageSection label={t('signedInAs')}>
        <div className={classes.card}>
          <div className={classes.block}>
            <span className={classes.caption}>{t('email')}</span>
            <span className={classes.email}>{session?.email ?? ''}</span>
          </div>
          <span className={classes.divider} aria-hidden="true" />
          <div className={classes.block}>
            <TextField
              name="displayName"
              autoComplete="nickname"
              label={t('displayName')}
              maxLength={LIMITS.displayName}
              value={displayName}
              error={nameMissing ? t('enterName') : undefined}
              onChange={setDraft}
              onBlur={saveName}
              onKeyDown={submitOnEnter(saveName)}
            />
          </div>
          <span className={classes.divider} aria-hidden="true" />
          <button type="button" className={classes.row} onClick={leave}>
            <IconLogout className={classes.icon} size={20} stroke={2} aria-hidden="true" />
            <span className={classes.rowLabel}>{t('signOut')}</span>
          </button>
        </div>
      </PageSection>
      <div className={classes.danger}>
        <PageSection label={t('dangerZone')} note={t('deleteNote')}>
          <div className={classes.card}>
            <button
              type="button"
              className={classes.row}
              data-tone="danger"
              onClick={() => setConfirming(true)}
            >
              <IconUserX className={classes.icon} size={20} stroke={2} aria-hidden="true" />
              <span className={classes.rowLabel}>{t('deleteAccount')}</span>
              <IconChevronRight
                className={classes.chevron}
                size={20}
                stroke={2}
                aria-hidden="true"
              />
            </button>
          </div>
        </PageSection>
      </div>
      <Dialog
        opened={confirming}
        icon={IconUserX}
        title={tDialog('deleteAccountTitle')}
        body={tDialog('deleteAccountBody')}
        confirmLabel={tDialog('delete')}
        onConfirm={confirmDelete}
        onCancel={() => setConfirming(false)}
      />
    </PageScreen>
  );
}
