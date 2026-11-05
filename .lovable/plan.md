# Tirumala Guide — Admin Control Center and passkey security

## Scope and approval
**Read-only audit completed on 5 November 2026. Implementation is not authorized.** Preserve the existing app, accounts, public pages, languages, maps, transport, background voice, Cloud identity provider and migrations. The checklist remains separate.

The earlier keyboard-accessibility task was inspected but not implemented after the planning-only instruction arrived. Only planning/task-tracking documents were written; no application code, records, auth settings, policies, storage or deployment changed.

## 1. Verified current state
**Source:** `/admin` in `src/routes/admin.tsx` uses password sign-in, public signup, browser role checking and first-admin claim. `AdminPanel.tsx` has seven tabs: overview, status, ticker, voice, places, review, transport. No account-management, passkey, recovery, suspension or module/action permission system was found.

**Hosted read-only evidence:** email sign-in and public signup enabled; email auto-confirm and anonymous signup disabled. One user, one Admin, no unconfirmed users, zero verified native MFA factors. Roles are only `admin`/`user`. Registration does not automatically grant Admin; clients can read own role but have no role-write policy.

**Source + hosted policies:** content/private-provider writes and bucket writes require global `has_role(auth.uid(),'admin')`. Most editors call the Data API/Storage directly. Password-authenticated Admins therefore bypass any future UI-only passkey check. Photo/voice server functions validate bearer claims and Admin; `src/start.ts` adds bearer attachment and CSRF, not passkey/action assurance.

Both buckets are private, but all `place-images` objects allow anonymous/authenticated SELECT; published audio has a publication filter. Private bucket alone does not mean confidential drafts. Preserve public signed-photo display while reviewing this.

`claim_first_admin()` currently cannot grant another Admin while one exists; its check/insert is not visibly serialized. Retire it during invitation cutover; concurrent bootstrap was not tested. `status_history` is an admin-readable trigger snapshot, not general audit logging. Browser sessions persist/refresh; no custom session inventory/revocation or account-recovery flow found. SQL migrations `0000`–`0009` are authoritative; `drizzle/schema.ts` is intentionally blank/generated.

**Preview:** signed-out form and existing signed-in overview rendered. This is not proof of production password authentication. **Not tested:** new accounts, login attempts, writes, attacks, passkey/device support, tests/builds, production Worker compatibility. Hosted rate limits, HIBP and session timeouts remain unverified. Zero provider session rows returned does not prove no sessions exist.

### Accessibility findings carried forward
Unassociated Transport field/language/source labels; unnamed place-deletion icon; ambiguous repeated row actions; busy buttons lose names; hidden photo inputs lack a visible focus cue; expandable controls lack state announcements. Existing Radix tabs/sheets provide keyboard primitives, but focus return from programmatically opened editors needs verification. History charts need an equivalent readable data summary. No real screen-reader audit has been performed.

## 2. Recommended password + passkey architecture (proposed)
Keep Cloud Auth; do not replace accounts/provider. Native passkeys are documented as **experimental passwordless sign-in**, not password-plus-passkey MFA. Custom WebAuthn must not be assumed to produce `aal2`.

1. Server verifies email/password through a separate publishable Auth client, never the service client. Confirm verified email and eligible membership. Identity alone grants no Admin access.
2. Persist a random, expiring challenge bound to user, identity session, purpose, origin and RP ID. Atomically consume once; rate-limit with shared persistent counters.
3. Require WebAuthn user verification; server verifies challenge/type/origin/RP-ID hash, credential ownership/signature, flags and revocation. Handle synced credentials/zero counters correctly; no biometric/private-key collection. Devices may use fingerprint, face, PIN or security keys; support is not universal.
4. Issue an opaque privileged session in a Secure/HttpOnly/SameSite cookie. Store its hash, identity binding, credential, assurance time, expiry/revocation. Proposed: 15-minute inactivity, 8-hour absolute expiry, fresh passkey within 5 minutes for sensitive actions; values need approval.
5. Every privileged read/write rechecks identity, cookie, membership, current module/action/resource permissions. Password recovery, invites, OAuth and refreshed identity tokens cannot bypass assurance. Preserve CSRF checks, validate origin, use no-store responses.

**Critical data boundary:** replace direct privileged browser reads/writes/uploads with guarded server functions, and deny direct authenticated Data API/Storage privileged access. Preserve public SELECT. User-scoped server queries and narrowly scoped RPCs are preferred; any necessary service-role operation runs only after common authorization and has no RLS safety net. Trusted RPC execution must not be available to browser roles. Prove this model before cutover. Adding restrictive policies beside old permissive Admin policies is insufficient. Never use client-writable assurance, a user-wide unlock, invented JWT signing or fabricated `aal` claims.

