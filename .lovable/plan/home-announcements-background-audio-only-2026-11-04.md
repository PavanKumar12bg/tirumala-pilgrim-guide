# Home announcements: background audio only

## Scope and resolved choice
Remove all visible announcement presentation from Home only. Preserve the Home hero, darshan/crowd cards, quick actions, map links, voice assistant, footer and navigation. Preserve announcements on other pages and the complete Admin announcement workflow.

**Audio permission choice:** place a text-only “Website sound” setting inside the existing language dropdown. No new Home button, speaker icon, card, banner, popup or reserved space. Opening the existing menu reveals the setting; its explicit tap can enable sound when autoplay is blocked. Include an off choice to stop playback and remember the visitor’s preference.

## What inspection confirmed
- `src/routes/index.tsx:55` mounts `DarshanVoiceCard` beneath the status cards.
- `src/components/DarshanVoiceCard.tsx:100–114` renders the announcement heading, text, date and Listen/Pause/Replay/Enable controls.
- `src/components/AppShell.tsx:10–28` defines `TopBar`, which mounts the global ticker at line 25. Removing only the voice card would leave the Home ticker visible.
- `src/components/AnnouncementTicker.tsx:40–45` owns the ticker, megaphone indicator and announcement-details dialog.
- `src/components/LanguageSwitcher.tsx:19–37` already provides the language dropdown; this is the chosen location for the sound preference.
- Existing playback uses one tab-shared audio element, selected-language queries, clip identity and an end-of-playback repeat timer. Announcement polling is currently 60 seconds; settings polling is five minutes.
- The existing preference key is written after a manual successful play but is not read to honor a visitor’s choice. Query failures are not checked explicitly and can resemble “no announcement.” Pending playback and timers need stronger cancellation when settings/language change.

These are code-inspection findings. No audio generation, publish/delete action, database change or browser playback test was performed during planning.

## Exact component changes
1. **`src/components/AppShell.tsx`** — make `TopBar` omit `AnnouncementTicker` on the canonical Home route `/`, using current router state. Keep the ticker unchanged on every other public/admin page. Unmount it on Home, including its dialog; do not hide it with CSS or leave a spacer.
2. **`src/components/DarshanVoiceCard.tsx` → `src/components/BackgroundDarshanAudio.tsx`** — replace the Home-facing card with a render-null audio owner. Retain public reads and signed audio URLs; remove all announcement markup and visual controls. The new name reflects its nonvisual role.
3. **`src/routes/index.tsx`** — replace the card import/mount with the background player, outside the spaced content stack. Preserve every other Home element and its order. Existing content naturally closes the removed card/ticker gaps.
4. **`src/components/LanguageSwitcher.tsx`** — add a text-only, accessible “Website sound” on/off setting within the existing dropdown, backed by a shared browser preference module. It does not change the closed header or navigation. A blocked state is communicated only inside the opened menu, without a toast or popup.
5. **New `src/lib/announcement-audio.ts`** — centralize the single audio owner, preference subscription, synchronous gesture-based enable operation, source generation IDs and repeat cancellation. This lets the menu directly initiate playback during its user gesture rather than relying on a later effect that might lose browser activation.
6. **`src/lib/voice-copy.ts`** — add sound-setting and blocked/unavailable menu labels in all seven languages, using the existing dictionary integration in `src/lib/i18n.tsx`. No Home announcement text or heading is rendered.
7. **New `src/lib/announcement-audio.test.ts`**, alongside **`src/lib/voice-announcement.test.ts`** — test preferences, lifecycle, language replacement, timer rules and race cancellation. Update the architecture rule in `AGENTS.md` after implementation to record the Home exception.

`AnnouncementTicker.tsx` itself does not need a redesign. Admin components, translation/TTS functions and provider calls remain untouched.

