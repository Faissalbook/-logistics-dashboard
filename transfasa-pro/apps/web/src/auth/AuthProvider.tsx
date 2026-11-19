import { type Role, normaliseRoles } from '@transfasa/domain';
import { type User, onIdTokenChanged, signInWithEmailAndPassword, signOut as fbSignOut } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { type ReactNode, createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { auth, callable, db } from '../lib/firebase';

interface Profile {
  fullName: string;
  email: string;
}

interface AuthState {
  status: 'loading' | 'signedOut' | 'signedIn';
  user: User | null;
  roles: Role[];
  profile: Profile | null;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthState['status']>('loading');
  const [user, setUser] = useState<User | null>(null);
  const [roles, setRoles] = useState<Role[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const lastRolesStamp = useRef<number | null>(null);

  // Roles come from the ID token (custom claims) — the same source the server and rules trust.
  useEffect(
    () =>
      onIdTokenChanged(auth, async (u) => {
        setUser(u);
        if (!u) {
          setRoles([]);
          setProfile(null);
          setStatus('signedOut');
          return;
        }
        const token = await u.getIdTokenResult();
        setRoles(normaliseRoles(token.claims.roles));
        setStatus('signedIn');
      }),
    [],
  );

  // When the owner changes this user's roles, refresh the token so claims update without re-login.
  useEffect(() => {
    if (!user) return;
    lastRolesStamp.current = null;
    return onSnapshot(
      doc(db, 'users', user.uid),
      (snap) => {
        const data = snap.data();
        if (!data) return;
        setProfile({ fullName: String(data.fullName ?? ''), email: String(data.email ?? user.email ?? '') });
        const stamp = data.rolesUpdatedAt?.toMillis?.() ?? null;
        if (lastRolesStamp.current !== null && stamp !== lastRolesStamp.current) void user.getIdToken(true);
        lastRolesStamp.current = stamp;
      },
      () => undefined,
    );
  }, [user]);

  const signIn = useCallback(async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email.trim(), password);
    // Audit the sign-in (AUD-04); never block the user on it.
    void callable('recordSession')().catch(() => undefined);
  }, []);

  const signOut = useCallback(() => fbSignOut(auth), []);

  const value = useMemo(
    () => ({ status, user, roles, profile, signIn, signOut }),
    [status, user, roles, profile, signIn, signOut],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
