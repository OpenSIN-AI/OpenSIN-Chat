// SPDX-License-Identifier: MIT
// OpenSIN Chat — Telemetrie wurde im Sinne maximaler Souveränität und
// Datenschutz-Garantie (DSGVO) vollständig entfernt.
// Es werden keinerlei Daten an externe Dienste gesendet.
// Diese Funktion bleibt als No-Op-Stub erhalten, damit Aufrufer in
// Boot-Skripten nicht refaktoriert werden müssen.
const consoleLogger = require("../logger/console.js");

async function setupTelemetry() {
  consoleLogger.log(
    `\x1b[32m[OpenSIN Chat]\x1b[0m Telemetrie dauerhaft deaktiviert — keine Outbound-Calls, keine Drittanbieter.`,
  );
  return true;
}

module.exports = setupTelemetry;
