# Grafika

`public/assets/bunny-atlas.png` jest nową grafiką stworzoną wbudowanym narzędziem
ImageGen na podstawie oryginalnego `public/data/img/sprite/bunny_run_right.png`.
`public/assets/toaster.png` to kopia oryginalnego `textures/toaster.png`.
Gra używa oryginalnej grzanki `public/data/img/toast.png`.

Atlas ma 1254 × 1254 piksele i przezroczyste tło. Osiem póz: bezruch,
cztery fazy biegu, skok, spadanie, lądowanie. Prostokąty klatek i wyrównanie stóp
są zapisane w `public/client/renderer.js`; atlas nie wymaga idealnie równej siatki.
Broń celuje i cofa się niezależnie od klatek postaci.

## Dokładny prompt

```text
Use case: stylized-concept
Asset type: production transparent sprite atlas for a 2D side-view platform shooter, Bunny the Killer.
Input image 1: reference image for the original white rabbit character, pink ears and intense pink/red eyes. Modernize this rabbit while preserving that identity.
Primary request: one square 1024x1024 PNG atlas with EXACTLY 4 columns and 2 rows of equally sized 256x256 cells, transparent background, NO labels, borders or text. Each cell contains the SAME full-body rabbit, facing RIGHT, at identical scale (about 190px tall including ears), feet aligned near the bottom of the cell, with at least 20 pixels padding all sides. Crisp polished hand-painted game sprite with bold dark outline and restrained shading, readable at 64px height. White fur, pink long ears and nose, tiny red determined eyes, chunky rabbit hind feet, small round tail, no clothes. Forepaws extended forward at chest height to hold a separately rendered toaster weapon: do NOT include any weapon or toast in this atlas.
Frames in reading order: 1 idle ready stance, 2 run left foot forward right foot back, 3 run passing pose, 4 run right foot forward left foot back, 5 run opposite passing pose, 6 jumping with knees tucked and ears trailing behind, 7 falling with feet extended and ears up, 8 landing crouched with ears flopping forward. Distinct poses, same proportions and ground baseline. Clean alpha transparent background, not a checkerboard. No shadows outside sprites. No overlapping adjacent cells, no cropped ears.
```
