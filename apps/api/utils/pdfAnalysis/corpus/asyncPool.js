// SPDX-License-Identifier: MIT
/**
 * asyncPool — minimaler Promise-Semaphor (kein p-limit-Dependency nötig).
 *
 * Ruft iteratorFn für jedes Element von `array` auf, lässt höchstens
 * `poolLimit` Promises gleichzeitig laufen, gibt alle Ergebnisse in
 * Eingabereihenfolge zurück. Fehler in iteratorFn werden durchgereicht
 * (Promise.all am Ende wirft beim ersten Fehler).
 *
 * @template T, R
 * @param {number} poolLimit Maximal gleichzeitig laufende iterator-Aufrufe.
 * @param {readonly T[]} array Eingabe-Liste.
 * @param {(item: T, index: number) => Promise<R>} iteratorFn
 * @returns {Promise<R[]>}
 */
async function asyncPool(poolLimit, array, iteratorFn) {
  const limit = Math.max(1, Math.floor(poolLimit) || 1);
  const ret = [];
  const executing = new Set();
  for (let i = 0; i < array.length; i++) {
    const p = Promise.resolve()
      .then(() => iteratorFn(array[i], i))
      .finally(() => {
        executing.delete(p);
      });
    ret.push(p);
    executing.add(p);
    if (executing.size >= limit) {
      await Promise.race(executing);
    }
  }
  return Promise.all(ret);
}

module.exports = { asyncPool };
