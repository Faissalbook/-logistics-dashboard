const CHINESE_RE = /[一-鿿㐀-䶿]/;

export default function CharacterPinyin({ parts = [] }) {
  if (!parts.length) return null;

  return (
    <div className="flex flex-wrap gap-x-1 gap-y-3 mt-4 p-4 bg-[var(--bg)] rounded-xl">
      {parts.map((part, i) => {
        const isChinese = CHINESE_RE.test(part.char);
        const isSpace = part.char === ' ';

        if (isSpace) {
          return <div key={i} className="w-2" />;
        }

        return (
          <div
            key={i}
            className="flex flex-col items-center min-w-[1.8rem]"
          >
            {isChinese ? (
              <>
                <span className="text-[10px] leading-tight text-primary-500 font-medium tracking-tight">
                  {part.pinyin}
                </span>
                <span className="font-chinese text-xl leading-tight text-[var(--text)] mt-0.5">
                  {part.char}
                </span>
              </>
            ) : (
              <span className="text-xl leading-tight text-[var(--text)] self-end">
                {part.char}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}
