import { useId, useRef } from 'react';

export default function Tabs({ options, value, onChange, label, children, className = '', ...props }) {
  const id = useId();
  const list = useRef(null);
  function moveFocus(event, index) {
    const enabled = options.map((option, i) => option.disabled ? -1 : i).filter((i) => i >= 0);
    const position = enabled.indexOf(index);
    const key = event.key;
    if (!['ArrowRight', 'ArrowLeft', 'Home', 'End'].includes(key)) return;
    event.preventDefault();
    let next = key === 'Home' ? enabled[0] : enabled[enabled.length - 1];
    if (key.startsWith('Arrow')) {
      const offset = key === 'ArrowRight' ? 1 : -1;
      next = enabled[(position + offset + enabled.length) % enabled.length];
    }
    list.current.children[next].focus();
    onChange(options[next].value);
  }
  return (
    <div className={'o-tabs ' + className} {...props}>
      <div role="tablist" ref={list} className="o-tabs__list" aria-label={label}>
        {options.map((option, index) => (
          <button key={option.value} type="button" role="tab" className="o-tabs__tab" id={id + '-tab-' + index}
            aria-controls={id + '-panel-' + index} aria-selected={option.value === value}
            tabIndex={option.value === value ? 0 : -1} disabled={option.disabled}
            onClick={() => onChange(option.value)} onKeyDown={(event) => moveFocus(event, index)}>
            {option.label}
          </button>
        ))}
      </div>
      {options.map((option, index) => (
        <div key={option.value} role="tabpanel" id={id + '-panel-' + index} aria-labelledby={id + '-tab-' + index}
          tabIndex={0} hidden={option.value !== value}>
          {option.value === value && (option.content ?? children)}
        </div>
      ))}
    </div>
  );
}
