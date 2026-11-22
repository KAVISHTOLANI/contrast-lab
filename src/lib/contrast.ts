export interface RGB {
  r: number;
  g: number;
  b: number;
}

const NAMED: Record<string, string> = {
  black: '#000000',
  white: '#ffffff',
  red: '#ff0000',
  green: '#008000',
  blue: '#0000ff',
  gray: '#808080',
  grey: '#808080',
  navy: '#000080',
  orange: '#ffa500',
  yellow: '#ffff00',
  purple: '#800080',
  teal: '#008080',
};

/** Parses #rgb, #rrggbb, rgb(r, g, b) or a small set of colour names. Returns null when invalid. */
export function parseColor(input: string): RGB | null {
  const value = input.trim().toLowerCase();
  if (!value) return null;
  if (NAMED[value]) return parseColor(NAMED[value]);
  const hex = value.replace(/^#/, '');
  if (/^[0-9a-f]{3}$/.test(hex)) {
    return {
      r: parseInt(hex[0] + hex[0], 16),
      g: parseInt(hex[1] + hex[1], 16),
      b: parseInt(hex[2] + hex[2], 16),
    };
  }
  if (/^[0-9a-f]{6}$/.test(hex)) {
    return {
      r: parseInt(hex.slice(0, 2), 16),
      g: parseInt(hex.slice(2, 4), 16),
      b: parseInt(hex.slice(4, 6), 16),
    };
  }
  const m = value.match(/^rgb\(\s*(\d{1,3})\s*[, ]\s*(\d{1,3})\s*[, ]\s*(\d{1,3})\s*\)$/);
  if (m) {
    const [r, g, b] = [m[1], m[2], m[3]].map(Number);
    if ([r, g, b].every((c) => c >= 0 && c <= 255)) return { r, g, b };
  }
  return null;
}

export function toHex({ r, g, b }: RGB): string {
  return '#' + [r, g, b].map((c) => Math.round(c).toString(16).padStart(2, '0')).join('');
}

function channel(c: number): number {
  const s = c / 255;
  return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
}

/** WCAG 2.x relative luminance. */
export function luminance(rgb: RGB): number {
  return 0.2126 * channel(rgb.r) + 0.7152 * channel(rgb.g) + 0.0722 * channel(rgb.b);
}

export function contrastRatio(a: RGB, b: RGB): number {
  const la = luminance(a);
  const lb = luminance(b);
  const [hi, lo] = la > lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

/** Ratios are truncated (not rounded up) so 4.499 never displays as a pass. */
export function formatRatio(ratio: number): string {
  return `${(Math.floor(ratio * 100) / 100).toFixed(2)}:1`;
}

export interface Criterion {
  id: string;
  label: string;
  level: 'AA' | 'AAA';
  target: number;
  appliesTo: string;
}

export const CRITERIA: Criterion[] = [
  { id: 'aa-normal', label: 'Normal text', level: 'AA', target: 4.5, appliesTo: 'Body text under 18pt (24px), or under 14pt bold' },
  { id: 'aa-large', label: 'Large text', level: 'AA', target: 3, appliesTo: 'Text at least 18pt (24px), or 14pt (about 18.7px) bold' },
  { id: 'aa-ui', label: 'Icons and controls', level: 'AA', target: 3, appliesTo: 'Input borders, focus rings, icons that carry meaning' },
  { id: 'aaa-normal', label: 'Normal text', level: 'AAA', target: 7, appliesTo: 'Enhanced contrast for body text' },
  { id: 'aaa-large', label: 'Large text', level: 'AAA', target: 4.5, appliesTo: 'Enhanced contrast for large text' },
];

export function evaluate(ratio: number) {
  return CRITERIA.map((c) => ({ ...c, pass: ratio >= c.target }));
}

export function summary(ratio: number): { tone: 'ok' | 'warn' | 'err'; text: string } {
  if (ratio >= 7) return { tone: 'ok', text: 'Excellent — passes every text criterion, including AAA.' };
  if (ratio >= 4.5) return { tone: 'ok', text: 'Good for body text (AA). Not quite AAA for small text.' };
  if (ratio >= 3) return { tone: 'warn', text: 'Only suitable for large text, icons and control borders.' };
  return { tone: 'err', text: 'Too low for text. Readers with low vision will struggle.' };
}

/* ---- HSL helpers used to suggest an accessible alternative ---- */
export function rgbToHsl({ r, g, b }: RGB): [number, number, number] {
  const rn = r / 255, gn = g / 255, bn = b / 255;
  const max = Math.max(rn, gn, bn), min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h: number;
  if (max === rn) h = (gn - bn) / d + (gn < bn ? 6 : 0);
  else if (max === gn) h = (bn - rn) / d + 2;
  else h = (rn - gn) / d + 4;
  return [h * 60, s, l];
}

export function hslToRgb(h: number, s: number, l: number): RGB {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let rgb: [number, number, number];
  if (h < 60) rgb = [c, x, 0];
  else if (h < 120) rgb = [x, c, 0];
  else if (h < 180) rgb = [0, c, x];
  else if (h < 240) rgb = [0, x, c];
  else if (h < 300) rgb = [x, 0, c];
  else rgb = [c, 0, x];
  return { r: Math.round((rgb[0] + m) * 255), g: Math.round((rgb[1] + m) * 255), b: Math.round((rgb[2] + m) * 255) };
}

/**
 * Finds the closest colour to `fg` (same hue and saturation, different lightness)
 * that reaches `target` against `bg`. Returns null if no lightness works.
 */
export function suggestForeground(fg: RGB, bg: RGB, target: number): RGB | null {
  if (contrastRatio(fg, bg) >= target) return fg;
  const [h, s, l] = rgbToHsl(fg);
  let best: RGB | null = null;
  let bestDist = Infinity;
  for (let i = 0; i <= 200; i++) {
    const cand = i / 200;
    const rgb = hslToRgb(h, s, cand);
    if (contrastRatio(rgb, bg) >= target) {
      const dist = Math.abs(cand - l);
      if (dist < bestDist) {
        bestDist = dist;
        best = rgb;
      }
    }
  }
  return best;
}
