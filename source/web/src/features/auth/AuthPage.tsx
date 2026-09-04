import { type FormEvent, useState } from 'react';
import { ThemeSwitch } from '../../components/ui/ThemeSwitch';
import { useTheme } from '../../hooks/useTheme';
import type { LoginInput, RegisterInput } from '../../services';
import { PasswordField } from './PasswordField';
import { PasswordRecoveryFlow } from './PasswordRecoveryFlow';

interface AuthPageProps {
  submitting: boolean;
  error: string;
  onLogin: (input: LoginInput) => Promise<boolean>;
  onRegister: (input: RegisterInput) => Promise<boolean>;
  onClearError: () => void;
}

type AuthMode = 'login' | 'register' | 'recovery';

export function AuthPage(props: AuthPageProps) {
  const [mode, setMode] = useState<AuthMode>('login');
  const { theme, setTheme } = useTheme('auth');

  function changeMode(nextMode: AuthMode) {
    props.onClearError();
    setMode(nextMode);
  }

  return (
    <main className="auth-screen">
      <section className="auth-showcase">
        <div className="auth-brand">
          <span className="brand-mark">CRX</span>
          <div>
            <strong>CYRNEX FLOW</strong>
            <small>Operação, agenda e experiência do cliente</small>
          </div>
        </div>

        <div className="auth-showcase-copy">
          <span className="eyebrow">Gestão premium para barbearias</span>
          <h1>Sua operação inteira em um único lugar.</h1>
          <p>
            Entre para acompanhar agenda, clientes, equipe, financeiro e sua
            Página Pública com a mesma experiência simples e profissional.
          </p>
        </div>

        <div className="auth-showcase-visual" aria-hidden="true">
          <div className="auth-visual-head">
            <span>Hoje</span>
            <strong>Operação em andamento</strong>
          </div>
          <div className="auth-visual-grid">
            <div className="auth-visual-stat">
              <span>Agenda</span>
              <strong>8</strong>
              <small>atendimentos</small>
            </div>
            <div className="auth-visual-stat">
              <span>Clientes</span>
              <strong>3</strong>
              <small>novos no período</small>
            </div>
          </div>
          <div className="auth-visual-agenda">
            <span className="auth-time">14:30</span>
            <span className="auth-avatar">JM</span>
            <span><strong>João Martins</strong><small>Corte + barba</small></span>
            <em>Confirmado</em>
          </div>
          <div className="auth-visual-agenda muted-row">
            <span className="auth-time">15:45</span>
            <span className="auth-avatar">RA</span>
            <span><strong>Rafael Alves</strong><small>Corte clássico</small></span>
            <em>Agendado</em>
          </div>
        </div>

        <div className="auth-feature-list">
          <span>Agenda e disponibilidade integradas</span>
          <span>Página Pública conectada ao painel</span>
          <span>Dados separados e protegidos por barbearia</span>
        </div>
      </section>

      <section className="auth-panel">
        <div className="auth-panel-inner">
          <div className="auth-panel-toolbar">
            <div>
              <span className="auth-secure-dot" />
              Acesso seguro
            </div>
            <ThemeSwitch
              theme={theme}
              onChange={setTheme}
              label="Tema da tela de acesso"
              compact
            />
          </div>

          <div className="auth-card">
            {mode === 'login' ? (
              <LoginForm
                submitting={props.submitting}
                error={props.error}
                onSubmit={props.onLogin}
                onRegister={() => changeMode('register')}
                onRecovery={() => changeMode('recovery')}
              />
            ) : null}

            {mode === 'register' ? (
              <RegisterForm
                submitting={props.submitting}
                error={props.error}
                onSubmit={props.onRegister}
                onLogin={() => changeMode('login')}
              />
            ) : null}

            {mode === 'recovery' ? (
              <PasswordRecoveryFlow onLogin={() => changeMode('login')} />
            ) : null}
          </div>

          <p className="auth-panel-footnote">
            Sessão protegida • acesso individual • cada empresa permanece isolada
          </p>
        </div>
      </section>
    </main>
  );
}

interface LoginFormProps {
  submitting: boolean;
  error: string;
  onSubmit: (input: LoginInput) => Promise<boolean>;
  onRegister: () => void;
  onRecovery: () => void;
}

