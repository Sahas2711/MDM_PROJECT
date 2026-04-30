# Setup and Scripts

## Prerequisites

- Node.js 18 or newer (recommended: current LTS)
- npm 9 or newer

## Installation

1. Open terminal in project root:

- frontend/

2. Install dependencies:

```bash
npm install
```

## Run Development Server

```bash
npm run dev
```

Default Vite URL:

- http://localhost:5173

## Build for Production

```bash
npm run build
```

Output directory:

- dist/

## Preview Production Build

```bash
npm run preview
```

## Linting

```bash
npm run lint
```

## Scripts Reference

From package.json:

- dev -> vite
- build -> vite build
- lint -> eslint .
- preview -> vite preview

## Environment Variables

No .env variables are required in the current version.

If backend integration is added, create a .env file and expose only VITE_ prefixed variables.

## Recommended Next Setup

1. Add route-level lazy loading for bundle optimization.
2. Add test tooling (Vitest + React Testing Library).
3. Add CI pipeline for lint and build checks.
