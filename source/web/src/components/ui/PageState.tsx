interface LoadingStateProps {
  title?: string;
  text?: string;
}

export function LoadingState({
  title = 'Preparando a barbearia',
  text = 'Carregando agenda, clientes e caixa.'
}: LoadingStateProps) {
  return (
    <main className="state-page">
      <div className="spinner" />
      <h1>{title}</h1>
      <p>{text}</p>
    </main>
  );
}

interface ErrorStateProps {
  message: string;
  onRetry: () => void;
}

export function ErrorState({ message, onRetry }: ErrorStateProps) {
  return (
    <main className="state-page">
      <span className="state-icon">!</span>
      <h1>Não foi possível abrir o sistema</h1>
      <p>{message}</p>
      <button onClick={onRetry}>Tentar novamente</button>
    </main>
  );
}
