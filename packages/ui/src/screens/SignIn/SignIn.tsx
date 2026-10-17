import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import { Button } from '../../atoms/Button/Button.tsx';
import { TextField } from '../../atoms/TextField/TextField.tsx';
import { useAccount } from '../../hooks/useAccount.ts';
import { AuthScreen } from '../shared/AuthScreen.tsx';
import { hasCode } from '../shared/hasCode.ts';
import { SocialButtons, assignLocation } from '../shared/SocialButtons.tsx';
import type { Redirect } from '../shared/SocialButtons.tsx';
import { submitOnEnter } from '../shared/submitOnEnter.ts';

export interface SignInProps {
  onRedirect?: Redirect;
}

export function SignIn({ onRedirect = assignLocation }: SignInProps) {
  const { t } = useTranslation('SignIn');
  const navigate = useNavigate();
  const { signIn } = useAccount();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailEmpty, setEmailEmpty] = useState(false);
  const [passwordEmpty, setPasswordEmpty] = useState(false);
  const [wrong, setWrong] = useState(false);
  const [sending, setSending] = useState(false);

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
