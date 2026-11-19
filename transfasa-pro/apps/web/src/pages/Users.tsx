import { ROLES, ROLE_LABELS, type Role, normaliseRoles } from '@transfasa/domain';
import { label, msg } from '@transfasa/i18n';
import { collection, onSnapshot, orderBy, query } from 'firebase/firestore';
import { Loader2, UserPlus, Users as UsersIcon } from 'lucide-react';
import { type FormEvent, useEffect, useState } from 'react';
import { useAuth } from '../auth/AuthProvider';
import { Stacked } from '../components/Bilingual';
import { EmptyState } from '../components/EmptyState';
import { errorMessage } from '../lib/errors';
import { callable, db } from '../lib/firebase';

interface UserRow {
  uid: string;
  fullName: string;
  email: string;
  phone: string | null;
  roles: Role[];
  disabled: boolean;
}

export function UsersPage() {
  const [users, setUsers] = useState<UserRow[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  useEffect(
    () =>
      onSnapshot(
        query(collection(db, 'users'), orderBy('fullName')),
        (snap) =>
          setUsers(
            snap.docs.map((d) => ({
              uid: d.id,
              fullName: String(d.get('fullName') ?? ''),
              email: String(d.get('email') ?? ''),
              phone: (d.get('phone') as string | null) ?? null,
              roles: normaliseRoles(d.get('roles')),
              disabled: Boolean(d.get('disabled')),
            })),
          ),
        (e) => setLoadError(errorMessage(e)),
      ),
    [],
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-brand-900">
          <Stacked k="users.title" />
        </h1>
        <button className="btn-primary" onClick={() => setShowCreate((v) => !v)}>
          <UserPlus size={18} aria-hidden />
          {label('users.create')}
        </button>
      </div>

      {showCreate && <CreateUserCard onDone={() => setShowCreate(false)} />}

      {loadError && (
        <p className="card p-4 text-sm text-red-700" role="alert">
          {loadError}
        </p>
      )}
      {users === null && !loadError && <Loader2 className="animate-spin text-cement-500" aria-label={label('app.loading')} />}
      {users?.length === 0 && <EmptyState icon={UsersIcon} title="empty.users" />}
      <div className="space-y-3">
        {users?.map((u) => (
          <UserCard key={u.uid} user={u} />
        ))}
      </div>
    </div>
  );
}

function RolePicker({ value, onChange, idPrefix }: { value: Role[]; onChange: (r: Role[]) => void; idPrefix: string }) {
  return (
    <div className="grid grid-cols-1 gap-1 sm:grid-cols-2">
      {ROLES.map((r) => {
        const id = `${idPrefix}-${r}`;
        return (
          <label key={r} htmlFor={id} className="flex min-h-[40px] cursor-pointer items-center gap-2 rounded-md px-2 hover:bg-cement-50">
            <input
              id={id}
              type="checkbox"
              className="h-4 w-4 accent-brand-700"
              checked={value.includes(r)}
              onChange={(e) => onChange(normaliseRoles(e.target.checked ? [...value, r] : value.filter((x) => x !== r)))}
            />
            <span className="text-sm">
              {ROLE_LABELS[r].fr} <span className="text-cement-500">/ {ROLE_LABELS[r].en}</span>
            </span>
          </label>
        );
      })}
    </div>
  );
}

function CreateUserCard({ onDone }: { onDone: () => void }) {
  const [form, setForm] = useState({ fullName: '', email: '', phone: '', password: '' });
  const [roles, setRoles] = useState<Role[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const next: Record<string, string> = {};
    if (!form.fullName.trim()) next.fullName = msg('validation.required');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) next.email = msg('validation.email');
    if (form.password.length < 8) next.password = msg('validation.passwordMin');
    if (roles.length === 0) next.roles = msg('validation.roleRequired');
    setErrors(next);
    if (Object.keys(next).length) return;
    setBusy(true);
    try {
      await callable('createUser')({ ...form, roles });
      onDone();
    } catch (err) {
      setErrors({ form: errorMessage(err) });
    } finally {
      setBusy(false);
    }
  };

  const field = (k: keyof typeof form, lk: Parameters<typeof label>[0], type = 'text') => (
    <div>
      <label htmlFor={`new-${k}`} className="field-label">
        {label(lk)}
      </label>
      <input
        id={`new-${k}`}
        type={type}
        className={`input ${errors[k] ? 'input-error' : ''}`}
        value={form[k]}
        onChange={set(k)}
        autoComplete="off"
      />
      {errors[k] && <p className="field-error">{errors[k]}</p>}
    </div>
  );

  return (
    <form onSubmit={submit} noValidate className="card space-y-4 p-5" aria-label={label('users.create')}>
      <div className="grid gap-4 sm:grid-cols-2">
        {field('fullName', 'users.fullName')}
        {field('email', 'auth.email', 'email')}
        {field('phone', 'users.phone', 'tel')}
        {field('password', 'users.tempPassword', 'text')}
      </div>
      <fieldset>
        <legend className="field-label">{label('users.roles')}</legend>
        <RolePicker value={roles} onChange={setRoles} idPrefix="new" />
        {errors.roles && <p className="field-error">{errors.roles}</p>}
      </fieldset>
      {errors.form && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
          {errors.form}
        </p>
      )}
      <div className="flex gap-2">
        <button type="submit" className="btn-primary" disabled={busy}>
          {busy && <Loader2 size={16} className="animate-spin" aria-hidden />}
          {label('users.create')}
        </button>
        <button type="button" className="btn-secondary" onClick={onDone}>
          {label('common.cancel')}
        </button>
      </div>
    </form>
  );
}

