/** Bilingual labels (PRD CNV-05). French first. Keys are stable English identifiers. */
export const DICTIONARY = {
  // App
  'app.name': { fr: 'TransFasa Pro', en: 'TransFasa Pro' },
  'app.company': { fr: 'TransFasa Guinée', en: 'TransFasa Guinée' },
  'app.loading': { fr: 'Chargement…', en: 'Loading…' },

  // Navigation
  'nav.dashboard': { fr: 'Tableau de bord', en: 'Dashboard' },
  'nav.import': { fr: 'Import', en: 'Import' },
  'nav.fleet': { fr: 'Flotte', en: 'Fleet' },
  'nav.trips': { fr: 'Voyages', en: 'Trips' },
  'nav.expenses': { fr: 'Charges', en: 'Expenses' },
  'nav.reports': { fr: 'Rapports', en: 'Reports' },
  'nav.admin': { fr: 'Administration', en: 'Administration' },
  'nav.users': { fr: 'Utilisateurs', en: 'Users' },
  'nav.audit': { fr: 'Journal d’audit', en: 'Audit log' },
  'nav.more': { fr: 'Plus', en: 'More' },

  // Auth
  'auth.signIn': { fr: 'Se connecter', en: 'Sign in' },
  'auth.signOut': { fr: 'Se déconnecter', en: 'Sign out' },
  'auth.email': { fr: 'E-mail', en: 'Email' },
  'auth.password': { fr: 'Mot de passe', en: 'Password' },
  'auth.invalidCredentials': { fr: 'E-mail ou mot de passe incorrect', en: 'Incorrect email or password' },
  'auth.tooManyAttempts': { fr: 'Trop de tentatives, réessayez plus tard', en: 'Too many attempts, try again later' },
  'auth.noRole': {
    fr: 'Aucun rôle attribué à ce compte. Contactez le gérant.',
    en: 'No role assigned to this account. Contact the owner.',
  },
  'auth.disabled': { fr: 'Compte désactivé', en: 'Account disabled' },

  // Validation
  'validation.required': { fr: 'Champ requis', en: 'Required field' },
  'validation.email': { fr: 'E-mail invalide', en: 'Invalid email' },
  'validation.passwordMin': { fr: 'Au moins 8 caractères', en: 'At least 8 characters' },
  'validation.roleRequired': { fr: 'Choisir au moins un rôle', en: 'Select at least one role' },

  // Errors
  'error.generic': { fr: 'Une erreur est survenue', en: 'Something went wrong' },
  'error.permissionDenied': { fr: 'Accès refusé', en: 'Permission denied' },
  'error.offline': { fr: 'Hors ligne', en: 'Offline' },
  'error.notFound': { fr: 'Page introuvable', en: 'Page not found' },

  // Empty states
  'empty.trips': { fr: 'Aucun voyage', en: 'No trips yet' },
  'empty.vehicles': { fr: 'Aucun véhicule', en: 'No vehicles yet' },
  'empty.expenses': { fr: 'Aucune charge', en: 'No expenses yet' },
  'empty.imports': { fr: 'Aucun import en cours', en: 'No imports in progress' },
  'empty.audit': { fr: 'Aucune entrée', en: 'No entries yet' },
  'empty.users': { fr: 'Aucun utilisateur', en: 'No users yet' },
  'empty.comingInPhase': { fr: 'Disponible en phase', en: 'Available in phase' },

  // Users & roles
  'users.title': { fr: 'Utilisateurs et rôles', en: 'Users & roles' },
  'users.create': { fr: 'Créer un utilisateur', en: 'Create user' },
  'users.fullName': { fr: 'Nom complet', en: 'Full name' },
  'users.phone': { fr: 'Téléphone', en: 'Phone' },
  'users.roles': { fr: 'Rôles', en: 'Roles' },
  'users.status': { fr: 'Statut', en: 'Status' },
  'users.active': { fr: 'Actif', en: 'Active' },
  'users.disabled': { fr: 'Désactivé', en: 'Disabled' },
  'users.disable': { fr: 'Désactiver', en: 'Disable' },
  'users.enable': { fr: 'Réactiver', en: 'Enable' },
  'users.saveRoles': { fr: 'Enregistrer les rôles', en: 'Save roles' },
  'users.tempPassword': { fr: 'Mot de passe provisoire', en: 'Temporary password' },
  'users.created': { fr: 'Utilisateur créé', en: 'User created' },
  'users.rolesSaved': { fr: 'Rôles enregistrés', en: 'Roles saved' },
  'users.cannotRemoveOwnOwner': {
    fr: 'Vous ne pouvez pas retirer votre propre rôle de gérant',
    en: 'You cannot remove your own owner role',
  },

  // Audit
  'audit.title': { fr: 'Journal d’audit', en: 'Audit log' },
  'audit.at': { fr: 'Date', en: 'Date' },
  'audit.actor': { fr: 'Auteur', en: 'Actor' },
  'audit.action': { fr: 'Action', en: 'Action' },
  'audit.entity': { fr: 'Objet', en: 'Entity' },
  'audit.verify': { fr: 'Vérifier la chaîne', en: 'Verify chain' },
  'audit.chainOk': { fr: 'Chaîne intègre', en: 'Chain intact' },
  'audit.chainBroken': { fr: 'Chaîne rompue à l’entrée', en: 'Chain broken at entry' },
  'audit.entries': { fr: 'entrées', en: 'entries' },

  // Common
  'common.save': { fr: 'Enregistrer', en: 'Save' },
  'common.cancel': { fr: 'Annuler', en: 'Cancel' },
  'common.close': { fr: 'Fermer', en: 'Close' },
  'common.yes': { fr: 'Oui', en: 'Yes' },
  'common.no': { fr: 'Non', en: 'No' },
  'common.total': { fr: 'Total', en: 'Total' },
  'common.saving': { fr: 'Enregistrement…', en: 'Saving…' },
} as const satisfies Record<string, { fr: string; en: string }>;

export type LabelKey = keyof typeof DICTIONARY;
