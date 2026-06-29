const SIZES = {
  xs: 'w-7 h-7 text-[10px]',
  sm: 'w-9 h-9 text-xs',
  md: 'w-11 h-11 text-sm',
  lg: 'w-16 h-16 text-lg',
  xl: 'w-24 h-24 text-2xl',
};

export default function Avatar({ user, size = 'md', ring = false, className = '' }) {
  if (!user) return null;
  const sizeCls = SIZES[size] || SIZES.md;
  return (
    <div
      className={`relative inline-flex items-center justify-center rounded-full font-bold text-white shrink-0 ${sizeCls} ${
        ring ? 'ring-2 ring-primary-500 ring-offset-2 ring-offset-[var(--bg)]' : ''
      } ${className}`}
      style={{
        background: `linear-gradient(135deg, ${user.avatarColor || '#E63946'} 0%, rgba(0,0,0,0.25) 120%)`,
      }}
    >
      {user.avatarInitials || user.name?.[0] || '?'}
    </div>
  );
}
