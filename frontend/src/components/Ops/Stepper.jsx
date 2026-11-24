export default function Stepper({ steps, current, onChange, disabled }) {
  const index = steps.findIndex((step) => step.key === current);
  return <nav aria-label="Các bước bán vé"><ol className="o-steps">
    {steps.map((step, i) => <li key={step.key}>
      <button type="button" className="o-steps__item" disabled={disabled || i > index}
        aria-disabled={disabled || i > index} aria-current={i === index ? 'step' : undefined}
        onClick={() => onChange(step.key)}>
        <span aria-hidden="true">{i + 1}</span>{step.label}
      </button>
    </li>)}
  </ol></nav>;
}
