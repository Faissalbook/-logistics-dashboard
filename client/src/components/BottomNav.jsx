import { NavLink } from 'react-router-dom';

const TranslateIcon = ({ active }) => (
  <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth={active ? 2.2 : 1.8} viewBox="0 0 24 24">
    <path d="M5 8l6 6"/>
    <path d="M4 6h7M7 4v2"/>
    <path d="M2 18h11M12 18l4-8 4 8"/>
    <path d="M19.5 14h-7"/>
  </svg>
);

const HistoryIcon = ({ active }) => (
  <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth={active ? 2.2 : 1.8} viewBox="0 0 24 24">
    <path d="M12 8v4l3 3"/>
    <circle cx="12" cy="12" r="9"/>
    <path d="M3.05 11a9 9 0 0 1 .5-2.5"/>
  </svg>
);

const StarIcon = ({ active }) => (
  <svg width="22" height="22" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={active ? 0 : 1.8} viewBox="0 0 24 24">
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
  </svg>
);

const BookIcon = ({ active }) => (
  <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth={active ? 2.2 : 1.8} viewBox="0 0 24 24">
    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
  </svg>
);

const SettingsIcon = ({ active }) => (
  <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth={active ? 2.2 : 1.8} viewBox="0 0 24 24">
    <circle cx="12" cy="12" r="3"/>
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
  </svg>
);

const tabs = [
  { path: '/', label: 'Translate', Icon: TranslateIcon },
  { path: '/history', label: 'History', Icon: HistoryIcon },
  { path: '/favorites', label: 'Favorites', Icon: StarIcon },
  { path: '/phrasebook', label: 'Phrases', Icon: BookIcon },
  { path: '/settings', label: 'Settings', Icon: SettingsIcon },
];

export default function BottomNav() {
  return (
    <nav className="fixed bottom-0 inset-x-0 z-50 glass safe-bottom">
      <div className="max-w-2xl mx-auto flex">
        {tabs.map(({ path, label, Icon }) => (
          <NavLink
            key={path}
            to={path}
            end={path === '/'}
            className={({ isActive }) =>
              `nav-item text-xs font-medium ${isActive ? 'active' : ''}`
            }
          >
            {({ isActive }) => (
              <>
                <Icon active={isActive} />
                <span className={`text-[10px] ${isActive ? 'font-semibold' : ''}`}>{label}</span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
