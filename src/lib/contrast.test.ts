import { describe, expect, it } from 'vitest';
import { contrastRatio, evaluate, formatRatio, parseColor, suggestForeground, toHex } from './contrast';

describe('parseColor', () => {
  it('accepts short hex, long hex, rgb() and names', () => {
    expect(parseColor('#fff')).toEqual({ r: 255, g: 255, b: 255 });
    expect(parseColor('1a2B3c')).toEqual({ r: 26, g: 43, b: 60 });
    expect(parseColor('rgb(10, 20, 30)')).toEqual({ r: 10, g: 20, b: 30 });
    expect(parseColor('Navy')).toEqual({ r: 0, g: 0, b: 128 });
  });
  it('rejects invalid input', () => {
    expect(parseColor('')).toBeNull();
    expect(parseColor('#12')).toBeNull();
    expect(parseColor('rgb(300, 0, 0)')).toBeNull();
    expect(parseColor('banana')).toBeNull();
  });
});

describe('contrastRatio', () => {
  it('is 21:1 for black on white and 1:1 for identical colours', () => {
    expect(contrastRatio(parseColor('#000')!, parseColor('#fff')!)).toBeCloseTo(21, 5);
    expect(contrastRatio(parseColor('#336699')!, parseColor('#336699')!)).toBe(1);
  });
  it('matches the known value for #777 on white (just under AA)', () => {
    const r = contrastRatio(parseColor('#777777')!, parseColor('#ffffff')!);
    expect(r).toBeGreaterThan(4.47);
    expect(r).toBeLessThan(4.5);
    expect(formatRatio(r)).toBe('4.47:1');
  });
  it('is symmetric', () => {
    const a = parseColor('#5034d9')!, b = parseColor('#f0f0f0')!;
    expect(contrastRatio(a, b)).toBeCloseTo(contrastRatio(b, a));
  });
});

describe('evaluate', () => {
  it('marks criteria based on thresholds', () => {
    const res = evaluate(4.6);
    expect(res.find((c) => c.id === 'aa-normal')!.pass).toBe(true);
    expect(res.find((c) => c.id === 'aaa-normal')!.pass).toBe(false);
  });
});

describe('suggestForeground', () => {
  it('returns a colour that meets the target', () => {
    const fg = parseColor('#999999')!, bg = parseColor('#ffffff')!;
    const s = suggestForeground(fg, bg, 4.5)!;
    expect(contrastRatio(s, bg)).toBeGreaterThanOrEqual(4.5);
    expect(toHex(s)).not.toBe('#999999');
  });
  it('returns null when nothing can reach the target', () => {
    expect(suggestForeground(parseColor('#888')!, parseColor('#808080')!, 21)).toBeNull();
  });
});
