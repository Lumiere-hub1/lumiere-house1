# Video-ShotCraft read-only audit findings

## Repository

The specified public repository is `Vincentwei1021/video-shotcraft`. Its README and file tree expose `SKILL.md`, `references/pipeline.md`, `references/shots/`, `references/sequences/`, `references/aesthetic-rules.md`, `references/sound-design.md`, `demos/`, `gallery/`, `template/`, `assets/lib/`, `assets/scripts/`, and `assets/audio/`. The README describes 152 shot recipe cards, 209 styles/previews, and a validated Ink Press template.

The root package is a small Vitest test package. The runnable template has `@remotion/cli`, `remotion`, and React pinned at 4.0.484 / 19.2.7, with scripts for Remotion Studio, stills, and `remotion render src/index.ts AiflPromo out/promo.mp4`. The README says Node 22 was used for headless Linux testing and recommends `--concurrency=1` plus a compatible `chrome-headless-shell` executable when needed. Rendering is deterministic Remotion code; the repository does not itself provide an AI model that generates raw images, voice, avatars, or footage.

The repository’s LICENSE is Apache License 2.0, copyright 2026 Wei Yihao. It grants broad copyright/patent permissions subject to retaining the license/attribution notices and marking modified files; it does not grant trademark rights. Bundled audio has separate attribution/license notes, and the README warns to inspect third-party asset terms before redistribution.

## Remotion licensing

The official Remotion license page is `https://www.remotion.dev/docs/license`; Remotion has separate license/pricing terms and should not be treated as unrestricted open source. The repository README itself notes that Remotion has its own license and that companies may need a paid license. Commercial embedding therefore requires a separate Remotion eligibility/license review based on Lumière’s team size and use case, independent of Video-ShotCraft’s Apache-2.0 code license.

## Lumière local audit

The Lumière repository has no Video-ShotCraft checkout, submodule, SKILL.md, shot recipes, Remotion package, Remotion render script, or worker. The only related dependency is `expo-video`, which is a playback module and not a Remotion renderer. No local ShotCraft integration or video-creation path is currently present.

## Runtime and suitability conclusion

The Lumière sandbox has Node v22.13.0, pnpm 9.12.0, six CPUs, FFmpeg, and system Chromium, but no NVIDIA GPU, no `chrome-headless-shell`, and no installed `remotion` package. Video-ShotCraft’s own headless notes recommend Node 22, concurrency 1 on low-core machines, and a compatible chrome-headless-shell executable when full Chromium cannot launch in the required mode.

Video-ShotCraft’s Apache-2.0 repository license is permissive subject to attribution/license notices, but that does not settle the commercial status of its Remotion-based output pipeline or bundled audio. Remotion’s official FAQ says it is source-available rather than OSI open source; free use covers individuals and organizations of up to three people, while larger commercial automations such as a server-side user video pipeline require the applicable Company/Automators license and render terms. Lumière’s team/entity/license status is not known, so commercial legal suitability cannot be confirmed yet.

Conclusion: do not integrate or install yet. The safe path, after legal clearance, is a separate pinned Node 22 worker package containing the selected ShotCraft template/assets, using a queue job boundary and object storage handoff; it should not be imported into the Expo/web bundle. The current environment is missing the Remotion runtime and headless-shell binary needed for a real render, so no video can currently be created by Lumière using ShotCraft.

## Licensing gate and alternative assessment

Remotion’s official Terms and Conditions define server-side rendering and programmatic render commands as “Remotion for Automators.” The official FAQ states that free-license users may build automations without purchasing renders, but free eligibility is limited to individuals, organizations/teams of up to three people, non-profits, or evaluation before commercial use. A commercial SaaS that owns code calling `npx remotion render`, `renderMedia()`, or similar is therefore not automatically free; a company outside that eligibility requires the applicable Company/Automators license. Official pricing states $0.01 per render with a $100 monthly minimum for the Automators option. Remotion license terms also do not cover third-party codec patent fees.

The intended Lumière architecture—server-side worker rendering fixed, product-owned templates from a queue and returning finished MP4s—fits the documented category of an automated rendering pipeline. It may be legally usable only after confirming Lumière’s free-license eligibility or obtaining the appropriate Remotion license. The current facts are insufficient to make that legal determination, so installation must remain stopped.

Motion Canvas is a technically plausible free/open-source alternative for a new worker: its official documentation describes an FFmpeg video exporter. It is not a drop-in replacement for Video-ShotCraft because ShotCraft’s 152 recipes, template, and Remotion TSX implementations would need to be ported or rewritten. FFmpeg itself is a separate LGPL/GPL compliance decision, especially based on build flags and codec choices. The alternative avoids Remotion’s product license but does not avoid review of third-party audio, fonts, images, codecs, hosting, and any AI asset providers.

## Free-first architecture research

