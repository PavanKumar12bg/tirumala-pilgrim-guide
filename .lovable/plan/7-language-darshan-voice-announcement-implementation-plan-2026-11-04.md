# 7-language Darshan voice announcement — implementation plan

Nothing is changed until you approve. No outside account or API key is needed: translation and voice use the app's built-in AI service (billed to your Lovable credits).

## What you will get
- **Admin → new "Voice announcement" tab.** Type the text → Generate → see 7 rows (Telugu, English, Hindi, Tamil, Kannada, Malayalam, Odia), each with translation, status (waiting / working / ready / failed), a play button and Retry. Publish is enabled only when all 7 are ready. Also: edit & regenerate, delete current, publish time, repeat settings (on/off, 1/3/5/10/15 min).
- **Home page card** under the status cards: announcement text in the visitor's language, updated date/time, Listen / Pause / Replay. Plays only the visitor's language; switching language stops the old voice and loads the new one.
- **Autoplay:** tries to play once on arrival. Phones usually block this, so a clear "Enable Darshan voice announcements" button appears; the choice is remembered on that phone. Repeats at the set interval only while the page is open and visible. Never plays two voices at once.
- **Replacement:** a new announcement is built as a draft while the old one keeps playing. Only when all 7 voices are ready does Publish swap them in one step. Visitors pick up the new one within about a minute; old audio files are deleted after the swap. If anything fails, the old one stays live and the admin sees the error.
- **Delete:** removes it from the home page; open pages stop playback on next check (about 60 s) or immediately for the admin's own browser.

## Honest limits
- Autoplay cannot be guaranteed on mobile; the button is the fallback.
- Repeat works only while the guide is open; no background playback when the phone is locked.
- The voice model's Odia (and possibly Malayalam/Kannada) quality is not confirmed yet. First implementation step checks it; if a language isn't supported I'll stop and tell you before publishing anything for it.
- Machine translation can be imperfect; the admin preview is the safety check. Numbers are checked automatically (see below).

## Technical details
**Database (additive, admin-only writes):**
- `voice_announcements`: id, source_text, source_lang, status (`draft|generating|ready|published|retired`), published_at, created_by, created/updated. Partial unique index: only one `published` row.
- `voice_announcement_langs`: announcement_id (FK, cascade), lang (check in 7 codes), text, text_status, audio_path, audio_status, error, text_hash, unique(announcement_id, lang).
- `voice_settings` (single row): autoplay_enabled, repeat_enabled, repeat_minutes (check in 1,3,5,10,15).
- RLS: public reads only published announcement and its langs + settings; admins full access via `has_role`. GRANTs per table.
- `publish_voice_announcement(id)` security-definer function: checks admin, row lock, all 7 ready, retires old, publishes new — prevents conflicting publishes.

**Storage:** new private `announcement-audio` bucket (public buckets are blocked in your workspace), paths `<announcementId>/<lang>-<hash>.<ext>`; home page gets a signed URL for only the selected language. New id/hash in the path means old cached audio is never reused.

**Server (createServerFn, admin-checked like photo identify):**
- `translateAnnouncement`: one AI call returns all 7 translations as structured JSON; validator confirms every digit sequence in the source appears in each translation, else marks that language failed.
- `generateAnnouncementVoice({id, lang})`: one language per call (stays within server time limits), skips if same text hash already has audio. Admin page runs the 7 calls in sequence and shows progress; Retry re-runs one.
- `getPublishedAnnouncement` (public): text + one signed URL for requested language.
- AI: `@lovable.dev/ai-gateway`, default text model for translation, default speech model `google/gemini-3.1-flash-tts-preview`; credit/rate-limit errors shown plainly.

**Front end:** `src/components/admin/VoiceAnnouncementAdmin.tsx` (new tab in `AdminPanel.tsx`); `src/components/DarshanVoiceCard.tsx` on `src/routes/index.tsx`; one shared audio player hook (single `Audio` element, keyed by announcement id + lang) and 60 s polling; labels in all 7 dictionaries.

**Tests:** unit tests for number-preservation check, repeat scheduler (interval, no overlap, stops on language change/replacement/delete), language→audio selection; RLS check that a signed-out visitor can't write or see drafts; browser run as admin: publish Telugu text, all 7 ready, play Telugu/English/Hindi, replace, delete, autoplay-blocked button. Existing 50 tests must still pass.

**Files:** new migration, 3 new components/hooks, 1 functions file + server helper, edits to `AdminPanel.tsx`, `index.tsx`, `i18n` copy, `roadmap.md`, `AGENTS.md`.
