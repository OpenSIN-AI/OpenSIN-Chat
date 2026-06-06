# PR-Titel: Conventional Commits

Bitte verwende [Conventional Commits](https://www.conventionalcommits.org/)
für PR-Titel. Beispiele:

- `feat(workspace): add Bundestag-Drucksachen connector`
- `fix(telemetry): remove any remaining outbound calls`
- `docs(readme): update brand colors to AfD-Blau`
- `refactor(server): rename LLM-provider string to openafd-router (planned v1, current value `openafd-router` is a future migration; the legacy string lives in BRANDING.md)`
- `chore(deps): bump vite to 8.0.16`
- `test(workspace): add integration tests for workspace deletion protection`

## PR-Body

```markdown
## Was ändert sich?

<!-- Kurzbeschreibung der Änderung -->

## Warum?

<!-- Motivation, GitHub-Issue-Ref, etc. -->

## Wie wurde getestet?

<!-- Unit-Tests manuell ausgeführt? E2E? Screenshots? -->

## Checklist

- [ ] `yarn lint` läuft sauber
- [ ] `yarn test` läuft sauber
- [ ] Dokumentation aktualisiert (falls öffentliche API betroffen)
- [ ] Keine Telemetrie/Outbound-Calls hinzugefügt
- [ ] Keine Secrets in Commits
```
