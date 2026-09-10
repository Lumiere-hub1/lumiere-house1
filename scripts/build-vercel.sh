#!/usr/bin/env bash
#
# The Vercel production build.
#
# This lives in a script rather than inline in vercel.json because
# `buildCommand` is capped at 256 characters and the pipeline had outgrown it —
# adding one `cp` took it to 260 and every deploy failed schema validation
# before the build even started, with no build log to explain why. A script has
# no such ceiling, and the steps can carry comments.
#
# -e so any failing step fails the deploy rather than shipping a half-built
# site; -u to catch a typo'd variable; -o pipefail so a failure mid-pipe is not
# masked by a successful tail.
set -euo pipefail

# Apply pending database migrations first. Fails the build when DATABASE_URL is
# missing in production, which is deliberate: shipping against an unmigrated
# schema is the outage this step exists to prevent, and a failed build leaves
# the previous deployment serving.
node scripts/migrate.mjs

# public/ is build output, never source. It is rebuilt from scratch every time
# so a file removed from the export cannot linger from an earlier deploy.
rm -rf public .vercel-web-build

node scripts/ensure-nativewind-cache.mjs

pnpm exec expo export --platform web --output-dir .vercel-web-build

mkdir -p public
cp -a .vercel-web-build/. public/

# Copied last so it lands on top of the export: files third parties fetch from
# fixed paths at the site root, such as TikTok's domain-verification file.
# See web-static.md.
cp -a web-static/. public/
