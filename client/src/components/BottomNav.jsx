import { NavLink } from 'react-router-dom';

const HomeIcon = ({ active }) => (
  <svg width="24" height="24" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={active ? 0 : 1.8} viewBox="0 0 24 24">
    <path d="M3 11.5 12 4l9 7.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z" />
  </svg>
);

const SearchIcon = ({ active }) => (
  <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth={active ? 2.4 : 1.8} viewBox="0 0 24 24">
    <circle cx="11" cy="11" r="7" />
    <path d="m20 20-3.5-3.5" />
  </svg>
);

const PlusIcon = () => (
  <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.4" viewBox="0 0 24 24">
    <path d="M12 5v14M5 12h14" />
  </svg>
);

const HeartIcon = ({ active }) => (
  <svg width="24" height="24" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={active ? 0 : 1.8} viewBox="0 0 24 24">
    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
  </svg>
);

const UserIcon = ({ active }) => (
  <svg width="24" height="24" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={active ? 0 : 1.8} viewBox="0 0 24 24">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);

const tabs = [
  { path: '/', label: 'Feed', Icon: HomeIcon, end: true },
  { path: '/explore', label: 'Explore', Icon: SearchIcon },
  { path: '/create', label: '', Icon: PlusIcon, primary: true },
  { path: '/notifications', label: 'Activity', Icon: HeartIcon },
  { path: '/profile', label: 'You', Icon: UserIcon },
];

export default function BottomNav() {
  return (
    <nav className="fixed bottom-0 inset-x-0 z-50 glass safe-bottom">
      <div className="max-w-2xl mx-auto flex items-center">
        {tabs.map(({ path, label, Icon, primary, end }) => (
          <NavLink
            key={path}
            to={path}
            end={end}
            className={({ isActive }) =>
              primary
                ? 'flex-1 flex justify-center py-2'
                : `nav-item ${isActive ? 'active' : ''}`
            }
          >
            {({ isActive }) =>
              primary ? (
                <span className="flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-br from-primary-500 to-primary-700 text-white shadow-sm active:scale-95 transition-transform">
                  <Icon />
                </span>
              ) : (
                <>
                  <Icon active={isActive} />
                  <span className={`text-[10px] mt-0.5 ${isActive ? 'font-semibold' : 'font-medium'}`}>
                    {label}
                  </span>
                </>
              )
            }
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