Use maintained SimpleWebAuthn tooling only after approved workerd verification. A stable HTTPS production domain/RP ID is required. Preview credentials/origins remain isolated; no wildcards. Provider session/refresh-token revocation API availability needs proof.

## 3. Invitation and permission workflow (proposed)
Super Admin invites a bound email with assigned role/scope; store only a random token hash, expiry (proposed 48 hours), issuer and consumed/revoked state. Resend invalidates old token. Email verification and password setup yield enrollment-only access; activate after server-verified passkey registration. Consume invite/assign membership/audit transactionally. Generic errors and persistent rate limits resist enumeration.

Disable public signup and retire first-admin claim only during approved cutover. Explicitly authorize the existing owner as initial Super Admin after enrollment/recovery readiness; never infer it from editable metadata. Preserve identity/content. No self-promotion.

Presets: Super Admin, Content Admin, Transport Admin, Emergency Admin, Custom Admin. Store default-deny module actions: view/create/edit/publish/delete/approve/manage. Separate private-provider permission. Validate publication transitions and field/resource scope, not generic UPDATE alone. Delegation cannot exceed a granted ceiling or create Super Admin. Ordinary Admins cannot manage others' credentials. Protect the last recovery-capable Super Admin; suspension/permission/key changes immediately revoke affected privileged sessions. Removing Admin access preserves identity and audit attribution.

## 4. Required additive schema, RLS and audit
Existing content tables cannot safely store authorization/credentials. Proposed public tables:
- `admin_memberships`, `admin_roles`, `admin_role_permissions`, `admin_permission_overrides`: lifecycle and scoped grants.
- `admin_invitations`: hashed tokens/email/expiry/consumption.
- `admin_webauthn_credentials`: public keys, owner/counter/transports/backup metadata, registration/last-use/revocation.
- `admin_auth_challenges`, `admin_privileged_sessions`: one-use challenges/hashed sessions.
- `admin_recovery_credentials`: hashed one-use recovery credentials/state.
- `admin_audit_events`, `admin_security_settings`, `admin_rate_limits`.

Same-migration GRANT/RLS/function EXECUTE restrictions; no anonymous security reads or browser role/challenge/session/audit writes. Plain identity UUIDs under Cloud conventions; no managed Auth schema edits. Preserve `user_roles` during transition, retire broad capability at cutover. Review every content/private-provider/history table, both buckets and bootstrap/publication/helper RPCs. Preserve public photos and atomic voice publication.

Successful content changes and audit insertion must be transactional; failures/login/security events use trusted append paths. Record actor/action/resource/time/result, minimized metadata and redacted diffs; never passwords/tokens/biometrics/full sensitive payloads. Ordinary Admins cannot alter/delete logs. Hash chains plus protected external checkpoints detect tampering, not protect against every compromised server/database owner. Retention/export needs approval; avoid full IP/device fingerprinting by default.

## 5. Control Center and exact files
Retain `/admin` and one shared Admin shell: desktop navigation, accessible mobile drawer, compact lists/tables, traditional colors. Permission-filter all modules. Emergency, Verification and Reports are not existing management features; their content/workflows need separately approved scopes. Never invent dashboard alerts/counts.

| Proposed work | Exact files | Database / tests / dependencies |
|---|---|---|
| Entry, session gate | `src/routes/admin.tsx`, new protected Admin layout/module routes created together | Yes; expired/revoked sessions and direct navigation |
| Replace direct privileged queries/writes/uploads | `src/components/admin/{AdminPanel,TransportAdmin,VoiceAnnouncementAdmin,PhotoIdentifier,StatusHistory}.tsx` | Policies/grants; preserve saves, photos, voice |
| Common authorization | new `src/lib/admin-auth.functions.ts`, `admin-auth.server.ts`, `admin-permissions.server.ts`, `admin-content.functions.ts`; update `photo-identify.functions.ts`, `voice-announcement.functions.ts` | Yes; action/resource validation and bypass tests |
| Passkeys/invitations/recovery | new `src/lib/admin-webauthn.functions.ts`, `admin-webauthn.server.ts`, `admin-invitations.functions.ts`, `admin-recovery.functions.ts`, server-only helpers | Yes; domain/runtime, email, replay/enrollment tests |
| Account/security/audit UI | new `src/components/admin/{AdminShell,AdminManagement,RolesPermissions,SecurityCenter,AuditLog}.tsx` | Yes; permissions, step-up and accessibility |
| Plumbing/labels/focus | `src/start.ts`, app-owned middleware, Admin components, scoped `src/styles.css`, `src/lib/i18n.tsx`; shared Sheet only if needed | Sessions yes, presentation no; CSRF, focus return and labels |
| Schema/testing | additive `drizzle/migrations/*`, focused auth/permissions/browser tests | Hosted RLS/grants and workerd validation |