Motion Canvas is MIT-licensed and describes itself as a TypeScript animation library/editor for informative vector animation; its official video exporter uses FFmpeg and supports audio inclusion and web-oriented fast-start output. It is a good fit for code-defined 2D product marketing scenes, but its exporter is described as relatively new and the existing Video-ShotCraft Remotion recipes are not portable without rewrite.

MoviePy is MIT-licensed, runs on Python 3.9+, supports cuts, concatenation, title insertion, compositing, custom effects, audio/video formats, and MP4 output. Its own documentation says it exposes every frame as Python/NumPy data and is slower than direct FFmpeg. It is a viable simple worker backend, but it lacks Motion Canvas's scene/animation authoring model and would require a custom template DSL and deterministic timing layer.

FFmpeg is LGPL 2.1-or-later by default, with optional GPL components; the official legal page requires careful build/configuration and warns that codec patents are separate. FFmpeg is an encoder/filter runtime, not a complete template/scene engine. It can be driven by generated filtergraphs, SVG/PNG frame sequences, or a higher-level library.

GStreamer is an LGPL plugin-based media framework with application-controlled pipelines and asynchronous bus/state handling. Its official licensing guidance emphasizes that codec plugins and patents require an active decision. It is strong for streaming and media pipelines but adds more operational and plugin complexity than needed for a first deterministic marketing-video worker.

Blender is GPL software and commercially permits use of the artwork it creates. It can provide advanced 2D/3D animation and video-sequence editing, but it is substantially heavier, has GPL/add-on compliance implications, and is not the lowest-cost or simplest fit for Lumière's first product-marketing worker.

Primary sources: Motion Canvas docs https://motioncanvas.io/docs/rendering/video/ ; Motion Canvas license https://github.com/motion-canvas/motion-canvas/blob/main/LICENSE ; Motion Canvas README https://github.com/motion-canvas/motion-canvas ; MoviePy docs https://zulko.github.io/moviepy/ ; MoviePy repository https://github.com/zulko/moviepy ; FFmpeg legal https://www.ffmpeg.org/legal.html ; GStreamer foundations https://gstreamer.freedesktop.org/documentation/application-development/introduction/basics.html ; GStreamer licensing https://gstreamer.freedesktop.org/documentation/frequently-asked-questions/licensing.html ; Blender license https://www.blender.org/about/license/ ; Blender video editor https://www.blender.org/features/video-editing/.

## Free-first proof-of-concept design (not implemented)

Recommended PoC stack: a separate worker repository using Motion Canvas for TypeScript scene composition and FFmpeg for MP4 encoding, with only MIT/LGPL-compatible dependencies selected explicitly. The worker receives a signed, tenant-scoped job payload containing a schema-versioned 9:16 brief, product name, approved image URLs, caption text, audio URL, duration, and output key. It validates the payload, downloads only allowlisted assets, renders to a private temporary directory, atomically uploads the MP4 and poster frame to object storage, and reports status through an authenticated callback or polling endpoint.

The worker must not import Lumière UI/server code. A durable boundary should carry job_id, workspace_id, idempotency_key, template_version, attempt, status, cancel_requested_at, error_code, input manifest hash, output object key, and audit timestamps. One worker process should execute one render at a time initially; cancellation is cooperative between scene/render stages and enforced by terminating the child encoder if requested. Retries must reuse the idempotency key and never overwrite a successful output. Tenant isolation is enforced by signed job claims and object keys of the form workspace_id/job_id, with no client-controlled cross-tenant paths.

PoC video: 1080x1920, 30 fps, 12–15 seconds, product logo/image, three animated text cards, two image transitions, subtle scale/pan motion, burned-in captions, one licensed music track, AAC audio, H.264 MP4 with fast-start metadata, poster frame, deterministic seed/timing, and a SHA-256 manifest. Acceptance checks: valid MP4 dimensions/codecs/duration, reproducible frame hashes for fixed inputs, successful retry after forced failure, cancellation leaves no published output, tenant-key rejection, and private object-storage retrieval.

Estimated recreation scope: the ShotCraft workflow concepts can be reused, but the 152 recipes, 209 style/previews, Ink Press template, asset helpers, sound-design rules, and Remotion-specific scene code cannot be imported unchanged into Motion Canvas. A first production-grade template plus job protocol is approximately 2–4 engineer-weeks; a small library of 5–10 polished templates approximately 4–8 additional engineer-weeks; recreating the full ShotCraft catalog likely 3–6+ engineer-months depending fidelity and asset rights.

Estimated speed: with CPU-only rendering, a 12–15 second 1080x1920 motion-graphics video should be budgeted initially at roughly 0.5–3x real time, then benchmarked on the selected host. This is an engineering estimate, not a vendor guarantee; image complexity, font rasterization, audio mixing, FFmpeg codec settings, and host contention can move it substantially. GPU is not required for the PoC; it becomes useful for heavy blur, 3D, denoising, or high concurrency.
