import { useState, type FormEvent } from 'react';

interface Props {
  submitting: boolean;
  error: string;
  onSubmit: (username: string, password: string, rememberMe: boolean) => Promise<boolean>;
}

export function PlatformAdminLogin({ submitting, error, onSubmit }: Props) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);

  function submit(event: FormEvent) {
    event.preventDefault();
    void onSubmit(username, password, rememberMe);
  }

  return (
    <main className="platform-admin-login">
      <form className="platform-admin-login-card" onSubmit={submit}>
        <div className="platform-admin-logo">CRX</div>
        <span>CYRNEX ADMIN</span>
        <h1>Controle da plataforma</h1>
        <p>
          Área restrita da CYRNEX. Use o mesmo usuário e senha da sua conta; somente contas
          autorizadas como Admin entram aqui.
        </p>
        <label>
          <span>Usuário</span>
          <input value={username} onChange={event => setUsername(event.target.value)} autoComplete="username" />
        </label>
        <label>
          <span>Senha</span>
          <input
            type="password"
            value={password}
            onChange={event => setPassword(event.target.value)}
            autoComplete="current-password"
          />
        </label>
        <label className="platform-admin-remember">
          <input
            type="checkbox"
            checked={rememberMe}
            onChange={event => setRememberMe(event.target.checked)}
          />
          <span>Manter sessão neste dispositivo</span>
        </label>
        {error ? <div className="platform-admin-error">{error}</div> : null}
        <button type="submit" disabled={submitting || !username.trim() || !password}>
          {submitting ? 'Entrando...' : 'Entrar no Admin'}
        </button>
        <a className="platform-admin-back-link" href="/">Voltar ao CYRNEX FLOW</a>
      </form>
    </main>
  );
}
