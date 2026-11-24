import { useEffect } from 'react';

export default function OpsPage({ title, description, actions, children, className = '', ...props }) {
  useEffect(() => { document.title = title + ' · MoviePTIT'; }, [title]);
  return (
    <div className={'o-page ' + className} {...props}>
      <header className="o-page__head">
        <div>
          <h1 id="ops-page-title" tabIndex={-1}>{title}</h1>
          {description && <p className="o-page__description">{description}</p>}
        </div>
        {actions && <div className="o-actions">{actions}</div>}
      </header>
      {children}
    </div>
  );
}
