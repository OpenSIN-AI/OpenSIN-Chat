// SPDX-License-Identifier: MIT
const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/u;

function validateEmail(email) {
  if (!EMAIL_REGEX.test(email)) throw new Error("Invalid email");
  return email;
}

module.exports = { validateEmail, EMAIL_REGEX };
