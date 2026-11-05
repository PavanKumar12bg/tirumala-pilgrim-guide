# Tirumala Guide — Admin Control Center and passkey security

## Scope and approval
**Read-only audit completed on 5 November 2026. Implementation is not authorized.** Preserve the existing app, accounts, public pages, languages, maps, transport, background voice, Cloud identity provider and migrations. The checklist remains separate.

The earlier keyboard-accessibility task was inspected but not implemented after the planning-only instruction arrived. Only planning/task-tracking documents were written; no application code, records, auth settings, policies, storage or deployment changed.

## 1. Verified current state
Evidence labels: **Source** = inspected code/migrations; **Hosted** = read-only settings/database queries; **Preview** = observed browser; **Proposed** = not implemented.

| Area | Finding and evidence | Gap / consequence |
|---|---|---|
| Admin entry | **Source/Preview:** `/admin`, `src/routes/admin.tsx`; password sign-in, public signup and first-admin claim; signed-out form and signed-in overview rendered. | No password-plus-passkey gate or invitation-only onboarding. |
| Hosted auth | **Hosted:** email auth enabled; public signup enabled; email auto-confirm disabled; anonymous signup disabled. One user, one Admin, zero unconfirmed users and zero verified native MFA factors at inspection. | Account creation is unrestricted, but registration does **not** automatically grant Admin. Password/MFA rate-limit, HIBP and session-timeout settings were not verified. |
| Roles | **Source/Hosted:** `public.user_roles`, enum `admin`/`user`, `has_role()`. User can read own role; clients have no role-write policy. | All Admins share global power; no Super Admin, account suspension or module/action permissions. |
| Bootstrap | **Source:** `claim_first_admin()` allows the authenticated caller only while no Admin exists. Currently one Admin exists. | Retire this public bootstrap when adopting invitations. Check-then-insert lacks visible serialization; concurrent claim behavior was not tested. |
| Content authorization | **Source/Hosted:** existing table policies require `has_role(auth.uid(),'admin')`; public visibility filters remain separate. | A password-authenticated Admin can directly use the Data API; a UI-only passkey step would be bypassable. |
| Storage | **Hosted:** both buckets private; writes require global Admin. All `place-images` objects have an anon/authenticated SELECT policy; announcement public reads depend on publication. | Private bucket alone does not make images confidential. Future restricted/draft images need explicit policy review; avoid breaking public signed-photo display. |
| Server functions | **Source:** generated bearer middleware validates claims; photo identification and voice functions additionally check Admin. `src/start.ts` attaches bearer auth and CSRF protection. | No common action authorization, custom passkey assurance, suspended-account or app-session revocation checks. |
| Sessions/recovery | **Source:** persisted browser identity session, refresh and sign-out. No password-reset page, passkey enrollment, recovery credentials or Admin session inventory found. | Provider identity session is not privileged assurance; token validation alone does not guarantee immediate revocation. |
| Audit | **Source/Hosted:** trigger-generated `status_history` exists, read-only to Admins. | Not a general audit log; invitations, security actions, content edits and login failures lack application-wide coverage. |
| Admin UI | **Source/Preview:** seven tabs: overview, status, ticker, voice, places, review, transport; transport has categories/providers. | Emergency management, verification workflow, correction reports, security and account-management modules are absent. Do not present empty modules as implemented. |
| Migrations | **Source:** SQL migrations `0000`–`0009`; `drizzle/schema.ts` is generated and intentionally blank. | Preserve migration-led schema; do not replace the blank generated schema or rewrite history. |

### Accessibility findings carried forward
Unassociated Transport field/language/source labels; unnamed place-deletion icon; ambiguous repeated row actions; busy buttons lose names; hidden photo inputs lack a visible focus cue; expandable controls lack state announcements. Existing Radix tabs/sheets provide keyboard primitives, but focus return from programmatically opened editors needs verification. History charts need an equivalent readable data summary. No real screen-reader audit has been performed.

### Verification limits
No new accounts, password attempts, passkey enrollment, content writes, attack tests, package installs, builds or regression tests were performed for this planning audit. Preview used the existing managed session; this is not proof of a production login ceremony. Native device support, hosted security settings beyond the public auth settings, provider session administration and production Worker compatibility remain unverified. A query returned zero provider session rows; this does not prove no active sessions exist.

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
Retain `/admin` as the entry; one shared Admin shell with distinct protected module views. Desktop section navigation; accessible mobile drawer; restrained maroon/gold/stone, compact lists/tables rather than repeated dashboard cards. Show only authorized modules and meaningful measured counts. Unimplemented Emergency, Verification and Reports features remain separately gated by detailed content scope; no invented alerts or empty “complete” modules.

