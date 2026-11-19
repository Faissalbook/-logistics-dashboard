import type { Permission } from '@transfasa/domain';
import type { LabelKey } from '@transfasa/i18n';
import {
  ClipboardList,
  FileBarChart,
  Home,
  type LucideIcon,
  Receipt,
  ScrollText,
  Ship,
  Truck,
  Users,
} from 'lucide-react';

export interface NavItem {
  path: string;
  label: LabelKey;
  icon: LucideIcon;
  /** null = visible to any user with at least one role */
  perm: Permission | null;
  /** Phase in which the screen ships (PRD §11.1); 0 = live now. */
  phase: number;
}

export const NAV: NavItem[] = [
  { path: '/', label: 'nav.dashboard', icon: Home, perm: null, phase: 0 },
  { path: '/trips', label: 'nav.trips', icon: ClipboardList, perm: 'trip.read', phase: 1 },
  { path: '/fleet', label: 'nav.fleet', icon: Truck, perm: 'vehicle.read', phase: 1 },
  { path: '/expenses', label: 'nav.expenses', icon: Receipt, perm: 'expense.read', phase: 1 },
  { path: '/import', label: 'nav.import', icon: Ship, perm: 'dashboard.import', phase: 3 },
  { path: '/reports', label: 'nav.reports', icon: FileBarChart, perm: 'export.run', phase: 2 },
  { path: '/admin/users', label: 'nav.users', icon: Users, perm: 'user.manage', phase: 0 },
  { path: '/admin/audit', label: 'nav.audit', icon: ScrollText, perm: 'audit.read', phase: 0 },
];
