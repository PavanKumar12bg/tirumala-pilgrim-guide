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

## 2. Recommended authentication architecture — proposed
Keep Cloud Auth for identity. Add **server-verified WebAuthn privileged sessions**, not a replacement identity provider.

Official documentation describes native passkeys as experimental **passwordless sign-in**, not a documented password-plus-passkey MFA factor. Do not assume custom WebAuthn produces `aal2`. Native TOTP/phone MFA is documented, but does not replace your requested passkey flow.

1. Verify email/password through a dedicated server-side publishable auth client, never the privileged service client. This grants identity only, no Admin access. Require confirmed email and eligible membership.
2. Create a cryptographically random, short-lived challenge bound to identity session, user, ceremony purpose, expected origin and RP ID; persist it with atomic single-use consumption and expiry.
3. Browser invokes WebAuthn. Enforce user verification; verify challenge, type, origin, RP-ID hash, credential ownership, signature, user-verification flags and credential revocation server-side. Handle synced-passkey zero counters/backup flags correctly; counter anomalies are signals, not simplistic universal rejection.
4. Establish a random opaque privileged session in a Secure, HttpOnly, SameSite cookie. Store only its hash with user/session binding, assurance time, credential, expiry and revocation in the database. Proposed defaults: 15-minute inactivity, 8-hour absolute expiry; fresh passkey within 5 minutes for sensitive actions. These are proposed policy values, not current settings.
5. Every protected read/write verifies identity, privileged cookie, active membership, current permissions and assurance. Password resets, invitation sessions, OAuth and refreshed identity tokens must not bypass this gate.
6. Enforce origin/CSRF checks and shared persistent rate limits for password, challenge, verify, invite and recovery endpoints. No in-memory-only counters or challenges.

**Mandatory enforcement decision:** move privileged browser queries/writes/uploads behind authorized server functions and deny their direct authenticated Data API/Storage paths. Retain public read policies. Ordinary server content work uses user-scoped clients plus narrowly scoped database RPCs whose grants exclude browser roles; trusted server-only execution supplies authorization after checks. If service-role access is necessary, it is loaded only after authorization and cannot rely on RLS for protection. A common tested server authorization layer is required. Never use a user-writable “passkey verified” flag or a user-wide unlock that enables another stolen session.

A database-visible, session-bound assurance design is an alternative only after a feasibility review proves its trusted issuance and enforcement. Do not invent signed JWTs or custom Auth `aal` claims. All old global-admin policies/RPC/storage paths must be replaced or tightened in the cutover; adding new restrictive policies alongside permissive old ones is insufficient.

Use maintained WebAuthn verification tooling such as SimpleWebAuthn, subject to an approved workerd compatibility proof. Production RP ID requires a stable HTTPS domain. Preview and production credentials must be isolated; no wildcards or broad origin acceptance. Devices may use fingerprint, face, PIN or a supported security key; never collect biometric images or promise universal compatibility.

## 3. Invitations, roles and account control — proposed
Super Admin creates an invite with assigned role/module/action scope. Store only a hash of a cryptographically random single-use token, expiry (proposed 48 hours), inviter and bound email. Resend revokes the prior token. Email verification and password setup yield an enrollment-only session; activate membership only after verified passkey registration. Token consumption, membership assignment and audit insertion are transactional. Use generic responses and durable rate limits against email enumeration.

Public signup is disabled only during the approved cutover; no self-registration/promotion as Super Admin. Bootstrap promotion is an explicit one-time operation for the existing owner, after enrollment and recovery readiness; never infer ownership from editable metadata. Preserve the account/content.

Role presets: Super Admin, Content Admin, Transport Admin, Emergency Admin, Custom Admin. Effective permissions are stored server-side, default deny, with actions `view/create/edit/publish/delete/approve/manage` per module. Private provider information is a separate permission, not implied by transport viewing. Delegated invitation/assignment cannot grant beyond an explicit delegation ceiling or promote to Super Admin. Ordinary Admins manage only their own credentials and permitted content.

Enforce publication transitions and field/resource scope separately from generic UPDATE permission. Approval does not silently grant editing/deletion. Super Admin cannot remove/suspend the last recovery-capable Super Admin without a safe handover. Suspension, permission changes and credential removal revoke affected privileged sessions immediately. Removing access does not delete historical attribution or the person's identity account.