| Change | Files/components | Database | Dependencies / tests |
|---|---|---|---|
| Entry and privileged gate | `src/routes/admin.tsx`; new protected Admin layout/module routes registered together | Yes | identity/passkey states, direct navigation, expired/revoked sessions |
| Existing editors and reads | `AdminPanel.tsx`, `TransportAdmin.tsx`, `VoiceAnnouncementAdmin.tsx`, `PhotoIdentifier.tsx`, `StatusHistory.tsx` in `src/components/admin/` | Policies/grants | replace direct privileged calls; preserve save/photo/voice behavior |
| Server permission enforcement | new `src/lib/admin-auth.functions.ts`, `admin-auth.server.ts`, `admin-permissions.server.ts`, `admin-content.functions.ts`; update `photo-identify.functions.ts`, `voice-announcement.functions.ts` | Yes | fail-closed authorization, action/resource validation, direct endpoint tests |
| WebAuthn/recovery/invites | new `src/lib/admin-webauthn.functions.ts`, `admin-webauthn.server.ts`, `admin-invitations.functions.ts`, `admin-recovery.functions.ts` and server-only helpers | Yes | domain/crypto/runtime, email delivery, enrollment and replay tests |
| Account/security/audit UI | new `AdminShell.tsx`, `AdminManagement.tsx`, `RolesPermissions.tsx`, `SecurityCenter.tsx`, `AuditLog.tsx` under Admin components | Yes | sensitive step-up, permission matrix, responsive/accessibility checks |
| Session plumbing | `src/start.ts`, new app-owned middleware; read generated auth helpers but do not edit them | Yes | CSRF, cookie/session binding, cache purge on sign-out |
| Labels/focus/copy | existing Admin components, scoped `src/styles.css`, `src/lib/i18n.tsx`, shared Sheet only if necessary | No for presentation | keyboard order, labels, focus return, seven-language labels |
| Migrations/tests | additive `drizzle/migrations/*` through managed migration tooling; focused auth/permissions/browser tests | Yes | hosted schema/RLS/grants, Worker deployment proof |

Public content routes are preserved. New Admin route filenames are finalized with the approved navigation scope; no duplicate app or missing linked routes.

## 6. Recovery, revocation and limits
Enroll two independent authenticators for Super Admin, ideally one hardware backup stored separately. Proposed recovery: password plus a hashed one-use offline recovery credential, audited delay/notification and enrollment-only access to replace a lost key. No content/role access until new WebAuthn verification. A second authorized Super Admin may approve an identity-verified recovery; cannot simply disable passkeys. Single-owner emergency recovery requires a documented offline custody/identity procedure, not email-only approval.

Password reset changes the password only; it never grants passkey assurance. Credential compromise revokes the key and its privileged sessions. App-session revocation gives immediate privileged denial; provider access JWTs can remain valid until expiry and public reads remain available. Provider-wide refresh-token revocation and device inventory require a verified supported API; do not promise remote authenticator deletion or exact physical-device identification from a credential. Existing signed media URLs can remain usable until expiry.

## 7. Security and accessibility tests
Test in an isolated approved environment, not by changing live records:
- Public/uninvited registration, invalid credentials, unconfirmed or suspended member denied; generic errors and rate limits verified.
- Missing/invalid/revoked/foreign credentials, wrong origin/RP ID, missing user verification, expired/replayed/concurrently reused challenges denied.
- Expired/reused/wrong-email invitation, unauthorized promotion/delegation, tampered module/action/resource requests denied.
- Call every server function, old RPC, Data API write/private read and Storage write directly without passkey and with insufficient permission; verify hosted RLS/grants, not just UI.
- Publish/create/edit/delete permissions independently tested, including field changes that alter publication or expose private data.
- Stolen identity token cannot access without privileged cookie; revoked/expired session, suspension and permission changes take effect; re-login/recovery cannot bypass enrollment.
- Sensitive operations require fresh authentication; last-Super-Admin safeguards, lost-device/backup-code reuse and supervised recovery tested.
- Audit insert accompanies successful mutation; failures recorded; ordinary Admin cannot alter/delete logs; tamper detection and privacy redaction tested.
- Regression: official/manual darshan, transport private fields, real map/routing, private photo save and atomic seven-language voice publication.
- Keyboard Tab/Shift+Tab, arrows/Home/End in tabs, Enter/Space, Escape and editor focus return; visible focus, meaningful labels, stable busy names and status announcements. Screen-reader checks with Android TalkBack and desktop NVDA/VoiceOver.
- Android Chrome, Windows Hello, macOS/iOS and external security keys tested on real supported devices; emulator results are not biometric verification. Confirm deployment under workerd/HTTPS and trusted origins.

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