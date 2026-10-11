export const HAND_FAMILY='"Dormi Gentle Pen", sans-serif';
export const handwritingFont=size=>`700 ${size}px ${HAND_FAMILY}`;
const pending=new Map();export function ensureHandwriting(text='도름이 별빛 마을 아침 낮 저녁 밤'){if(!globalThis.document?.fonts)return Promise.resolve();if(!pending.has(text))pending.set(text,document.fonts.load(handwritingFont(18),text).catch(()=>[]));return pending.get(text);}
