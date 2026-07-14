# .skillopt — SkillOpt + SkillOpt-Sleep for OpenSIN-Chat

This directory holds project-specific configuration and logs for SkillOpt-Sleep.

## Files
- config.yaml: defaults and preferences for this project.
- cron.log: output from the scheduled nightly run.

## Usage (from repo root)
```bash
# Safe preview
skillopt-sleep dry-run --project . --target-skill-path ./SKILL.md --backend mock --progress

# Real evolution (choose backend you have auth for)
skillopt-sleep run --project . --target-skill-path ./SKILL.md --backend claude --source auto

skillopt-sleep status --project .
skillopt-sleep adopt --project .

# Nightly automatic (already scheduled during setup)
skillopt-sleep schedule --project .
skillopt-sleep unschedule --project .
```

## Backends
- mock (free, for testing)
- claude / codex (via their CLIs)
- handoff (no subprocess, answer in fresh context)
- openai_compatible for local models (set env vars)

See full docs in /Users/jeremy/dev/SkillOpt/docs/sleep/ and plugins/README.md .

Cron is managed and only stages proposals. Always review + adopt manually for safety.
