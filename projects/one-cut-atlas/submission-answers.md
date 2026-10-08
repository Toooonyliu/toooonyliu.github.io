# One Cut Atlas — submission answers and remaining checks

Prepared October 8, 2026 with Codex assistance. These are first-person drafts
for me to review, not a completed submission or proof of student-authored code.
The Render backend is live and has passed a real provider test. The frontend
endpoint is configured in the release being prepared; I should use the
connected-game feature claims below only after that GitHub Pages release is
published and checked in the browser.

## 1. Have I read the Project 2 instructions carefully?

Select **Yes!** after I have personally read the
[assignment](https://www.cs.cmu.edu/~113/project2.html). Codex reading it for
this audit does not replace my own review.

## 2. Are my code, README, prompt log and assets public?

Publication status: **Yes**. Both repositories are public. The frontend project
folder contains source, a project-specific README, the prompt log and the
distributed game art. The merged log is in the same folder as the README.

However, publication is not the same as completing the assignment: the current
README is AI-assisted technical documentation. I still need to write the main
README explanation myself and label any retained AI-generated material.

## 3. Credentials and secrets

Recommended option: **I've done my best to make sure that no secrets are exposed.**

My Render backend uses an OpenAI key stored only in private server environment
variables. The frontend contains the public backend URL, not the key, and local
photo colors still work without AI. With Codex, I checked the frontend and
backend source for common key/private-key patterns and found no matches; private
environment files are ignored. This check is limited and is not a guarantee
about every possible secret or past commit. I must not paste credentials into
GitHub, browser code, the README or this log.

## 4. Which technical features should I select?

| Form option | My current answer |
| --- | --- |
| Use of a database | **Select.** I use browser-local IndexedDB for custom duels, photos, avatar settings and cleared progress. This is not an account or cloud database. |
| Substantial data analysis or visualization | **Reasonable to select, with this explanation.** I visualize bundled Natural Earth geographic data as an interactive, shaded pixel globe with rotation, zoom and selectable regions. Whether this is substantial enough is the instructor's judgment. |
| Frontend-backend communication | **Select after the connected frontend release is published and checked.** My browser game wakes the Render service and sends a compressed photo to `/api/analyze-avatar`; the JSON response changes the fighter preview and saved avatar. |
| Thoughtful third-party API usage with secure keys | **Select after the connected frontend release is published and checked.** The server calls OpenAI Responses with `gpt-6-luna` for an approximate palette and existing outfit choice. A real provider request returned HTTP 200; the key stays server-side. |
| Exceptionally rich interactivity through an unexplored technology, like WebGL | **Do not claim WebGL.** My globe uses Canvas 2D software projection. Only select this if the instructor accepts the actual technology as new to our class. |
| Computer vision or ML module/algorithm | **Optional, explain precisely if selected.** GPT analyzes image appearance on the server, while local color sampling is deterministic. I do not claim to have trained an ML model, implemented face recognition or reproduced a person's identity. The secure third-party API option is the clearest description of this feature. |

After the connected game is verified publicly, frontend-backend communication
and secure third-party API usage are the clearest two selections. IndexedDB is
also implemented; geographic visualization is an additional defensible option.

## 5. Does my prompt log include all the requested information?

The merged log now contains 19 selected actual user messages from two chats, exact
art-generation prompts/provenance, tool/job explanations, and a documented
ImageGen sprite-size error. It remains separate from README.md. Short progress
checks are identified; the prompt count is not inflated by translations,
assistant questions or subagent work.

**Not ready for an unconditional Yes yet:** I still need to add my own code
change, actual focused work record, personal response to the AI error, exact
model labels if available, and any earlier missing development prompts. The
assignment's prompt range is guidance, not a reason to invent messages.

## 6. Briefly describe what I built — ready to copy

I built One Cut Atlas, a browser-based pixel-art sword-dueling game where players
explore an interactive globe, choose regional arenas, and use photos to customize
fighter colors and an existing outfit. It combines directional combat with
a Render backend that uses GPT image analysis, while saving custom duels and
progress locally using IndexedDB.

## 7. What code did I most substantially write or edit myself?

**This answer needs my actual work; it cannot be filled truthfully from the
available chat records.** I confirmed that I have not really edited the code
myself yet. My design feedback and playtesting are documented, but Codex made
the implementation changes recorded here. I should not say that I personally
wrote those changes or invent an edit for this answer.

After I have actually made and tested a change, I can use this structure:

> I personally edited [file and section/function] to change [specific before]
> into [specific after]. I made this change because [what I observed while
> testing], and I checked it by [actual test or playthrough]. Codex helped with
> the surrounding implementation, but I made this edit myself and can explain
> how it affects the game.

One approachable option, **not a completed contribution**, is tuning the
Wanderer opponent in src/engine.js, in PROFILES.beginner near line 17. Its
windup is currently 0.40 seconds and reaction delay is 0.28 seconds. Increasing
windup gives the player more time to see and guard an attack; increasing
reaction delay makes the opponent respond later to threats. I should play first,
choose a justified value, edit it myself, run the tests, and record the actual
before/after and result. A content or layout edit I genuinely understand also
counts; it does not have to be a complex combat change.

For example, if I personally change windup from 0.40 to 0.50 seconds and test it,
my answer could be: “I personally edited the beginner opponent's attack windup
in src/engine.js from 0.40 to 0.50 seconds. I wanted the introductory difficulty
to give players more time to read the blade direction and choose a guard. I
tested [my actual result] after making the edit.” This is a conditional draft,
not a claim that I have done the work.

## 8. Deployed app link — ready to copy

[https://toooonyliu.github.io/projects/one-cut-atlas/](https://toooonyliu.github.io/projects/one-cut-atlas/)

## 9. Main repository link — ready to copy

[https://github.com/Toooonyliu/toooonyliu.github.io](https://github.com/Toooonyliu/toooonyliu.github.io)

Project location:
[projects/one-cut-atlas](https://github.com/Toooonyliu/toooonyliu.github.io/tree/main/projects/one-cut-atlas).
README.md and prompt_log.md are inside that folder, not the portfolio root.

## 10. Second repository link — ready to copy

[https://github.com/Toooonyliu/OneCutAtlas_Backend](https://github.com/Toooonyliu/OneCutAtlas_Backend)

This contains the stateless Node avatar-analysis service deployed on Render.

## 11. Backend URL — ready to copy

[https://one-cut-atlas-api.onrender.com](https://one-cut-atlas-api.onrender.com)

My backend uses the OpenAI Responses API with `gpt-6-luna`. On October 8, a real
analysis of an authorized fictional JPEG returned HTTP 200 in about 4.4 seconds.
It returns palette colors and a choice among existing fighter styles; it does
not generate a face, a complete animated character, an account system or cloud
history. The free Render service may take longer to wake on first use. I still
need to check the connected path in the published game after this release.

## 12. Video link

**Still missing.** I need a recorded, narrated video uploaded to YouTube or
Google Drive, with access tested in a signed-out/incognito browser.

The [English HTML walkthrough](https://toooonyliu.github.io/projects/one-cut-atlas/presentation.html)
can guide my recording, but it is not a substitute for the requested video URL.
I should show the deployed game, AI Colors and its local fallback, and a duel, explain the
main architecture, and describe my actual personal code edit.

## 13. Submission confirmation

I should select the acknowledgement, submit the form myself, and check for
Google's confirmation email. No submission or confirmation is established by
this draft.

## Remaining gaps before I call this complete

- Write my own project README; include the feature I am proud of, usage, local
  running instructions, AI/reference credit and secret handling.
- Make and document an actual code/content edit I understand and tested.
- Add truthful dates, tasks and focused work durations. My proposed one-hour
  optimization window is not a completed-work record. The assignment expects
  roughly eight hours of new project work; I should not invent hours.
- Review the AI error and add what I personally inspected or learned. Existing
  evidence shows an AI-assisted fix, not a student-written extraction fix.
- Confirm model labels, remaining prompts and any missing earlier sessions.
- Verify AI Colors in the newly published game, then use the connected-feature
  selections above and the real Render URL instead of NA.
- Verify small-screen behavior and explain the keyboard/desktop limitation in
  my README if touch play is not supported.
- Record/upload the video, verify access, and add its real URL.
- Confirm course check-in/presentation obligations from my own record.
- Submit the form and check the confirmation email.

The assignment page lists October 7 at 11:59 PM as its deadline. This document
was prepared on October 8; I need to check my submission status and any course
late-submission instructions. Nothing here has been backdated.

Source for the requirements:
[CMU Project 2](https://www.cs.cmu.edu/~113/project2.html).
