# AGENTS.md

## Critical Constraints

1.  **NO BUILD SYSTEM**:
    *   Do NOT use `npm`, `vite`, `webpack`, or any bundler.
    *   All code must be valid ES6 Modules capable of running directly in a browser via `index.html`.
    *   Use `.js` extensions for imports (e.g., `import { Foo } from './Foo.js';`).

2.  **MOBILE FIRST**:
    *   All UI must be touch-friendly (min 44x44px targets).
    *   Inputs must handle Touch Events (`touchstart`, `touchend`, `touchmove`).
    *   Do not rely solely on `mousemove` or `click`.

3.  **FLUID ENGINE PRIORITY**:
    *   Fluid mechanics (Blood) are central to gameplay.
    *   Performance is key (TypedArrays).

4.  **ASSETS**:
    *   No external images.
    *   Use `SpriteGenerator.js` to create assets at runtime.

5.  **CODE STYLE**:
    *   Vanilla JS.
    *   Classes for structure.
    *   TypedArrays for data.
