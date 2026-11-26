export interface Throttle {
  // true au plus une fois par intervalle : l'appelant lance alors son travail.
  tryStart(now: number): boolean;
}

// Limite propre au processus : sur plusieurs conteneurs web, chacun peut lancer
// un passage, et le verrou du job n'en laisse travailler qu'un.
export function createThrottle(intervalMs: number): Throttle {
  let lastStart: number | undefined;
  return {
    tryStart(now) {
      if (lastStart !== undefined && now - lastStart < intervalMs) return false;
      lastStart = now;
      return true;
    },
  };
}
