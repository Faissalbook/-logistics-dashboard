import { useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useAppStore } from './store/appStore';
import Layout from './components/Layout';
import Feed from './pages/Feed';
import Explore from './pages/Explore';
import Create from './pages/Create';
import Notifications from './pages/Notifications';
import Profile from './pages/Profile';

export default function App() {
  const isDark = useAppStore((s) => s.isDark);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark);
  }, [isDark]);

  return (
    <BrowserRouter>
      <Toaster
        position="top-center"
        toastOptions={{
          duration: 2200,
          style: {
            background: isDark ? '#1e1e20' : '#fff',
            color: isDark ? '#f4f4f6' : '#0f0f11',
            borderRadius: '12px',
            border: `1px solid ${isDark ? '#2a2a2e' : '#e2e0db'}`,
            fontSize: '14px',
            fontWeight: 500,
            boxShadow: '0 4px 20px rgba(0,0,0,0.12)',
          },
        }}
      />
      <Layout>
        <Routes>
          <Route path="/" element={<Feed />} />
          <Route path="/explore" element={<Explore />} />
          <Route path="/create" element={<Create />} />
          <Route path="/notifications" element={<Notifications />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/profile/:username" element={<Profile />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}
