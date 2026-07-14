// 現代仮名遣いで実用的なひらがなのプール（歴史的仮名の「ゐ」「ゑ」は含めない）
const BASE_46 = [
  'あ', 'い', 'う', 'え', 'お',
  'か', 'き', 'く', 'け', 'こ',
  'さ', 'し', 'す', 'せ', 'そ',
  'た', 'ち', 'つ', 'て', 'と',
  'な', 'に', 'ぬ', 'ね', 'の',
  'は', 'ひ', 'ふ', 'へ', 'ほ',
  'ま', 'み', 'む', 'め', 'も',
  'や', 'ゆ', 'よ',
  'ら', 'り', 'る', 'れ', 'ろ',
  'わ', 'を', 'ん',
];

const DAKUTEN_25 = [
  'が', 'ぎ', 'ぐ', 'げ', 'ご',
  'ざ', 'じ', 'ず', 'ぜ', 'ぞ',
  'だ', 'ぢ', 'づ', 'で', 'ど',
  'ば', 'び', 'ぶ', 'べ', 'ぼ',
  'ぱ', 'ぴ', 'ぷ', 'ぺ', 'ぽ',
];

const SMALL_9 = ['ぁ', 'ぃ', 'ぅ', 'ぇ', 'ぉ', 'っ', 'ゃ', 'ゅ', 'ょ'];

export const HIRAGANA_POOL: readonly string[] = [
  ...BASE_46,
  ...DAKUTEN_25,
  ...SMALL_9,
];

/** ひらがなプールから1文字をランダムに選ぶ */
export function randomHiragana(): string {
  const index = Math.floor(Math.random() * HIRAGANA_POOL.length);
  return HIRAGANA_POOL[index];
}

/** 指定した文字数のランダムひらがな文字列を生成する（各文字は独立に抽選） */
export function randomHiraganaString(length: number): string {
  return Array.from({ length }, () => randomHiragana()).join('');
}
