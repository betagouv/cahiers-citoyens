export interface Measured<T> {
  value: T;
  seconds: number;
  // Plus haute mémoire résidente relevée pendant `run`, en octets.
  peakRss: number;
}

// Relève la mémoire résidente toutes les `sampleMs` millisecondes pendant `run`.
export async function measure<T>(
  run: () => Promise<T>,
  sampleMs = 20,
): Promise<Measured<T>> {
  let peakRss = process.memoryUsage.rss();
  const timer = setInterval(() => {
    peakRss = Math.max(peakRss, process.memoryUsage.rss());
  }, sampleMs);
  const start = performance.now();
  try {
    const value = await run();
    peakRss = Math.max(peakRss, process.memoryUsage.rss());
    return { value, seconds: (performance.now() - start) / 1000, peakRss };
  } finally {
    clearInterval(timer);
  }
}

const MEBIBYTE = 1024 * 1024;

export function formatMebibytes(bytes: number): string {
  return `${(bytes / MEBIBYTE).toFixed(0)} Mo`;
}
