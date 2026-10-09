# Combat audio

`music.ogg`, `ambience.ogg`, and the eleven files in `combat/` were copied from
the user-supplied `First Cut Browser Game/web/assets/` reference build on
October 9, 2026. The selected combat set covers round start, sword swing,
three clashes, evade, shove, three cuts and the decisive hit.

`src/combat-audio.js` fetches and decodes the short effects before the Fight
button is enabled. Music and ambience decode after the first user gesture and
then loop. No sound file is fetched or decoded at blade contact, which avoids
an impact-time main-thread/audio stall.

These are supplied third-party assets. Their original hashes and extraction
notes remain in the local reference package. Confirm redistribution rights
before publishing them.
