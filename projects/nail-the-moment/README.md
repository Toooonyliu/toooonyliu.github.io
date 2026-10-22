# Nail the Moment

A static product-design case study following the visual system of the existing [Mibly case study](../mibly/). The page uses Mibly's base stylesheet, with project-specific warm cream, espresso and berry styling in `case-study.css`.

## Content and assets

- The narrative follows the **讲稿** tab of the supplied [Nails script](https://docs.google.com/document/d/1v8Wgj6o1axOSSV5rNa1ccgHYMPy8I9T8JnsvKwZQBOg/edit).
- The **图像** tab supplies the appointment scenario images, original wordmark, and actual early interface exploration. Scenario images do not establish participant research or measured results.
- `assets/media/` contains recordings of the working prototype with sample data. AR footage demonstrates camera-off controls and is labelled accordingly.
- `assets/credits.json` records the content sources and visual provenance.
- The page links to the maintained prototype's phone mode, desktop simulator, and presentation. The interactive embed loads only when the visitor launches it.

## Files

- `index.html`: narrative, animated feature demonstrations, prototype links and embed entry points.
- `case-study.css`: Nail the Moment styling and responsive media layouts.
- `case-study.js`: visible-only video playback, pause controls, reduced-motion handling, mobile navigation, and on-demand prototype iframe.

## Preview

Serve the repository root with any static server and open `/projects/nail-the-moment/`. There is no build step. GitHub Pages publishes the repository root.

## Prototype boundaries

The working concept supports sample-data browsing, photo history, 3D design editing, palette reuse and AR controls. Personal photos and edits stay in the browser. Photo-to-3D reconstruction is simulated, and community accounts and publishing are not connected. Evaluation of communication outcomes remains a next step.
