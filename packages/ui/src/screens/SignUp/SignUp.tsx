import { emailSchema, passwordSchema } from '@combat-planner/api/client';
import { LIMITS } from '@combat-planner/domain';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import { Button } from '../../atoms/Button/Button.tsx';
import { TextField } from '../../atoms/TextField/TextField.tsx';
import { useAccount } from '../../hooks/useAccount.ts';
import {
  AuthScreen,
  SocialButtons,
  assignLocation,
  hasCode,
  submitOnEnter,
} from '../SignIn/SignIn.tsx';
import type { Redirect } from '../SignIn/SignIn.tsx';

export interface SignUpProps {
  onRedirect?: Redirect;
}

type Field = 'displayName' | 'email' | 'password';

export function SignUp({ onRedirect = assignLocation }: SignUpProps) {
  const { t } = useTranslation('SignUp');
  const navigate = useNavigate();
  const { signUp } = useAccount();
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [touched, setTouched] = useState<ReadonlySet<Field>>(new Set());
  const [takenEmail, setTakenEmail] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  const name = displayName.trim();
  const address = email.trim();
  const nameValid = name.length > 0 && name.length <= LIMITS.displayName;
  const emailValid = emailSchema.safeParse(address).success;
  const passwordValid = passwordSchema.safeParse(password).success;
  const taken = takenEmail !== null && takenEmail === address;
  const ready = nameValid && emailValid && passwordValid && !taken && !sending;

  const touch = (field: Field) => setTouched((current) => new Set(current).add(field));

  const nameError = touched.has('displayName') && name === '' ? t('enterName') : undefined;
  const emailError = taken
    ? t('emailTaken')
    : touched.has('email') && address === ''
      ? t('enterEmail')
      : touched.has('email') && !emailValid
        ? t('invalidEmail')
        : undefined;
  const passwordError = touched.has('password') && !passwordValid ? t('tooShort') : undefined;

  const submit = () => {
    if (!ready) return;
    setSending(true);
    signUp({ displayName: name, email: address, password })
      .then(() => navigate('/combats'))
      .catch((error: unknown) => {
        setSending(false);
        if (hasCode(error, 'invalid')) setTakenEmail(address);
      });
  };

  const onEnter = submitOnEnter(submit);

  return (
    <AuthScreen
      title={t('title')}
      subtitle={t('subtitle')}
      switchText={t('haveAccount')}
      switchLabel={t('signIn')}
      switchTo="/auth/sign-in"
    >
      <TextField
        name="displayName"
        autoComplete="nickname"
        label={t('displayName')}
        placeholder={t('displayNamePlaceholder')}
        maxLength={LIMITS.displayName}
        value={displayName}
        error={nameError}
        onChange={setDisplayName}
        onBlur={() => touch('displayName')}
        onKeyDown={onEnter}
      />
      <TextField
        type="email"
        name="email"
        autoComplete="email"
        label={t('email')}
        placeholder={t('emailPlaceholder')}
        value={email}
        error={emailError}
        onChange={setEmail}
        onBlur={() => touch('email')}
        onKeyDown={onEnter}
      />
      <TextField
        type="password"
        name="password"
        autoComplete="new-password"
        label={t('password')}
        placeholder={t('passwordPlaceholder')}
        value={password}
        error={passwordError}
        onChange={setPassword}
        onBlur={() => touch('password')}
        onKeyDown={onEnter}
      />
      <Button variant="primary" size="M" fullWidth disabled={!ready} onClick={submit}>
        {t('submit')}
      </Button>
      <SocialButtons onRedirect={onRedirect} />
    </AuthScreen>
  );
}