## 4. Database and audit scope — technical details
New additive public tables are necessary; place/transport/history tables cannot safely represent credentials and authorization:
- `admin_memberships`: user UUID, lifecycle status, role assignment, invitation provenance and security version.
- `admin_roles`, `admin_role_permissions`, `admin_permission_overrides`: scoped role presets/grants; no privileges in editable user metadata.
- `admin_invitations`: hashed token, email binding, expiry, consumed/revoked state.
- `admin_webauthn_credentials`: credential ID/public key, owner, counter, transports/backup metadata, creation/last-use/revocation; no private keys/biometrics.
- `admin_auth_challenges`, `admin_privileged_sessions`: expiring single-use challenges and hashed session identifiers.
- `admin_recovery_credentials`: hashed single-use recovery secrets and controlled recovery state.
- `admin_audit_events`: append-only actor/action/resource/time/result with minimal request metadata.
- `admin_security_settings`, `admin_rate_limits`: validated policy and persistent counters.

GRANT, RLS and explicit function EXECUTE restrictions belong in the same migrations. No anonymous security reads; no browser role/session/challenge/audit writes. No managed Auth table edits. Use plain identity UUIDs where required by Cloud conventions. Keep existing `user_roles` during transition, but retire its broad Admin capability from privileged paths at cutover.

RLS/grant review covers all existing content tables, private provider data, history, both buckets and `claim_first_admin`, publication/helper RPCs. Preserve approved public reads and voice publication atomicity. Audit successful database changes transactionally; failures/login/security events use trusted append paths without secrets/passwords/tokens/full payloads. Record actor/action/result and limited redacted diffs. Hash chaining with protected external checkpoints can make tampering detectable; it is not immunity against a compromised privileged server or database owner. Retention/export policy needs approval. Avoid full IP/device fingerprint collection by default.

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

## 6. Recovery, revocation and limits
Enroll two independent authenticators for Super Admin, ideally one hardware backup stored separately. Proposed recovery: password plus a hashed one-use offline recovery credential, audited delay/notification and enrollment-only access to replace a lost key. No content/role access until new WebAuthn verification. A second authorized Super Admin may approve an identity-verified recovery; cannot simply disable passkeys. Single-owner emergency recovery requires a documented offline custody/identity procedure, not email-only approval.

Password reset changes the password only; it never grants passkey assurance. Credential compromise revokes the key and its privileged sessions. App-session revocation gives immediate privileged denial; provider access JWTs can remain valid until expiry and public reads remain available. Provider-wide refresh-token revocation and device inventory require a verified supported API; do not promise remote authenticator deletion or exact physical-device identification from a credential. Existing signed media URLs can remain usable until expiry.

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

## 8. Approval-gated roadmap
1. **Feasibility and policy gate:** stable domain/RP IDs, WebAuthn runtime proof, trusted server-to-database execution model, invitation email capability, recovery custody, owner identity and session/retention policy. No production cutover until proven.
2. **Security foundation:** additive roles/membership/audit/session schema, server action guards and deny-direct-access design; preserve existing owner access through an explicit staged transition.
3. **Passkeys and onboarding:** password verification, enrollment-only invitations, two backup authenticators, recovery rehearsal and rate limiting.
4. **Atomic enforcement cutover:** close old bootstrap/signup and global-admin bypasses, route all editors/storage through approved boundaries, enable mandatory WebAuthn only after end-to-end and rollback tests.
5. **Control Center and accessibility:** Admin Management, permissions, Security Center, audit review and existing module navigation; finish the earlier keyboard/label improvements here or as a separately approved frontend-only task.
6. **Optional module completion:** detailed Emergency/Verification/Reports scopes require separate approval and verified content. Checklist/offline remain outside this plan.
7. **Independent security/device validation, then separately approved publication.** Rollback must never reopen password-only privileged access once mandatory assurance is active; use maintenance denial while recovering.

### Decisions needed before implementation
Stable production domain; confirm existing owner as initial Super Admin; backup authenticator/recovery custody; invitation sender readiness; approve exact privileged session/step-up/retention policy and which phases to authorize. No passwords or biometric data should be shared in chat.

### Official research references
- [Native passkeys — experimental passwordless](https://supabase.com/docs/guides/auth/passkeys)
- [Native MFA](https://supabase.com/docs/guides/auth/auth-mfa)
- [JWT assurance claims](https://supabase.com/docs/guides/auth/jwt-fields)
- [Sessions](https://supabase.com/docs/guides/auth/sessions) and [sign-out limitations](https://supabase.com/docs/reference/javascript/auth-signout)
- [Database RLS](https://supabase.com/docs/guides/database/postgres/row-level-security) and [Storage access control](https://supabase.com/docs/guides/storage/security/access-control)
- [SimpleWebAuthn server](https://github.com/MasterKale/SimpleWebAuthn/tree/master/packages/server) and [Worker compatibility](https://developers.cloudflare.com/workers/runtime-apis/nodejs/)