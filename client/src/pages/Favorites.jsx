import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../store/appStore';
import TranslationCard from '../components/TranslationCard';

export default function Favorites() {
  const { favorites, removeFavorite, replayFromHistory } = useAppStore();
  const navigate = useNavigate();

  const handleReplay = (item) => {
    replayFromHistory(item);
    navigate('/');
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-5">
      <div className="mb-4">
        <h2 className="text-xl font-bold text-[var(--text)]">Favorites</h2>
        <p className="text-xs text-[var(--text-muted)] mt-0.5">
          {favorites.length} saved translation{favorites.length !== 1 ? 's' : ''}
        </p>
      </div>

      {favorites.length === 0 ? (
        <div className="text-center py-16 space-y-3">
          <div className="text-4xl">⭐</div>
          <p className="text-[var(--text-muted)] text-sm">No favorites yet</p>
          <p className="text-xs text-[var(--text-muted)] max-w-xs mx-auto">
            Tap the star icon on any translation to save it here for quick access
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {favorites.map((item) => (
            <TranslationCard
              key={item.id}
              item={item}
              onReplay={handleReplay}
              onDelete={removeFavorite}
            />
          ))}
        </div>
      )}
    </div>
  );
}
