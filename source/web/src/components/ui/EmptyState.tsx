interface EmptyStateProps {
  title: string;
  text: string;
}

export function EmptyState({ title, text }: EmptyStateProps) {
  return (
    <div className="empty-state">
      <span>＋</span>
      <strong>{title}</strong>
      <p>{text}</p>
    </div>
  );
}
