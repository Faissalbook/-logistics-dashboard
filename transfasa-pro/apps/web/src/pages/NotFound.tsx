import { label } from '@transfasa/i18n';
import { Link } from 'react-router-dom';

export function NotFoundPage() {
  return (
    <div className="card p-8 text-center">
      <p className="mb-4 text-lg font-semibold">{label('error.notFound')}</p>
      <Link to="/" className="btn-primary">
        {label('nav.dashboard')}
      </Link>
    </div>
  );
}
