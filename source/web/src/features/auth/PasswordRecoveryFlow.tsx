import { type FormEvent, useEffect, useState } from 'react';
import {
  getErrorMessage,
  getRetryAfterSeconds,
  requestPasswordRecovery,
  resetPassword,
  verifyPasswordRecoveryCode
} from '../../services';
import { PasswordField } from './PasswordField';

type RecoveryStep = 'email' | 'code' | 'password' | 'done';

interface PasswordRecoveryFlowProps {
  onLogin: () => void;
}

export function PasswordRecoveryFlow({ onLogin }: PasswordRecoveryFlowProps) {
  const [step, setStep] = useState<RecoveryStep>('email');
  const [email, setEmail] = useState('');
  const [maskedEmail, setMaskedEmail] = useState('');
  const [code, setCode] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [developmentCode, setDevelopmentCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendSeconds, setResendSeconds] = useState(0);
  const [expiresInMinutes, setExpiresInMinutes] = useState(10);

  useEffect(() => {
    if (resendSeconds <= 0) return undefined;
    const timer = window.setInterval(() => {
      setResendSeconds(current => Math.max(0, current - 1));
    }, 1_000);
    return () => window.clearInterval(timer);
  }, [resendSeconds > 0]);

  async function requestCode(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    if (resendSeconds > 0 && step === 'code') return;
    setLoading(true);
    setError('');

    try {
      const result = await requestPasswordRecovery(email);
      setMessage(result.message);
      setMaskedEmail(result.maskedEmail ?? 'seu e-mail');
      setDevelopmentCode(result.developmentCode ?? '');
      setResendSeconds(result.retryAfterSeconds ?? 60);
      setExpiresInMinutes(result.expiresInMinutes ?? 10);
      setCode('');
      setStep('code');
    } catch (requestError) {
      const retryAfter = getRetryAfterSeconds(requestError);
      if (retryAfter > 0) setResendSeconds(retryAfter);
      setError(getErrorMessage(requestError));
    } finally {
      setLoading(false);
    }
  }

  async function confirmCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError('');

    try {
      const result = await verifyPasswordRecoveryCode(email, code);
      setResetToken(result.resetToken);
      setMessage(result.message);
      setStep('password');
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setLoading(false);
    }
  }

  async function savePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('As duas senhas precisam ser iguais.');
      return;
    }

    if (!isStrongPassword(password)) {
      setError('Use pelo menos 8 caracteres, com uma letra e um número.');
      return;
    }

    setLoading(true);

    try {
      setMessage(await resetPassword(email, resetToken, password));
      setStep('done');
      setPassword('');
      setConfirmPassword('');
      setResetToken('');
      setDevelopmentCode('');
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-form">
      {step === 'email' ? (
        <form className="recovery-step" onSubmit={requestCode}>
          <RecoveryHeader
            eyebrow="Recuperar acesso"
            title="Esqueceu sua senha?"
            description="Digite o e-mail cadastrado na sua conta para receber um código de recuperação."
          />
          {error ? <div className="auth-error" role="alert">{error}</div> : null}
          <label>
            E-mail cadastrado
            <input
              type="email"
              autoComplete="email"
              value={email}
              onChange={event => setEmail(event.target.value)}
              placeholder="Ex.: joao@email.com"
              required
            />
            <small>Seu usuário curto continua sendo usado normalmente no login.</small>
          </label>
          <button type="submit" disabled={loading}>
            {loading ? 'Enviando...' : 'Enviar código de recuperação'}
          </button>
          <BackToLogin onClick={onLogin} />
        </form>
      ) : null}

      {step === 'code' ? (
        <form className="recovery-step" onSubmit={confirmCode}>
          <RecoveryHeader
            eyebrow="Código de verificação"
            title="Confira seu e-mail"
            description={
              `Digite o código de 6 dígitos enviado para ${maskedEmail}. `
              + `Ele expira em ${expiresInMinutes} minutos, aceita até 5 tentativas `
              + 'e só pode ser usado uma vez.'
            }
          />
          {message ? <div className="auth-info">{message}</div> : null}
          {developmentCode ? (
            <div className="auth-development-code">
              <strong>Modo local de teste</strong>
              <span>{developmentCode}</span>
              <small>Em produção este bloco desaparece e o código é enviado pelo serviço de e-mail configurado.</small>
            </div>
          ) : null}
          {error ? <div className="auth-error" role="alert">{error}</div> : null}
          <label>
            Código de 6 dígitos
            <input
              className="recovery-code-input"
              inputMode="numeric"
              autoComplete="one-time-code"
              value={code}
              onChange={event => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="000000"
              pattern="[0-9]{6}"
              aria-label="Código de recuperação de 6 dígitos"
              required
              autoFocus
            />
          </label>
          <button type="submit" disabled={loading || code.length !== 6}>
            {loading ? 'Confirmando...' : 'Confirmar código'}
          </button>
          <button
            type="button"
            className="secondary-button"
            onClick={() => void requestCode()}
            disabled={loading || resendSeconds > 0}
          >
            {resendSeconds > 0 ? `Reenviar código em ${resendSeconds}s` : 'Reenviar código'}
          </button>
          <button
            type="button"
            className="text-button"
            onClick={() => {
              setError('');
              setMessage('');
              setCode('');
              setDevelopmentCode('');
              setResendSeconds(0);
              setStep('email');
            }}
          >
            Usar outro e-mail
          </button>
          <BackToLogin onClick={onLogin} />
        </form>
      ) : null}

      {step === 'password' ? (
        <form className="recovery-step" onSubmit={savePassword}>
          <RecoveryHeader
            eyebrow="Nova senha"
            title="Crie uma nova senha"
            description={
              'A nova senha precisa ser diferente da anterior. '
              + 'Ao salvar, todas as sessões antigas serão encerradas.'
            }
          />
          {error ? <div className="auth-error" role="alert">{error}</div> : null}
          <PasswordField
            label="Nova senha"
            autoComplete="new-password"
            value={password}
            onChange={setPassword}
            minLength={8}
            hint="Pelo menos 8 caracteres, uma letra e um número."
          />
          <PasswordField
            label="Confirmar nova senha"
            autoComplete="new-password"
            value={confirmPassword}
            onChange={setConfirmPassword}
            minLength={8}
          />
          <PasswordChecklist password={password} matches={password === confirmPassword} />
          <button type="submit" disabled={loading || !isStrongPassword(password) || password !== confirmPassword}>
            {loading ? 'Salvando...' : 'Salvar nova senha'}
          </button>
          <BackToLogin onClick={onLogin} />
        </form>
      ) : null}

      {step === 'done' ? (
        <section className="recovery-step recovery-success">
          <div className="recovery-success-icon">✓</div>
          <RecoveryHeader
            eyebrow="Acesso recuperado"
            title="Senha alterada com sucesso"
            description={message || 'Sua nova senha já está pronta para uso.'}
          />
          <p className="muted">Por segurança, você precisa entrar novamente. As sessões anteriores foram encerradas.</p>
          <button type="button" onClick={onLogin}>Voltar para o login</button>
        </section>
      ) : null}
    </div>
  );
}

function RecoveryHeader(props: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <header>
      <span className="eyebrow">{props.eyebrow}</span>
      <h2>{props.title}</h2>
      <p>{props.description}</p>
    </header>
  );
}

function BackToLogin({ onClick }: { onClick: () => void }) {
  return (
    <button className="text-button" type="button" onClick={onClick}>
      Voltar para o login
    </button>
  );
}

function PasswordChecklist(props: { password: string; matches: boolean }) {
  return (
    <div className="password-checklist" aria-live="polite">
      <span className={props.password.length >= 8 ? 'ok' : ''}>✓ 8 caracteres</span>
      <span className={/[A-Za-zÀ-ÿ]/.test(props.password) ? 'ok' : ''}>✓ uma letra</span>
      <span className={/\d/.test(props.password) ? 'ok' : ''}>✓ um número</span>
      <span className={props.password && props.matches ? 'ok' : ''}>✓ senhas iguais</span>
    </div>
  );
}

function isStrongPassword(password: string): boolean {
  return password.length >= 8 && /[A-Za-zÀ-ÿ]/.test(password) && /\d/.test(password);
}
