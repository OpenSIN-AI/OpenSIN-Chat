// OpenAfD Chat — Telemetrie wurde im Sinne maximaler Souveränität und
// Datenschutz-Garantie (DSGVO) vollständig entfernt.
// Es werden keinerlei Daten an externe Dienste gesendet.
// Diese Funktion bleibt als No-Op-Stub erhalten, damit Aufrufer in
// Boot-Skripten nicht refaktoriert werden müssen.
async function setupTelemetry() {
  // eslint-disable-next-line no-console
  console.log(
    `\x1b[32m[OpenAfD Chat]\x1b[0m Telemetrie dauerhaft deaktiviert — keine Outbound-Calls, keine Drittanbieter.`,
  );
  return true;
}

module.exports = setupTelemetry;