function UserCard({ user }: { user: UserRow }) {
  const { user: me } = useAuth();
  const [roles, setRoles] = useState<Role[]>(user.roles);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<{ ok: boolean; text: string } | null>(null);
  const dirty = roles.join() !== user.roles.join();
  const isMe = me?.uid === user.uid;

  useEffect(() => setRoles(user.roles), [user.roles]);

  const run = async (fn: () => Promise<unknown>, okText: string) => {
    setBusy(true);
    setFeedback(null);
    try {
      await fn();
      setFeedback({ ok: true, text: okText });
    } catch (err) {
      setFeedback({ ok: false, text: errorMessage(err) });
    } finally {
      setBusy(false);
    }
  };

  const save = () => {
    if (roles.length === 0) return setFeedback({ ok: false, text: msg('validation.roleRequired') });
    if (isMe && !roles.includes('OWNER')) return setFeedback({ ok: false, text: msg('users.cannotRemoveOwnOwner') });
    void run(() => callable('setUserRoles')({ uid: user.uid, roles }), msg('users.rolesSaved'));
  };

  return (
    <article className={`card p-4 ${user.disabled ? 'opacity-60' : ''}`} data-testid={`user-${user.email}`}>
      <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-semibold">{user.fullName}</p>
          <p className="text-sm text-cement-700">
            {user.email}
            {user.phone ? ` · ${user.phone}` : ''}
          </p>
        </div>
        <span
          className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
            user.disabled ? 'bg-cement-100 text-cement-700' : 'bg-emerald-50 text-emerald-700'
          }`}
        >
          {label(user.disabled ? 'users.disabled' : 'users.active')}
        </span>
      </div>
      <RolePicker value={roles} onChange={setRoles} idPrefix={user.uid} />
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button className="btn-primary" onClick={save} disabled={!dirty || busy}>
          {busy && <Loader2 size={16} className="animate-spin" aria-hidden />}
          {label('users.saveRoles')}
        </button>
        {!isMe && (
          <button
            className="btn-secondary"
            disabled={busy}
            onClick={() =>
              void run(
                () => callable('setUserDisabled')({ uid: user.uid, disabled: !user.disabled }),
                msg(user.disabled ? 'users.active' : 'users.disabled'),
              )
            }
          >
            {label(user.disabled ? 'users.enable' : 'users.disable')}
          </button>
        )}
        {feedback && (
          <span className={`text-sm ${feedback.ok ? 'text-emerald-700' : 'text-red-700'}`} role="status">
            {feedback.text}
          </span>
        )}
      </div>
    </article>
  );
}
