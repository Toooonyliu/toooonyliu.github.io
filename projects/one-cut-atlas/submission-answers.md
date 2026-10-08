# One Cut Atlas — submission answers and remaining checks

Prepared October 8, 2026 with Codex assistance. These are first-person drafts
for me to review, not a completed submission or proof of student-authored code.
They reflect the current published version, not planned features.

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

My optional backend is designed to use an OpenAI key stored only in private
server environment variables. No key is configured in the published frontend,
and the live game works without one. With Codex, I checked the frontend and
backend source for common key/private-key patterns and found no matches; private
environment files are ignored. This check is limited and is not a guarantee
about every possible secret or past commit. I must not paste credentials into
GitHub, browser code, the README or this log.

## 4. Which technical features should I select?

| Form option | My current answer |
| --- | --- |
| Use of a database | **Select.** I use browser-local IndexedDB for custom duels, photos, avatar settings and cleared progress. This is not an account or cloud database. |
| Substantial data analysis or visualization | **Reasonable to select, with this explanation.** I visualize bundled Natural Earth geographic data as an interactive, shaded pixel globe with rotation, zoom and selectable regions. Whether this is substantial enough is the instructor's judgment. |
| Frontend-backend communication | **Do not select for the current live version.** The optional endpoint is implemented but not deployed or connected. |
| Thoughtful third-party API usage with secure keys | **Do not select as operational yet.** OpenAI integration exists as source, but no real provider request has been verified. |
| Exceptionally rich interactivity through an unexplored technology, like WebGL | **Do not claim WebGL.** My globe uses Canvas 2D software projection. Only select this if the instructor accepts the actual technology as new to our class. |
| Computer vision or ML module/algorithm | **Do not select unqualified.** Local photo color sampling is deterministic image analysis, not face recognition or learned ML. Ask the instructor if this limited algorithm qualifies before claiming it. |

The database is the firm qualifying feature. The geographic visualization is
the strongest candidate for a second feature without claiming an inactive API.

## 5. Does my prompt log include all the requested information?

The merged log now contains 17 actual user messages from two chats, exact
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
fighter colors. It combines directional combat with geographic visualization
and saves custom duels and progress locally using IndexedDB.

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

This contains the optional stateless Node avatar-analysis service. It is source
code, not a live API deployment.

## 11. Backend URL — current answer

**NA** — the submitted live demo currently runs without a deployed backend.
There is no verified Render URL to enter. If I deploy and connect the service
before submission, I must replace NA with the actual HTTPS service URL and test
it end-to-end with a photo I have permission to use.

The optional API is OpenAI Responses image analysis. It returns palette colors
and a choice among existing fighter styles; it does not generate a face, a
complete animated character, an account system or cloud history. No particular
GPT model is active until it is configured privately on the backend.

## 12. Video link

**Still missing.** I need a recorded, narrated video uploaded to YouTube or
Google Drive, with access tested in a signed-out/incognito browser.

The [English HTML walkthrough](https://toooonyliu.github.io/projects/one-cut-atlas/presentation.html)
can guide my recording, but it is not a substitute for the requested video URL.
I should show the deployed game, photo customization and a duel, explain the
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
