import type { DateRange, FinancePeriod } from './finance.helpers';

interface FinancePeriodSelectorProps {
  period: FinancePeriod;
  range: DateRange;
  customStart: string;
  customEnd: string;
  onPeriodChange: (period: FinancePeriod) => void;
  onCustomStartChange: (value: string) => void;
  onCustomEndChange: (value: string) => void;
}

export function FinancePeriodSelector({
  period,
  range,
  customStart,
  customEnd,
  onPeriodChange,
  onCustomStartChange,
  onCustomEndChange
}: FinancePeriodSelectorProps) {
  const periods: Array<[FinancePeriod, string]> = [
    ['today', 'Hoje'],
    ['week', 'Semana'],
    ['month', 'Mês'],
    ['custom', 'Personalizado']
  ];

  return (
    <div className="finance-v116-period-panel">
      <div
        className="finance-v116-period-tabs"
        role="group"
        aria-label="Período financeiro"
      >
        {periods.map(([value, label]) => (
          <button
            type="button"
            key={value}
            className={`text-button finance-period-button ${period === value ? 'active' : ''}`}
            onClick={() => onPeriodChange(value)}
          >
            {label}
          </button>
        ))}
      </div>

      {period === 'custom' ? (
        <div className="finance-v116-custom-range">
          <label>
            De
            <input
              type="date"
              value={customStart}
              onChange={event => onCustomStartChange(event.target.value)}
            />
          </label>
          <span>até</span>
          <label>
            Até
            <input
              type="date"
              value={customEnd}
              onChange={event => onCustomEndChange(event.target.value)}
            />
          </label>
        </div>
      ) : (
        <span className="finance-v116-range-label">{range.label}</span>
      )}
    </div>
  );
}
