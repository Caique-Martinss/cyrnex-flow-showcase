import { useState } from 'react';

interface PasswordFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete: string;
  placeholder?: string;
  minLength?: number;
  hint?: string;
  required?: boolean;
}

export function PasswordField(props: PasswordFieldProps) {
  const [visible, setVisible] = useState(false);

  return (
    <label>
      {props.label}
      <div className="password-input-wrap">
        <input
          type={visible ? 'text' : 'password'}
          autoComplete={props.autoComplete}
          value={props.value}
          onChange={event => props.onChange(event.target.value)}
          placeholder={props.placeholder}
          minLength={props.minLength}
          required={props.required ?? true}
        />
        <button
          type="button"
          className="password-toggle"
          onClick={() => setVisible(current => !current)}
          aria-label={visible ? 'Ocultar senha' : 'Mostrar senha'}
          title={visible ? 'Ocultar senha' : 'Mostrar senha'}
        >
          {visible ? 'Ocultar' : 'Ver'}
        </button>
      </div>
      {props.hint ? <small>{props.hint}</small> : null}
    </label>
  );
}
