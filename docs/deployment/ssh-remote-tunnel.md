# SSH access through a private tunnel

This document gives provider-neutral security guidance. It intentionally does
not contain a production hostname, tunnel identifier, user account, key path,
port, machine name, or absolute filesystem path.

## Prefer the Mac connector

For ChatGPT-managed repository work, use the authenticated Mac connector rather
than exposing SSH. A tunnel should exist only when a connector cannot satisfy a
bounded operational need.

## Minimum security requirements

- Create a dedicated non-admin operating-system account.
- Use public-key authentication only; disable password and root login.
- Restrict the key with `authorized_keys` options and a forced command where
  possible.
- Bind SSH locally and expose it only through an authenticated private tunnel.
- Require identity-aware access at the tunnel provider.
- Restrict source identities and session duration.
- Keep tunnel credentials and SSH keys outside Git.
- Log successful and failed access attempts without logging secrets.
- Remove access immediately after the bounded task is complete.

## Private configuration

Store deployment-specific values in a protected, ignored file such as:

```text
.local/operations/ssh-tunnel.env
```

Typical variable names may include:

```env
SSH_TUNNEL_HOST=
SSH_TUNNEL_USER=
SSH_TUNNEL_PORT=
SSH_TUNNEL_KEY=
SSH_TUNNEL_CONFIG=
```

Do not commit their values. Tunnel IDs, DNS records, usernames, host keys,
launch-service files, local ports, and machine paths are production inventory.

## Verification checklist

1. Confirm the dedicated account has no administrator or sudo privileges.
2. Confirm password and root login are disabled.
3. Confirm the listener is not bound to a public interface.
4. Confirm the tunnel requires authenticated access.
5. Confirm an unauthorized identity is rejected.
6. Confirm the authorized key can run only the intended bounded operation.
7. Confirm access logs are written and contain no secrets.
8. Revoke the key and tunnel route after use.

## Incident response

On suspected compromise, disable the tunnel route, revoke the access identity
and key, rotate any credentials reachable by that account, preserve logs, and
review the host for unauthorized changes before restoring access.
