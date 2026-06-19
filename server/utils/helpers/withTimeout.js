// SPDX-License-Identifier: MIT
function withTimeout(promise, ms) {
  let timer;
  const timeoutPromise = new Promise((_, reject) => {
    timer = setTimeout(
      () => reject(new Error(`Operation timed out after ${ms}ms`)),
      ms,
    );
  });

  return Promise.race([promise, timeoutPromise]).finally(() =>
    clearTimeout(timer),
  );
}
module.exports = { withTimeout };
