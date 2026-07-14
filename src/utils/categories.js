import {
  Home, UtensilsCrossed, Zap, Droplets, Bus, HeartPulse, GraduationCap, Shield, Wifi,
  Coffee, Clapperboard, ShoppingBag, Plane, Repeat, Palette, Gift,
  Umbrella, TrendingUp, Armchair, Landmark, CreditCard, Briefcase, Target,
} from 'lucide-react'

export const GROUPS = ['needs', 'wants', 'savings']

export const GROUP_META = {
  needs: {
    labelKey: 'group.needs',
    descKey: 'group.needs.desc',
    color: '#2a78d6',
    colorDark: '#3987e5',
    text: 'text-needs dark:text-needs-dark',
    bg: 'bg-needs dark:bg-needs-dark',
    soft: 'bg-needs-soft dark:bg-needs-softdark',
    track: 'bg-needs/15 dark:bg-needs-dark/20',
  },
  wants: {
    labelKey: 'group.wants',
    descKey: 'group.wants.desc',
    color: '#eb6834',
    colorDark: '#d95926',
    text: 'text-wants dark:text-wants-dark',
    bg: 'bg-wants dark:bg-wants-dark',
    soft: 'bg-wants-soft dark:bg-wants-softdark',
    track: 'bg-wants/15 dark:bg-wants-dark/20',
  },
  savings: {
    labelKey: 'group.savings',
    descKey: 'group.savings.desc',
    color: '#1baf7a',
    colorDark: '#199e70',
    text: 'text-savings dark:text-savings-dark',
    bg: 'bg-savings dark:bg-savings-dark',
    soft: 'bg-savings-soft dark:bg-savings-softdark',
    track: 'bg-savings/15 dark:bg-savings-dark/20',
  },
}

export const SUBCATEGORIES = {
  needs: [
    { id: 'housing', icon: Home },
    { id: 'food', icon: UtensilsCrossed },
    { id: 'electricity', icon: Zap },
    { id: 'water', icon: Droplets },
    { id: 'transport', icon: Bus },
    { id: 'healthcare', icon: HeartPulse },
    { id: 'education', icon: GraduationCap },
    { id: 'insurance', icon: Shield },
    { id: 'phoneInternet', icon: Wifi },
  ],
  wants: [
    { id: 'restaurants', icon: Coffee },
    { id: 'entertainment', icon: Clapperboard },
    { id: 'shopping', icon: ShoppingBag },
    { id: 'travel', icon: Plane },
    { id: 'subscriptions', icon: Repeat },
    { id: 'hobbies', icon: Palette },
    { id: 'gifts', icon: Gift },
  ],
  savings: [
    { id: 'emergencyFund', icon: Umbrella },
    { id: 'investments', icon: TrendingUp },
    { id: 'retirement', icon: Armchair },
    { id: 'loanRepayment', icon: Landmark },
    { id: 'creditCard', icon: CreditCard },
    { id: 'businessSavings', icon: Briefcase },
    { id: 'otherGoals', icon: Target },
  ],
}

export function subcategoryIcon(group, subId) {
  const found = (SUBCATEGORIES[group] || []).find((s) => s.id === subId)
  return found?.icon || Target
}

export const PAYMENT_METHODS = ['cash', 'card', 'mobileMoney', 'bankTransfer', 'other']
