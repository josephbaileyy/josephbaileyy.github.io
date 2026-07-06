# Particle Event-Display Hero Prototype

This is an isolated prototype for Joseph Bailey's personal site rebuild. It lives under `prototype/` so the existing Vite/TypeScript site remains unchanged.

## Run

```sh
npm install
npx vite --config prototype/vite.config.js
```

## Build

```sh
npx vite build --config prototype/vite.config.js
```

The build emits one self-contained HTML file to `prototype/dist/index.html` via `vite-plugin-singlefile`. The prototype uses the root project's existing `three` dependency plus `lenis` for smooth scroll.
