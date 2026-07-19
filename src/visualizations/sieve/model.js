// Pure model for the sieve of Eratosthenes. Events for the number grid:
//   {t:'prime', n}        n survives — it is prime
//   {t:'cross', n, by}    n is struck out as a multiple of `by`
export function sieveEvents(N) {
    const crossed = new Set();
    const events = [];
    const primes = [];
    let firstPrimeEnd = null;
    for (let p = 2; p <= N; p++) {
        if (crossed.has(p)) continue;
        primes.push(p);
        events.push({ t: 'prime', n: p });
        if (p * p <= N) {
            for (let m = p * p; m <= N; m += p) {
                if (!crossed.has(m)) {
                    crossed.add(m);
                    events.push({ t: 'cross', n: m, by: p });
                }
            }
        }
        if (firstPrimeEnd === null) firstPrimeEnd = events.length;
    }
    return { events, primes, firstPrimeEnd: firstPrimeEnd ?? 0 };
}

// Fold events[0 … upTo) into grid state.
export function applySieveEvents(events, upTo) {
    const primes = new Set();
    const crossed = new Map(); // n → by
    let cursor = null;
    let lastPrime = null;
    const limit = Math.min(upTo, events.length);
    for (let i = 0; i < limit; i++) {
        const e = events[i];
        if (e.t === 'prime') {
            primes.add(e.n);
            lastPrime = e.n;
            cursor = e.n;
        } else {
            crossed.set(e.n, e.by);
            cursor = e.n;
        }
    }
    return { primes, crossed, cursor, lastPrime };
}
