# Typewriter

The writer's composing app. Static HTML/CSS/JS, no build step — talks to the
Backend Server for authentication, uploading, and syncing review status.

## Running it locally

Needs the Backend Server running (see `../Backend Server/README.md`) and its
`.env` `ALLOWED_ORIGINS` to include this app's origin.

```bash
python3 -m http.server 8422
```

Then open `http://localhost:8422`. `api.js` points at
`http://localhost:4000/api` by default — change `API_BASE` there if the
backend runs elsewhere.

## How it works

- **Login** requires a name (used as your byline and to route posts sent back
  to you for revision) and the shared writer password.
- **Drafts live in `localStorage`**, scoped per logged-in name
  (`typewriter:drafts:<name>`), so different writers signed in on the same
  browser don't see each other's work. Every keystroke autosaves (debounced)
  — nothing is lost on an accidental close or reload.
- **Compose view** has independent fields for author (byline), title, and
  header image, a formatting toolbar (bold/italic/underline/strikethrough —
  wraps the current selection in the same `**`/`*`/`__`/`~~` markdown Reader
  View already understands), and an "Insert image" button that accepts either
  a pasted URL or a file upload.
- **Uploading** sends the draft to the server as `unpublished` — it is never
  auto-published. You can keep editing and re-uploading it right up until an
  editor publishes it.
- **When an editor sends a post back** with a comment, it shows up back in
  your drafts list (synced from the server whenever you return to the
  dashboard) tagged "Needs revision", with the comment displayed above the
  editor. Fix it and hit "Revise & resubmit" to send it back for another look.
- **Once published**, a post becomes read-only here — further edits happen
  through the Editor Controller.

## A note on scope

The plan's "cannot see posts other than those stored locally on the device"
rule is honored in spirit rather than literally: the Typewriter never lists
other writers' posts or the full catalog, but it does pull down your *own*
posts that an editor has sent back for revision (via `GET /api/posts/mine`)
so the return-with-comment workflow has somewhere to surface. Without that,
a returned post would be a dead end with no way to see the editor's note.
