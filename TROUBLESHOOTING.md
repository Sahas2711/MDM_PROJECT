# Troubleshooting

## Install Fails

Symptom:

- npm install fails or dependency tree conflict.

Actions:

1. Remove node_modules and package-lock.json.
2. Reinstall with npm install.
3. Ensure Node and npm versions are recent.

## Dev Server Does Not Start

Symptom:

- npm run dev exits immediately.

Actions:

1. Check terminal output for syntax errors.
2. Run npm run lint for quick issue detection.
3. Confirm no port conflict on 5173.

## Build Warning: Large Chunks

Symptom:

- Vite warns about chunks larger than 500 kB.

Status:

- Non-blocking warning.

Actions:

1. Introduce React lazy loading for route pages.
2. Split heavy chart modules where practical.
3. Re-run npm run build and compare output sizes.

## Styling Not Applying

Symptom:

- Tailwind classes appear ignored.

Actions:

1. Check tailwind.config.js content paths.
2. Verify index.css includes tailwind directives.
3. Restart dev server after config changes.

## Chart Rendering Issues

Symptom:

- Charts show blank or wrong colors.

Actions:

1. Validate data keys match component props.
2. Ensure chart container has explicit height.
3. Check browser console for runtime errors.

## Route Not Found

Symptom:

- Direct URL opens blank or redirects unexpectedly.

Actions:

1. Confirm route path in src/App.jsx.
2. Validate page component export default exists.
3. Rebuild to detect compile-time route import errors.
