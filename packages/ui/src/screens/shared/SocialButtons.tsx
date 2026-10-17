import type { SocialProvider } from '@combat-planner/api/client';
import { IconBrandGithub, IconBrandGoogle } from '@tabler/icons-react';
import type { Icon } from '@tabler/icons-react';
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '../../atoms/Button/Button.tsx';
import { useAccount } from '../../hooks/useAccount.ts';
import classes from './SocialButtons.module.css';

export type Redirect = (url: string) => void;

export const assignLocation: Redirect = (url) => {
  window.location.assign(url);
};

export const signedInUrl = (): string => `${window.location.origin}/combats`;

const providerIcons: Record<SocialProvider, Icon> = {
  google: IconBrandGoogle,
  github: IconBrandGithub,
};

export interface SocialButtonsProps {
  onRedirect: Redirect;
}

export function SocialButtons({ onRedirect }: SocialButtonsProps) {
  const { t } = useTranslation('SignIn');
  const { providers, socialSignIn } = useAccount();
  const [busy, setBusy] = useState(false);
  const sending = useRef(false);
  const [failed, setFailed] = useState(false);
  if (!providers || providers.length === 0) return null;

  const start = (provider: SocialProvider) => {
    if (sending.current) return;
    sending.current = true;
    setBusy(true);
    setFailed(false);
    socialSignIn(provider, signedInUrl())
      .then(({ url }) => onRedirect(url))
      .catch(() => {
        sending.current = false;
        setBusy(false);
        setFailed(true);
      });
  };

  return (
    <>
      <div className={classes.or}>
        <span className={classes.rule} aria-hidden="true" />
        {t('or')}
        <span className={classes.rule} aria-hidden="true" />
      </div>
      {providers.map((provider) => (
        <Button
          key={provider}
          variant="secondary"
          size="M"
          fullWidth
          icon={providerIcons[provider]}
          disabled={busy}
          onClick={() => start(provider)}
        >
          {t(provider)}
        </Button>
      ))}
      {failed ? (
        <p className={classes.error} role="alert">
          {t('socialFailed')}
        </p>
      ) : null}
    </>
  );
}
