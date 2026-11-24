export default function Segmented({ options, value, onChange, label, className = '', ...props }) {
  return (
    <div className={'o-segmented ' + className} role="group" aria-label={label} {...props}>
      {options.map((option) => (
        <button type="button" className="o-segmented__option" key={option.value}
          disabled={option.disabled} aria-pressed={value === option.value} onClick={() => onChange(option.value)}>
          {option.label}
        </button>
      ))}
    </div>
  );
}
