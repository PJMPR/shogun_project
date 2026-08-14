# Shogun cockpit project patterns

## Repository map

- Angular frontends: `frontend/`
- Local Compose project: `deployment-local/docker-compose.yml`
- Host: `frontend/pj-studies-host`
- Reference implementation: `frontend/pj-studies-assignements/src/app/obsady`
- Shared syllabus detail styling: `frontend/pj-studies-assignements/src/app/shared/sylabus-preview`

Inspect current files before relying on these paths; modules and service names may evolve.

## Palette and geometry

Reuse existing host variables when available:

```css
--space-bg: #050914;
--space-panel: #0b1324;
--space-panel-raised: #101c31;
--space-line: rgba(69, 213, 255, 0.2);
--space-cyan: #45d5ff;
--space-red: #ff4057;
--space-text: #e6f4ff;
--space-muted: #89a3b8;
```

Use green `#4dffb8` for ready/selected and amber around `#ffbc42` for warnings. Typical geometry uses 1px borders, 2–3px radii, and small clipped corners. Avoid heavy glow and oversized text.

## PrimeNG ownership rules

- Prefer `styleClass` on Dialog, Table, TreeTable, Button, and Popover-capable APIs.
- Scope deep selectors under a dedicated class such as `.cockpit-dialog`.
- `p-dialog` internal DOM can be styled from the owning component with narrowly scoped `:host ::ng-deep` rules.
- Overlays/tours appended to `body` are outside the remote component tree. Put their selectors in `pj-studies-host/src/styles.css`; remote `src/styles.css` may not be loaded by the host.
- Do not rely only on CSS for a TreeTable that has stopped rendering. First confirm DOM/data/expansion behavior. A native replacement is acceptable only with parity for hierarchy, expand/collapse, selection, events, totals, both study modes, and semester switching.

## Established UI patterns

- Navigation/mode/semester tabs: rectangular channel selectors with a small status dot and technical prefix.
- Primary transmission action: red-accent command control; cyan remains informational/navigation.
- Tables: dark alternating rows, cyan dividers, monospace headers, clear selected/expanded state.
- Modal: cyan top edge, dark grid content, `SYS` marker, styled header actions and footer.
- Availability/date chips: dark readouts with day and time visually separated.
- Notes: dark operator log with amber warning rail.
- Tutorial: host-global `.tour-step.p-popover` styling, including title, body, progress, buttons, disabled state, close control, and arrow.

## Local deployment sequence

From `deployment-local/`, adapt service names to the changed module:

```powershell
docker compose -f docker-compose.yml build mfe-<module> mfe-host
docker compose -f docker-compose.yml up -d --no-deps --force-recreate mfe-<module> mfe-host
docker compose -f docker-compose.yml restart proxy
curl.exe -k -s -o NUL -w "%{http_code}" https://localhost:8443/
curl.exe -k -s -o NUL -w "%{http_code}" https://localhost:8443/mfe-<module>/remoteEntry.json
```

Run commands with exit checks. Rebuild the host only when host code/global CSS/cache configuration changed, but restart the proxy after any frontend container recreation.

## Known non-blocking warnings

Do not silently dismiss warnings. Existing builds may report optional-chain diagnostics, a missing type-check entry for a remote route, PrimeIcons federation metadata, or CSS budget warnings. Distinguish pre-existing warnings from new regressions and report relevant ones.
