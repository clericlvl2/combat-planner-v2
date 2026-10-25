export interface Spring {
  stiffness: number;
  damping: number;
  mass: number;
}

export interface SpringState {
  x: number;
  v: number;
}

export interface SpringSample extends SpringState {
  t: number;
}

export interface SpringSampling {
  step?: number;
  maxDuration?: number;
  restDelta?: number;
  restSpeed?: number;
}

export function springAt(spring: Spring, x0: number, v0: number, t: number): SpringState {
  const { stiffness: k, damping: c, mass: m } = spring;
  const w0 = Math.sqrt(k / m);
  const zeta = c / (2 * Math.sqrt(k * m));
  if (zeta < 1) {
    const wd = w0 * Math.sqrt(1 - zeta * zeta);
    const a = x0;
    const b = (v0 + zeta * w0 * x0) / wd;
    const decay = Math.exp(-zeta * w0 * t);
    const cos = Math.cos(wd * t);
    const sin = Math.sin(wd * t);
    return {
      x: decay * (a * cos + b * sin),
      v: decay * ((wd * b - zeta * w0 * a) * cos - (wd * a + zeta * w0 * b) * sin),
    };
  }
  if (zeta === 1) {
    const b = v0 + w0 * x0;
    const decay = Math.exp(-w0 * t);
    return { x: decay * (x0 + b * t), v: decay * (b - w0 * (x0 + b * t)) };
  }
  const root = w0 * Math.sqrt(zeta * zeta - 1);
  const r1 = -zeta * w0 + root;
  const r2 = -zeta * w0 - root;
  const a = (v0 - r2 * x0) / (r1 - r2);
  const b = x0 - a;
  const e1 = Math.exp(r1 * t);
  const e2 = Math.exp(r2 * t);
  return { x: a * e1 + b * e2, v: a * r1 * e1 + b * r2 * e2 };
}

export function sampleSpring(
  spring: Spring,
  x0: number,
  v0: number,
  { step = 1 / 120, maxDuration = 3, restDelta = 0.1, restSpeed = 3 }: SpringSampling = {},
): SpringSample[] {
  const samples: SpringSample[] = [];
  const count = Math.ceil(maxDuration / step);
  for (let index = 0; index <= count; index += 1) {
    const t = index * step;
    const { x, v } = springAt(spring, x0, v0, t);
    if (index > 0 && Math.abs(x) < restDelta && Math.abs(v) < restSpeed) {
      samples.push({ t, x: 0, v: 0 });
      return samples;
    }
    samples.push({ t, x, v });
  }
  const last = samples[samples.length - 1];
  if (last) samples[samples.length - 1] = { t: last.t, x: 0, v: 0 };
  return samples;
}
