import { pinyin } from 'pinyin-pro';

export function generatePinyinData(chineseText) {
  const full = pinyin(chineseText, {
    toneType: 'symbol',
    type: 'string',
    nonZh: 'consecutive',
  });

  const rawParts = pinyin(chineseText, {
    toneType: 'symbol',
    type: 'all',
    nonZh: 'consecutive',
  });

  const parts = (Array.isArray(rawParts) ? rawParts : []).map((part) => ({
    char: part.origin ?? '',
    pinyin: part.pinyin ?? '',
    isChinese: Boolean(part.isZh),
  }));

  return { full, parts };
}
