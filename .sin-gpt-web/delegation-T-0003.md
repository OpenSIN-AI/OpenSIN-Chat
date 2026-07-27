# Delegation Prompt for T-0003: Docker Security Hardening

## Current Status
ChatGPT is actively working on T-0002 (Public Operational Data cleanup).

## Next Task: T-0003 [CRITICAL]

### Objective
Harden Docker Compose configuration to meet security best practices.

### Specific Changes Required

#### 1. docker-compose.yml (Main App)
**Current state:** Already has `cap_drop: ALL` and `security_opt: no-new-privileges:true`
**Action:** Verify and document compliance

#### 2. docker-compose.unlimited-ocr.yml (OCR Sidecar)
**Current state:** Has `security_opt: no-new-privileges:true` but missing `cap_drop: ALL`
**Action:** Add `cap_drop: ALL` to unlimited-ocr service

#### 3. Port Binding Verification
**Current state:** Uses `${COMPOSE_BIND_ADDRESS:-127.0.0.1}:${COMPOSE_PORT:-43939}:3001`
**Action:** Confirm all ports are bound to 127.0.0.1, not 0.0.0.0

#### 4. Documentation
**Action:** Update security documentation to reflect hardened configuration

### Files to Modify
- `<repo-root>/platform/containers/compose/docker-compose.unlimited-ocr.yml`
- `<repo-root>/docs/` (security documentation)

### Acceptance Criteria
- [ ] All services have `cap_drop: ALL`
- [ ] All services have `security_opt: no-new-privileges:true`
- [ ] All ports bound to 127.0.0.1
- [ ] No SYS_ADMIN capability anywhere
- [ ] Security documentation updated

### Verification
```bash
# Check for SYS_ADMIN
grep -r "SYS_ADMIN" <repo-root>/platform/

# Check cap_add usage
grep -r "cap_add" <repo-root>/platform/

# Verify port bindings
grep -r "ports:" <repo-root>/platform/containers/compose/
```

### Notes
- The `fix-permissions` container needs `cap_add: CHOWN, DAC_OVERRIDE, FOWNER` to fix file permissions - this is acceptable for a one-shot container
- Focus on the unlimited-ocr sidecar which is missing `cap_drop: ALL`
