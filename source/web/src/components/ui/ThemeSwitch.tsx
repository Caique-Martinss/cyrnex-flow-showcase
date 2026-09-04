import type { Theme } from '../../hooks/useTheme';

interface ThemeSwitchProps {
  theme: Theme;
  onChange: (theme: Theme) => void;
  label?: string;
  compact?: boolean;
}

export function ThemeSwitch({
  theme,
  onChange,
  label = 'Tema do sistema',
  compact = false
}: ThemeSwitchProps) {
  return (
    <div
      className={compact ? 'theme-switch compact' : 'theme-switch'}
      role="group"
      aria-label={label}
    >
      <button
        className={theme === 'light' ? 'active' : ''}
        type="button"
        aria-pressed={theme === 'light'}
        onClick={() => onChange('light')}
      >
        <span aria-hidden="true">☀</span>
        <span className="theme-switch-label">Claro</span>
      </button>
      <button
        className={theme === 'dark' ? 'active' : ''}
        type="button"
        aria-pressed={theme === 'dark'}
        onClick={() => onChange('dark')}
      >
        <span aria-hidden="true">◐</span>
        <span className="theme-switch-label">Escuro</span>
      </button>
    </div>
  );
}
