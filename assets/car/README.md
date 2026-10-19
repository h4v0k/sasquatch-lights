# Car preview images

Cutouts of havok's own car (from 67sasquatch.us media), background removed with the open ISNet model.
- `car-side.webp` 1441×428 (top up, from jacobs-pan)
- `car-front.webp` 1047×878 (hood up, from nature-coast-front) — doubles as the engine bay view
- `car-rear.webp` 1100×1087 (top down, from top-down)

`light-geometry.json` holds each lamp's outline in image pixels per view: `head`, `tail`, `grille`, `engine` are polygons; `under` is an ellipse. `vh` is the canvas height including floor space below the car for the underglow. Render: image darkened (~50%), underglow ellipse blurred behind the car, lamps drawn on top with screen blending (blurred copy + sharp copy), grille as a glowing outline stroke, engine bay as a soft blurred bloom. See the mockup's Car.dc.html for the exact layering.
