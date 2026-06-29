export default function MediaTile({ media, aspect = 'square', className = '' }) {
  if (!media) return null;
  const ratio =
    aspect === 'square' ? 'aspect-square' : aspect === 'tall' ? 'aspect-[4/5]' : 'aspect-video';
  return (
    <div
      className={`relative overflow-hidden rounded-2xl ${ratio} ${className}`}
      style={{
        background: `linear-gradient(135deg, ${media.from || '#E63946'} 0%, ${media.to || '#0F0F11'} 100%)`,
      }}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.35),transparent_60%)]" />
      <div className="absolute inset-0 flex items-end p-4">
        <span className="text-white/90 text-xs font-semibold tracking-wide uppercase drop-shadow">
          {media.label}
        </span>
      </div>
    </div>
  );
}
