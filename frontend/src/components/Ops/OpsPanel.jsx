import { useId } from 'react';

export default function OpsPanel({ title, description, actions, flush, children, className = '', ...props }) {
  const titleId = useId();
  return (
    <section aria-labelledby={title ? titleId : undefined} className={'o-panel ' + className} {...props}>
      {(title || description || actions) && (
        <header className="o-panel__head">
          <div>
            {title && <h2 id={titleId}>{title}</h2>}
            {description && <p className="o-panel__description">{description}</p>}
          </div>
          {actions && <div className="o-actions">{actions}</div>}
        </header>
      )}
      <div className={flush ? 'o-panel__body o-panel__body--flush' : 'o-panel__body'}>{children}</div>
    </section>
  );
}
