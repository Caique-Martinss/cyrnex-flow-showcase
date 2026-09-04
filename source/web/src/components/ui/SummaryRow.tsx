interface SummaryRowProps {
  label: string;
  value: string;
  strong?: boolean;
}

export function SummaryRow({
  label,
  value,
  strong = false
}: SummaryRowProps) {
  return (
    <div className={`summary-row ${strong ? 'strong' : ''}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
