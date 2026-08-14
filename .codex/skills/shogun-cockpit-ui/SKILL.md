---
name: shogun-cockpit-ui
description: Restyle or extend Shogun Project frontend modules with the established dark sci-fi spacecraft-cockpit visual language while preserving behavior. Use for Angular UI work in this repository involving cockpit/HUD styling, PrimeNG components and overlays, tabs, tables or tree tables, dialogs, forms, tutorials, navigation, logos, responsive polish, Module Federation cache invalidation, and local Docker rebuild/restart verification.
---

# Shogun Cockpit UI

Apply the existing Shogun cockpit language consistently without treating the current Obsady CSS as a universal template.

## Start safely

1. Read [references/project-patterns.md](references/project-patterns.md).
2. Inspect the target component, its parent, global styles, Angular configuration, federation configuration, and relevant container definitions.
3. Check the working tree. Preserve unrelated and user-owned changes.
4. Identify which layer owns each rendered element:
   - component DOM: component stylesheet;
   - PrimeNG internals: narrowly scoped `::ng-deep` overrides when no supported class/token is sufficient;
   - overlay appended to `body`: host global stylesheet;
   - shared shell/navigation: host component or host global stylesheet.
5. Capture the current behavior before editing: events, bindings, expansion, selection, disabled/loading states, accessibility attributes, and responsive behavior.

## Design language

Use a restrained spacecraft control-panel aesthetic:

- near-black navy surfaces, layered panels, faint cyan grid lines;
- cyan for navigation/data, red for system/action labels, green for ready/selected, amber for warnings;
- thin borders, small corner cuts, subtle inner glow, almost no large rounded pills;
- compact uppercase technical labels in a monospace font; keep long content readable in the regular UI font;
- visible hover, focus, active, selected, disabled, loading, error, and empty states;
- decorative pseudo-elements must not intercept clicks or replace meaningful accessible text.

Prefer shared CSS variables. Keep contrast readable and motion modest. Do not turn every surface neon.

## Implementation workflow

1. Restyle existing markup first. Preserve PrimeNG when it provides valuable behavior.
2. Add stable semantic classes or `styleClass` inputs instead of targeting generated DOM positions.
3. Use native Angular markup only when a PrimeNG component prevents reliable styling or rendering. If replacing it, reproduce all observed behavior before removing the old path.
4. For complex controls, verify hierarchy, selection, keyboard/focus behavior, expansion state, empty/loading states, and emitted events.
5. For dialogs, style header, content, footer, internal tables/forms, maximize/close controls, mask, and scrollbars as one system.
6. For overlays and tutorials, remember that PrimeNG commonly attaches them under `body`; place their CSS in the host global stylesheet and use a dedicated `styleClass`/popover class.
7. Keep IDs, API payloads, and internal fields in the data model when only their display is removed.
8. Check Angular CSS budgets. Increase them only to an explicit, modest ceiling when the intentional stylesheet is the cause; report remaining warnings.

## Verify and deploy

1. Build every changed microfrontend and the host when its global CSS or federation cache tag changed.
2. Treat template/compiler failures as blockers. Do not deploy a failed build.
3. Bump the host federation cache tag after changing a remote bundle when this project uses that tag.
4. Recreate only the changed frontend containers.
5. Restart `proxy` after frontend recreation because its upstream DNS may point at the old container.
6. Verify the host and changed `remoteEntry.json` endpoints return HTTP 200.
7. When possible, visually inspect the actual hosted route and exercise the changed interactions. HTTP 200 alone does not validate CSS ownership or UI behavior.
8. Tell the user when a hard refresh is required.

## Guardrails

- Do not change business logic merely to achieve a visual effect.
- Do not remove PrimeNG wholesale from a module unless explicitly requested and behavior parity is demonstrated.
- Do not use broad global selectors for ordinary component content.
- Do not assume remote global CSS is loaded by the Module Federation host.
- Do not delete orphan containers or unrelated generated files during deployment.
- Do not claim a visual change is verified when only compilation and endpoint checks were performed.

