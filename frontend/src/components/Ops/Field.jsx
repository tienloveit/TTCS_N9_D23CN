import { cloneElement, isValidElement, useId } from 'react';
import { AlertCircleIcon } from '../Common/CinemaIcons';

export function Field({ label, hint, error, required, id, children, className = '', ...props }) {
  const generatedId = useId();
  const child = isValidElement(children) ? children : null;
  const inputId = id || child?.props.id || generatedId;
  const describedBy = [child?.props['aria-describedby'], hint && inputId + '-hint', error && inputId + '-error'].filter(Boolean).join(' ');
  return (
    <div className={'o-field ' + className} {...props}>
      {label && <label className="o-field__label" htmlFor={inputId}>
        {label}{required && <> <span aria-hidden="true">*</span><span className="o-sr-only"> bắt buộc</span></>}
      </label>}
      {child ? cloneElement(child, { id: inputId, required: required || child.props.required,
        'aria-invalid': error ? true : child.props['aria-invalid'], 'aria-describedby': describedBy || undefined }) : children}
      {hint && <span id={inputId + '-hint'} className="o-field__hint">{hint}</span>}
      {error && <span id={inputId + '-error'} className="o-field__error"><AlertCircleIcon size={16} />{error}</span>}
    </div>
  );
}

export function TextInput({ className = '', ...props }) {
  return <input className={'o-input ' + className} {...props} />;
}

export function Select({ className = '', ...props }) {
  return <select className={'o-input ' + className} {...props} />;
}

export function Textarea({ className = '', ...props }) {
  return <textarea className={'o-input o-textarea ' + className} {...props} />;
}

export function Checkbox({ className = '', ...props }) {
  return <input type="checkbox" className={'o-checkbox ' + className} {...props} />;
}

export function Switch({ className = '', ...props }) {
  return <input type="checkbox" role="switch" className={'o-switch ' + className} {...props} />;
}

export function ChoiceCards({ options, value, onChange, name, label, className = '', ...props }) {
  const id = useId();
  return (
    <fieldset className={'o-choices ' + className} {...props}>
      {label && <legend className="o-field__label">{label}</legend>}
      <div className="o-choices__list">
        {options.map((option) => (
          <label key={option.value} className="o-choice" data-selected={option.value === value || undefined}>
            <input type="radio" name={name || id} value={option.value} checked={option.value === value}
              disabled={option.disabled} onChange={() => onChange(option.value)} />
            <span>{option.label}{option.description && <small>{option.description}</small>}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