function LoginForm(props: LoginFormProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await props.onSubmit({ username, password, rememberMe });
  }

  return (
    <form className="auth-form" onSubmit={submit}>
      <header>
        <span className="eyebrow">Bem-vindo de volta</span>
        <h2>Entre no seu painel</h2>
        <p>Use seu usuário curto e sua senha. Seu e-mail fica somente para recuperação e segurança.</p>
      </header>

      {props.error ? <div className="auth-error">{props.error}</div> : null}

      <label>
        Usuário
        <input
          autoComplete="username"
          value={username}
          onChange={event => setUsername(event.target.value)}
          placeholder="Ex.: joao"
          required
        />
        <small>É o nome de acesso que você escolheu ao criar a conta.</small>
      </label>

      <PasswordField
        label="Senha"
        autoComplete="current-password"
        value={password}
        onChange={setPassword}
        placeholder="Sua senha"
      />

      <div className="auth-login-options">
        <label className="auth-check-row">
          <input
            type="checkbox"
            checked={rememberMe}
            onChange={event => setRememberMe(event.target.checked)}
          />
          <span>Manter conectado neste dispositivo</span>
        </label>

        <button className="text-button" type="button" onClick={props.onRecovery}>
          Esqueci minha senha
        </button>
      </div>

      <button className="auth-primary-action" type="submit" disabled={props.submitting}>
        {props.submitting ? 'Entrando...' : 'Entrar no painel'}
      </button>

      <div className="auth-divider"><span>Primeiro acesso?</span></div>

      <button className="secondary-button auth-create-action" type="button" onClick={props.onRegister}>
        Criar minha barbearia
      </button>
    </form>
  );
}

interface RegisterFormProps {
  submitting: boolean;
  error: string;
  onSubmit: (input: RegisterInput) => Promise<boolean>;
  onLogin: () => void;
}

function RegisterForm(props: RegisterFormProps) {
  const [displayName, setDisplayName] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [localError, setLocalError] = useState('');

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLocalError('');

    if (password !== confirmPassword) {
      setLocalError('As duas senhas precisam ser iguais.');
      return;
    }

    if (!isStrongPassword(password)) {
      setLocalError('Use pelo menos 8 caracteres, com uma letra e um número.');
      return;
    }

    await props.onSubmit({
      displayName,
      businessName,
      username,
      email,
      password,
      rememberMe: true
    });
  }

  return (
    <form className="auth-form" onSubmit={submit}>
      <header>
        <span className="eyebrow">Primeiro acesso</span>
        <h2>Crie sua conta e sua primeira barbearia</h2>
        <p>
          Você entra como proprietário e segue direto para uma configuração guiada.
          Depois poderá adicionar equipe e novas unidades.
        </p>
      </header>

      {props.error || localError ? (
        <div className="auth-error">{props.error || localError}</div>
      ) : null}

      <div className="auth-two-columns">
        <label>
          Seu nome
          <input
            value={displayName}
            onChange={event => setDisplayName(event.target.value)}
            placeholder="Ex.: João Silva"
            required
          />
        </label>

        <label>
          Nome da barbearia
          <input
            value={businessName}
            onChange={event => setBusinessName(event.target.value)}
            placeholder="Ex.: Barbearia do João"
            required
          />
        </label>
      </div>

      <label>
        Criar usuário de acesso
        <input
          autoComplete="username"
          value={username}
          onChange={event => setUsername(event.target.value.toLowerCase())}
          placeholder="Ex.: joao"
          required
        />
        <small>Você vai usar esse nome no dia a dia para entrar no sistema.</small>
      </label>

      <label>
        E-mail de recuperação
        <input
          type="email"
          autoComplete="email"
          value={email}
          onChange={event => setEmail(event.target.value)}
          placeholder="Ex.: joao@email.com"
          required
        />
        <small>O e-mail fica para recuperação e segurança, não para o login diário.</small>
      </label>

      <div className="auth-two-columns">
        <PasswordField
          label="Criar senha"
          autoComplete="new-password"
          value={password}
          onChange={setPassword}
          minLength={8}
          hint="Pelo menos 8 caracteres, uma letra e um número."
        />

        <PasswordField
          label="Confirmar senha"
          autoComplete="new-password"
          value={confirmPassword}
          onChange={setConfirmPassword}
          minLength={8}
        />
      </div>

      <button className="auth-primary-action" type="submit" disabled={props.submitting}>
        {props.submitting ? 'Criando conta...' : 'Criar conta e começar configuração'}
      </button>

      <button className="text-button" type="button" onClick={props.onLogin}>
        Já tenho uma conta
      </button>
    </form>
  );
}

function isStrongPassword(password: string): boolean {
  return password.length >= 8 && /[A-Za-zÀ-ÿ]/.test(password) && /\d/.test(password);
}
