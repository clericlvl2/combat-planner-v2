import { ApiError } from '@combat-planner/api/client';
import type { SocialProvider } from '@combat-planner/api/client';
import {
  IconAlertTriangle,
  IconBrandGithub,
  IconBrandGoogle,
  IconSwords,
  IconUserX,
  IconWifiOff,
} from '@tabler/icons-react';
import type { Icon } from '@tabler/icons-react';
import { useEffect, useState } from 'react';
import type { KeyboardEvent, ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useLocation, useNavigate } from 'react-router';
import { Button } from '../../atoms/Button/Button.tsx';
import { TextField } from '../../atoms/TextField/TextField.tsx';
import { useAccount } from '../../hooks/useAccount.ts';
import { useToasts } from '../../hooks/useToasts.ts';
import { Toast } from '../../molecules/Toast/Toast.tsx';
import type { ToastTone } from '../../molecules/Toast/Toast.tsx';
import classes from './SignIn.module.css';

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

export const submitOnEnter =
  (submit: () => void) =>
  (event: KeyboardEvent<HTMLElement>): void => {
    if (event.key !== 'Enter' || event.nativeEvent.isComposing) return;
    event.preventDefault();
    submit();
  };

export const hasCode = (error: unknown, code: ApiError['code']): boolean =>
  error instanceof ApiError && error.code === code;

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

const toastLooks: Record<'deleted' | 'failed' | 'other', { icon: Icon; tone: ToastTone }> = {
  deleted: { icon: IconUserX, tone: 'neutral' },
  failed: { icon: IconWifiOff, tone: 'error' },
  other: { icon: IconAlertTriangle, tone: 'warning' },
};

export function ScreenToast() {
  const { toasts, dismiss, t } = useToasts();
  const toast = toasts[0];
  if (!toast) return null;
  const look = toast.action
    ? toastLooks.failed
    : toast.message === t('accountDeleted')
      ? toastLooks.deleted
      : toastLooks.other;
  return (
    <Toast
      key={toast.id}
      {...look}
      aboveBottomBar={false}
      message={toast.message}
      action={toast.action}
      duration={toast.duration}
      onHide={() => dismiss(toast.id)}
    />
  );
}

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

interface SignInState {
  accountDeleted?: boolean;
}

const deletedIn = (state: unknown): boolean =>
  typeof state === 'object' && state !== null && (state as SignInState).accountDeleted === true;

export interface SignInProps {
  onRedirect?: Redirect;
}

export function SignIn({ onRedirect = assignLocation }: SignInProps) {
  const { t } = useTranslation('SignIn');
  const navigate = useNavigate();
  const { state } = useLocation();
  const { signIn } = useAccount();
  const { toasts, show, t: tToast } = useToasts();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailEmpty, setEmailEmpty] = useState(false);
  const [passwordEmpty, setPasswordEmpty] = useState(false);
  const [wrong, setWrong] = useState(false);
  const [sending, setSending] = useState(false);

  const accountDeleted = deletedIn(state);
  const deletedMessage = tToast('accountDeleted');
  const deletedShown = toasts.some((toast) => toast.message === deletedMessage);

  useEffect(() => {
    if (accountDeleted && !deletedShown) show({ message: deletedMessage });
  }, []);

  const ready = email.trim() !== '' && password !== '' && !sending;

  const submit = () => {
    if (!ready) return;
    setSending(true);
    signIn({ email: email.trim(), password })
      .then(() => navigate('/combats'))
      .catch((error: unknown) => {
        setSending(false);
        if (hasCode(error, 'unauthorized') || hasCode(error, 'invalid')) setWrong(true);
      });
  };

  const onEnter = submitOnEnter(submit);

  return (
    <AuthScreen
      title={t('title')}
      subtitle={t('subtitle')}
      switchText={t('noAccount')}
      switchLabel={t('signUp')}
      switchTo="/auth/sign-up"
    >
      <TextField
        type="email"
        name="email"
        autoComplete="email"
        label={t('email')}
        placeholder={t('emailPlaceholder')}
        value={email}
        error={emailEmpty ? t('enterEmail') : undefined}
        onChange={(value) => {
          setEmail(value);
          setWrong(false);
          if (value.trim() !== '') setEmailEmpty(false);
        }}
        onBlur={() => setEmailEmpty(email.trim() === '')}
        onKeyDown={onEnter}
      />
      <TextField
        type="password"
        name="password"
        autoComplete="current-password"
        label={t('password')}
        placeholder={t('passwordPlaceholder')}
        value={password}
        error={wrong ? t('wrongCredentials') : passwordEmpty ? t('enterPassword') : undefined}
        onChange={(value) => {
          setPassword(value);
          setWrong(false);
          if (value !== '') setPasswordEmpty(false);
        }}
        onBlur={() => setPasswordEmpty(password === '')}
        onKeyDown={onEnter}
      />
      <Button variant="primary" size="M" fullWidth disabled={!ready} onClick={submit}>
        {t('submit')}
      </Button>
      <SocialButtons onRedirect={onRedirect} />
    </AuthScreen>
  );
}
