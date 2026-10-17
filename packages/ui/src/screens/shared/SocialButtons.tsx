import type { SocialProvider } from '@combat-planner/api/client';
import { IconBrandGithub, IconBrandGoogle } from '@tabler/icons-react';
import type { Icon } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { Button } from '../../atoms/Button/Button.tsx';
import { useAccount } from '../../hooks/useAccount.ts';
import classes from './SocialButtons.module.css';

export type Redirect = (url: string) => void;

export const assignLocation: Redirect = (url) => {
  window.location.assign(url);
};

export const callbackUrlOf = (provider: SocialProvider): string =>
  `${window.location.origin}/auth/callback/${provider}`;

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
  if (!providers || providers.length === 0) return null;

  const start = (provider: SocialProvider) => {
    socialSignIn(provider, callbackUrlOf(provider))
      .then(({ url }) => onRedirect(url))
      .catch(() => {});
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
          onClick={() => start(provider)}
        >
          {t(provider)}
        </Button>
      ))}
    </>
  );
}