## Background playback rules
- Load only the active published announcement’s selected-language audio. Do not fetch or generate all seven audio files in the visitor browser.
- Wait for settings and publication state before deciding to play. If the visitor has explicitly disabled sound, do not autoplay or repeat. With no explicit opt-out and admin autoplay enabled, try autoplay and accept the browser’s decision.
- A blocked autoplay attempt leaves Home silent. No popup, automatic menu opening or permission bypass. The visitor may enable sound with the text-only menu setting. Remember on/off preference, but never claim that saved consent guarantees playback on later visits.
- Maintain one audio element per tab. Invalidate outstanding play attempts before changing source; cancel old timers and stop the old clip immediately on a language change, then load the correct language. Never fall back to another spoken language.
- A successful new publication replaces the audio after detection; confirmed deletion clears the source and cancels all repeats. Keep the previous active audio through transient read failures, rather than treating errors as deletion.
- Poll active publication and settings every 30 seconds while Home is visible, plus refresh on focus/reconnection. This gives bounded, eventual replacement/deletion detection without new realtime infrastructure. It is **not instantaneous** across visitors; typical detection is within 30 seconds while connected.
- Retain atomic seven-language publishing: incomplete or failed replacements never become public.
- Repeat only after the current clip finishes, using the existing admin interval (1/3/5/10/15 minutes). Recheck current settings and preference before playing; never interrupt a clip to repeat it.
- Pause and cancel timers when Home is hidden; resume eligibility when visible without accumulating missed repeats. Leaving Home stops audio. This is background-to-the-interface playback, not phone-lock-screen or closed-browser playback.
- Renew signed URLs when needed; retry transient reads/media failures with bounded backoff, without popups, source hammering or overlapping audio.
- Preserve the separate microphone-based voice assistant. Coordinate announcement pause while that existing assistant is open to prevent announcements interfering with listening or speech.

## Preservation and setup
**No migration, database data change, bucket change, RLS change, secret, new AI provider, package install, scheduler or deployment is required.** Preserve `voice_announcements`, `voice_announcement_langs`, `voice_settings`, private `announcement-audio`, existing admin checks and `publish_voice_announcement()` exactly as they are.

Admin draft/translation/TTS progress, preview/retry/regeneration, publish/replacement/deletion and repeat/enable settings remain functional. Previously stored translations/audio are reused. No AI credits are consumed by background playback; generating a new test announcement still uses the existing AI service.

## Verification after approval
- Run existing voice-announcement and i18n tests plus new lifecycle tests and the applicable regression suite.
- Assert selected-language audio for all seven languages; source switches cancel old playback even when a prior `play()` promise is pending.
- Test autoplay success, `NotAllowedError`, menu enable gesture, persisted opt-out and opt-in, and admin disable settings. No automatic retries after explicit opt-out.
- Test configured intervals with controlled timers; hidden-page pause/resume, route departure, repeated renders and rapid language changes must not cause duplicate audio.
- Test successful replacement, confirmed deletion, failed fetch versus true empty state, missing language/audio, signed-URL expiry and network recovery.
- Inspect Home at 360×527, a wider Android-sized viewport and desktop: no ticker, announcement heading/text/icon/button/card/dialog, no reserved gap and unchanged navigation. Verify other pages still show their existing ticker.
- Verify the existing admin preview and publish/delete flow through an authenticated session. Use clearly marked temporary test data only with approval and restore the prior active announcement/preferences; do not delete real content for testing.
- Browser audio mocks can test lifecycle reliably. Real Chrome Android autoplay permissions, device audio and phone background behavior require a physical-device check and will be reported separately, not claimed from desktop simulation.

## Acceptance criteria
Home contains no visible announcement presentation. Audio matches the selected language, follows admin settings and the visitor’s sound choice, never overlaps with another announcement, swaps after publication detection and stops after confirmed deletion. Admin generation/storage/security and all non-announcement Home content remain intact.

**Awaiting approval: no application code, database, storage or settings changes have been made.**