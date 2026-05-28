import TopBar from './TopBar';
import BottomNav from './BottomNav';

export default function Layout({ children }) {
  return (
    <div className="flex flex-col min-h-screen min-h-dvh bg-[var(--bg)]">
      <TopBar />
      <main className="flex-1 pb-24 overflow-x-hidden">
        {children}
      </main>
      <BottomNav />
    </div>
  );
}