Read but never edit generated auth/client/types/schema files manually. Finalize new Admin route filenames with navigation approval; preserve public routes and avoid duplicate applications.

## 6. Recovery and revocation
Enroll two independent Super Admin authenticators, ideally a separately stored hardware backup. Proposed recovery: password plus offline single-use hashed recovery credential, audited delay/notification and enrollment-only access; no privileged operations until a new passkey is verified. Alternatively a second Super Admin approves verified-identity recovery. A sole-owner emergency procedure needs documented offline custody, not email-only approval.

Password reset changes password only, never assurance. Revoke compromised credentials and bound privileged sessions. App revocation denies privileged access immediately; issued provider JWTs and signed media URLs can remain valid until expiry. Do not promise instant provider-token revocation, remote authenticator deletion or exact physical-device inventory. Provider session-management APIs require verification.

## 7. Security and accessibility tests
Run in an approved isolated environment, not by editing production:
- Reject unauthorized registration, invalid credentials, missing/invalid/revoked/foreign passkeys, unconfirmed/suspended accounts; verify rate limits and generic errors.
- Reject wrong origin/RP ID, absent user verification, replayed/expired/concurrently reused challenges and expired/reused/wrong-email invites.
- Attempt role/delegation escalation, tampered action/resource requests, direct URLs, every server function, old RPC, Data API/private read and Storage write without passkey or sufficient permission. Check actual hosted RLS/grants, not just hidden menus.
- Independently test view/create/edit/publish/delete/approve/manage and publication/private-field transitions.
- Verify stolen identity-token denial without privileged cookie; expiry/revocation/suspension, permission updates, sensitive reauthentication and recovery-session isolation.
- Exercise lost-device and Super Admin recovery, one-use backup credentials, last-Super-Admin safeguards and maintenance-denial rollback.
- Verify transactional success audit, failed-event logging, no ordinary-Admin log modification/deletion, tamper detection and privacy redaction.
- Regress darshan/manual display, transport privacy, map/routing, photo persistence and atomic seven-language voice.
- Test Tab/Shift+Tab, arrows/Home/End, Enter/Space, Escape, editor focus return, visible focus, labels and status announcements; Android TalkBack, NVDA/VoiceOver.
- Real Android Chrome, Windows Hello, macOS/iOS and external security keys; HTTPS/workerd/origin tests. Emulator/frontend success is not biometric or security verification.

## 8. Approval-gated roadmap and decisions
1. **Feasibility:** production domain/RP IDs, workerd WebAuthn proof, trusted database execution, email delivery, owner identity and recovery custody. Approve session/step-up/retention policies.
2. **Foundation:** additive permission/audit/session schema and guarded server paths; staged owner access, no production lockout.
3. **Enrollment:** invitations, password/passkey ceremony, two backup authenticators, rate limiting and recovery rehearsal.
4. **Enforcement cutover:** close signup/bootstrap/global-admin bypasses, secure every editor/storage path, enable mandatory assurance only after end-to-end/rollback tests.
5. **Control Center/accessibility:** management/permissions/security/audit and existing module navigation. Earlier keyboard work may be separately approved as frontend-only.
6. **Separate features:** Emergency/Verification/Reports workflows require detailed approval and verified content; checklist/offline excluded.
7. **Independent security/device validation, then separately approved publication.** Rollback after enforcement must use maintenance denial, never reopen password-only privilege.

No phase is authorized yet. Confirm initial Super Admin, stable domain, invitation sender, recovery custody and exact phase scope before implementation. No passwords/biometrics in chat.

### Official research references
- [Native passkeys — experimental passwordless](https://supabase.com/docs/guides/auth/passkeys)
- [Native MFA](https://supabase.com/docs/guides/auth/auth-mfa)
- [JWT assurance claims](https://supabase.com/docs/guides/auth/jwt-fields)
- [Sessions](https://supabase.com/docs/guides/auth/sessions) and [sign-out limitations](https://supabase.com/docs/reference/javascript/auth-signout)
- [Database RLS](https://supabase.com/docs/guides/database/postgres/row-level-security) and [Storage access control](https://supabase.com/docs/guides/storage/security/access-control)
- [SimpleWebAuthn server](https://github.com/MasterKale/SimpleWebAuthn/tree/master/packages/server) and [Worker compatibility](https://developers.cloudflare.com/workers/runtime-apis/nodejs/)