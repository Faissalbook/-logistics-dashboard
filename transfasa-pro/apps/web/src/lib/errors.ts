import { msg } from '@transfasa/i18n';

/** Turn a Firebase/Functions error into a bilingual message for inline display. */
export function errorMessage(e: unknown): string {
  const code = String((e as { code?: string })?.code ?? '');
  const message = (e as { message?: string })?.message;
  if (code.startsWith('functions/') && message && code !== 'functions/internal') return message;
  switch (code) {
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
    case 'auth/invalid-email':
      return msg('auth.invalidCredentials');
    case 'auth/too-many-requests':
      return msg('auth.tooManyAttempts');
    case 'auth/user-disabled':
      return msg('auth.disabled');
    case 'permission-denied':
    case 'functions/permission-denied':
      return msg('error.permissionDenied');
    case 'unavailable':
    case 'auth/network-request-failed':
      return msg('error.offline');
    default:
      return msg('error.generic');
  }
}
