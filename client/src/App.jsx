import { useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useAppStore } from './store/appStore';
import Layout from './components/Layout';
import Translator from './pages/Translator';
import History from './pages/History';
import Favorites from './pages/Favorites';
import Phrasebook from './pages/Phrasebook';
import Settings from './pages/Settings';

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
          duration: 2500,
          style: {
            background: isDark ? '#1e1e20' : '#fff',
            color: isDark ? '#f4f4f6' : '#0f0f11',
            borderRadius: '12px',
            border: `1px solid ${isDark ? '#2a2a2e' : '#e2e0db'}`,
            fontSize: '14px',
            fontWeight: '500',
            boxShadow: '0 4px 20px rgba(0,0,0,0.12)',
          },
        }}
      />
      <Layout>
        <Routes>
          <Route path="/" element={<Translator />} />
          <Route path="/history" element={<History />} />
          <Route path="/favorites" element={<Favorites />} />
          <Route path="/phrasebook" element={<Phrasebook />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}
