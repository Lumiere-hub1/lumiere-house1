# web-static/

Files copied verbatim to the site root on every deploy.

`public/` cannot be used for this. The Vercel build command deletes it
(`rm -rf public`) and rebuilds it from the Expo web export, so anything
committed there would vanish at build time. `web-static/` is copied over the
export afterwards instead — see `buildCommand` in `vercel.json`.

This note lives at the repo root rather than inside `web-static/` because
everything in that directory is served publicly; a README placed there would
be readable at `/README.md`.

What belongs in `web-static/`: domain-verification files that a third party
fetches from a fixed path at the site root, and nothing else.
`tiktok<hash>.txt` verifies ownership of the domain in TikTok's developer
dashboard; Google, Meta and others use the same pattern, so add theirs
alongside it.

Two things to be careful about:

- **Serve the file byte for byte.** These are compared exactly. Do not add a
  trailing newline, reformat, or "tidy" the contents.
- **Deleting a file here un-verifies the domain.** Providers re-check
  periodically, not just once, so these stay for as long as the integration
  does.

Anything that is part of the app itself belongs in `assets/` or in a route
under `app/`, not here.

## Deploy from git, not from a local checkout

`vercel --prod` uploads the files in the folder it is run from, not what is on
`main`. Run from a checkout that is behind, and it publishes that older tree
over production — silently, and with no warning that anything regressed.

This has happened twice, both times from the same stale checkout sitting four
days behind. Each time it removed `web-static/` from the deployed output, so
`tiktok<hash>.txt` started returning the app's HTML instead of its 68 bytes of
plain text, and the domain quietly stopped verifying. The root-level `/privacy`
and `/terms` routes went with it — the URLs registered with TikTok resolving to
nothing.

Deploy by pushing to `main` and letting the git integration build. If you do
deploy from a local checkout, `git status` and `git log --oneline -1` first,
and confirm the commit matches `origin/main`. A deployment whose Vercel
metadata shows `gitDirty: 1` was built from uncommitted local files and should
be treated as suspect.
