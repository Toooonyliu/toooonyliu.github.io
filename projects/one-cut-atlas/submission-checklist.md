# One Cut Atlas — final submission checklist

This is an AI-generated planning aid. It does not replace Tony's own README.

The [Project 2 assignment](https://www.cs.cmu.edu/~113/project2.html) asks for a
public app, public source with a project-specific README and prompt log, a short
demo video, and the submission form. It lists October 7 at 11:59 PM as the
deadline. The app should support small screens or clearly explain a desktop
limitation. The student must be able to explain the code and personally write
or substantially modify some of it. The process record should describe real
work, tool choices and an AI mistake.

## Tony's README

Write the main README in your own words. Answer these directly:

1. What does One Cut Atlas let someone do?
2. How does someone play it and use a portrait?
3. Which feature are you most proud of, and why?
4. How can someone run the project locally?
5. Where do secrets live, and what works without a backend?
6. How did you use AI? Which references influenced the work?

If retaining AI-drafted technical documentation, put it below your own text
under a clear “AI-generated documentation” heading. The current README was
already present when this iteration started. Its existence does not establish
student authorship.

## Hands-on changes to document

After playtesting, choose a small number of settings you can explain. Use the
actual preset/config file from the finished implementation.

| Setting | Before | Your chosen value | What you observed / why you changed it |
| --- | --- | --- | --- |
| Victory aftermath duration | Read from the source | To fill | To fill |
| One combat timing or distance | Read from the source | To fill | To fill |
| A regional stage palette or effect | Read from the source | To fill | To fill |

Ask Codex to point out the exact line and explain its effect. Then make or
substantially modify the code yourself, test it, and log what happened. A verbal
approval of AI-generated code is different from personally modifying it.

## Recording with presentation.html

- Open presentation.html in a browser. Use left/right arrows to move, N for
  speaker notes and F for fullscreen.
- The demo slide embeds the real game. Click “Play the live demo” to give it
  keyboard input. “Return to walkthrough” restores slide navigation.
- Show a zone selection, a portrait preview, AI Colors, a duel, and the victory aftermath.
- Explain the idea and why you chose it. Explain a concrete iteration and one
  code change you understand.
- Explain that AI Colors calls a live Render service using OpenAI Responses
  with `gpt-6-luna`. It returns an approximate palette and existing outfit
  choice, not a recreated face or newly generated fighter sprites. Show that
  local photo colors and manual controls still work without AI.
- Record the browser with your voice using your preferred screen recorder.
  This HTML page does not automatically produce a video.

## Before publishing and submitting

- [x] Check the public game link on desktop. Phone/touch behavior still needs
      a final check and an accurate README limitation.
- [x] Put the frontend in a clearly named folder in the public portfolio repo.
- [x] Link the project from the portfolio's work section.
- [ ] Finish the student-authored README.
- [x] Merge the supplied earlier development transcript into prompt_log.md:
      19 selected actual human messages across two chats, with original wording retained.
- [x] Deploy the backend at https://one-cut-atlas-api.onrender.com and verify a
      real OpenAI provider analysis returned HTTP 200 on October 8.
- [x] Configure the public backend URL in the local frontend release; keep the
      OpenAI key only in private server environment variables.
- [ ] Publish that connected frontend release and verify upload → AI Colors →
      preview → save/fight → reload in the deployed browser game. Only then
      claim live frontend-backend communication and secure third-party API use.
- [ ] Confirm any other missing chats and exact model labels. Short check-ins
      are identified, not presented as extra substantial development prompts.
- [ ] Add actual code edits and elapsed work. Review the documented ImageGen
      size error and record your own response to it.
- [ ] Record and upload the short demonstration video.
- [ ] Submit the public app/source/video links through the assignment form.

The backend repository can remain a separate public repository. API credentials
belong in the backend host's environment variables, never in GitHub Pages code
or the prompt log.

Updated October 8, 2026. The backend is live and its real provider call
passed; the latest connected frontend still needs its public-game check. No
recorded video, student-authored code edit or form submission is claimed.
The assignment's listed October 7 deadline has passed
as of this update; check actual submission status and course instructions.
