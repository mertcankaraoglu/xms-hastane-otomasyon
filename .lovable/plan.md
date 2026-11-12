# Swagger UI for the public API

Add a standard Swagger page next to the existing developer page, so developers can browse and try every endpoint in the familiar Swagger look.

## What you will see
- New page `/api-docs/swagger` showing the full API in Swagger UI: endpoint groups (Bilgi, Randevu), parameters, sample request bodies, "Try it out" and response examples.
- A "Swagger görünümü" button on the current `/api-docs` page, and a link back from Swagger.
- Swagger colors adjusted to the hospital's teal/navy theme, readable in dark mode too.

## Spec improvements (so Swagger is complete)
- Add response schemas for every endpoint (department, doctor, slot, appointment, lookup result) instead of only "Başarılı".
- Add example responses and error codes per endpoint (`slot_taken`, `hospital_closed`, `rate_limited` etc.).
- Mark `Retry-After` header on 429.

## Technical details
- Install `swagger-ui-react`; render it only in the browser (lazy import behind `ClientOnly`) because it touches `window` and would break SSR.
- Swagger reads `/api/public/v1/openapi.json`; the spec stays in `src/lib/public-api.openapi.ts`, still shared with `/api-docs`.
- Route file `src/routes/api-docs.swagger.tsx` with its own head() metadata; theme overrides in `src/styles.css` using existing tokens.
- Verify with Playwright: page loads, an endpoint expands, "Try it out" on `GET /departments` returns 200.
