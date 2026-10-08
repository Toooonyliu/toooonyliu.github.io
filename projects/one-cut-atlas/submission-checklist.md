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
- Show a zone selection, a portrait preview, a duel, and the victory aftermath.
- Explain the idea and why you chose it. Explain a concrete iteration and one
  code change you understand.
- Say that local photo colors work now. Describe AI feature extraction and the
  Render backend as next steps until they are genuinely configured.
- Record the browser with your voice using your preferred screen recorder.
  This HTML page does not automatically produce a video.

## Before publishing and submitting

- [ ] Check the public game link on desktop and phone.
- [ ] Put the frontend in a clearly named folder in the public portfolio repo.
- [ ] Link the project from the portfolio's work section.
- [ ] Finish the student-authored README.
- [ ] Add the earlier development transcript to prompt_log.md.
- [ ] Add actual code edits and elapsed work. Review the documented ImageGen
      size error and record your own response to it.
- [ ] Record and upload the short demonstration video.
- [ ] Submit the public app/source/video links through the assignment form.

The backend repository can remain a separate public repository. API credentials
belong in the backend host's environment variables, never in GitHub Pages code
or the prompt log.
