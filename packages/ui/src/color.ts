export type Oklch = { l: number; c: number; h: number };

function channels(hex: string): [number, number, number] {
  const value = Number.parseInt(hex.slice(1), 16);
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255].map((channel) => channel / 255) as [
    number,
    number,
    number,
  ];
}

function toLinear(channel: number): number {
  return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
}

function fromLinear(channel: number): number {
  return channel <= 0.0031308 ? channel * 12.92 : 1.055 * channel ** (1 / 2.4) - 0.055;
}

function toHex(rgb: readonly number[]): string {
  return `#${rgb
    .map((channel) =>
      Math.round(Math.min(1, Math.max(0, channel)) * 255)
        .toString(16)
        .padStart(2, '0'),
    )
    .join('')
    .toUpperCase()}`;
}

export function linearRgb(hex: string): [number, number, number] {
  return channels(hex).map(toLinear) as [number, number, number];
}

export function oklab([r = 0, g = 0, b = 0]: readonly number[]): [number, number, number] {
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ];
}

export function toOklch(hex: string): Oklch {
  const [l, a, b] = oklab(linearRgb(hex));
  const h = (Math.atan2(b, a) * 180) / Math.PI;
  return { l, c: Math.hypot(a, b), h: h < 0 ? h + 360 : h };
}

export function fromOklch({ l, c, h }: Oklch): string {
  const radians = (h * Math.PI) / 180;
  const a = c * Math.cos(radians);
  const b = c * Math.sin(radians);
  const lc = (l + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const mc = (l - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const sc = (l - 0.0894841775 * a - 1.291485548 * b) ** 3;
  return toHex(
    [
      4.0767416621 * lc - 3.3077115913 * mc + 0.2309699292 * sc,
      -1.2684380046 * lc + 2.6097574011 * mc - 0.3413193965 * sc,
      -0.0041960863 * lc - 0.7034186147 * mc + 1.707614701 * sc,
    ].map(fromLinear),
  );
}

export function lighten(hex: string, dL: number, dC = 0): string {
  const { l, c, h } = toOklch(hex);
  return fromOklch({ l: l + dL / 100, c: Math.max(0, c + dC), h });
}

export function tint(hex: string, l: number, c: number): string {
  return fromOklch({ l: l / 100, c, h: toOklch(hex).h });
}

export function mix(a: string, b: string, pct: number): string {
  const x = channels(a);
  const y = channels(b);
  return toHex(x.map((channel, index) => (channel * pct + y[index]! * (100 - pct)) / 100));
}

export function luminance(hex: string): number {
  const [r, g, b] = linearRgb(hex);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrast(a: string, b: string): number {
  const x = luminance(a);
  const y = luminance(b);
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}

function apcaY(hex: string): number {
  const [r, g, b] = channels(hex).map((channel) => channel ** 2.4) as [number, number, number];
  const y = 0.2126729 * r + 0.7151522 * g + 0.072175 * b;
  return y > 0.022 ? y : y + (0.022 - y) ** 1.414;
}

export function apcaLc(text: string, background: string): number {
  const textY = apcaY(text);
  const backgroundY = apcaY(background);
  if (Math.abs(backgroundY - textY) < 0.0005) return 0;
  if (backgroundY > textY) {
    const sapc = (backgroundY ** 0.56 - textY ** 0.57) * 1.14;
    return sapc < 0.1 ? 0 : (sapc - 0.027) * 100;
  }
  const sapc = (backgroundY ** 0.65 - textY ** 0.62) * 1.14;
  return sapc > -0.1 ? 0 : (sapc + 0.027) * 100;
}

export function on(fill: string, dark: string, light: string): string {
  return contrast(dark, fill) >= contrast(light, fill) ? dark : light;
}
