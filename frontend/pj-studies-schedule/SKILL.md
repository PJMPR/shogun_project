---
name: pj-studies-schedule
description: Maintain and extend the Angular `mfe-schedule` microfrontend in the Shogun project. Use when changing the weekly timetable grid, schedule blocks, drag/copy/resize behavior, lecturer desiderata and availability, conflicts, filters, entry dialog, comments drawer, list view, or host integration for the schedule module under `frontend/pj-studies-schedule`.
---

# Work on the schedule microfrontend

Treat `frontend/pj-studies-schedule` as an Angular 21 standalone microfrontend exposed through Native Federation as `mfe-schedule` / `./Routes`. Keep changes scoped here unless integration explicitly requires the host or assignments API.

## Start with the relevant files

Avoid scanning the whole repository. Route work by feature:

- Page shell and weekly/list switch: `src/app/schedule/schedule.component.ts`
- Weekly orchestration and state wiring: `views/weekly-view/weekly-view.component.{ts,html,css}`
- Grid geometry, selection, drag, Ctrl-copy, resize, placement checks, availability overlay: `components/scheduler-grid/`
- Block content, palette, warning and comment controls: `components/schedule-block/`
- Create/edit form and applying lecturer desiderata: `components/entry-dialog/entry-dialog.component.ts`
- Right-side comments panel: `components/comments-drawer/`
- Flat table view: `views/list-view/list-view.component.ts`
- Core types and day/hour helpers: `models/schedule.models.ts`
- Comment types: `models/schedule-comment.models.ts`
- In-memory schedule state: `services/mock-data.service.ts`
- Desiderata HTTP state and DTOs: `services/lecturer-desiderata.service.ts`
- Comment persistence and author permissions: `services/schedule-comments.service.ts`
- Room/lecturer collisions: `services/conflict-detection.service.ts`
- MFE/API configuration: `federation.config.js`, `src/environments/environment.ts`

Read a component's TS, template, and CSS together before changing its interaction or layout.

## Preserve the current architecture

Use standalone Angular components, signals, computed values, inputs, and outputs. `WeeklyViewComponent` is the coordinator: keep grid mechanics inside `SchedulerGridComponent`, block presentation inside `ScheduleBlockComponent`, and persistence-like concerns in services.

The schedule has no backend yet. `MockDataService.entries` is the only schedule store and starts empty; entries disappear on reload. Do not imply durable schedule persistence. `scheduleApiBaseUrl` is currently unused.

`ScheduleEntry` is the shared object passed between weekly view, list view, dialogs, grid, conflict detection, clone/move/resize operations, and comments. When adding a field, preserve it in object spreads and check both views.

## Understand grid coordinates

The visible grid runs from 08:00 to 20:00. It uses four logical slots per hour (15 minutes), while `rowHeightPx = 40` represents 30 minutes; therefore a slot is `rowHeightPx / 2` pixels.

- `dayOfWeek`: `0=Pon` through `6=Nd`
- `group`: zero-based subcolumn within a day
- `groupSpan`: adjacent group columns occupied by a block
- `startHour`: decimal hour, such as `9.5`
- `durationHours`: decimal duration
- stacjonarny days: Monday-Friday
- niestacjonarny days: Friday-Sunday

Moving and resizing must reject overlap with another block in the same day/group columns. Ctrl-drag clones instead of moving. Availability is advisory and must never reject placement.

## Handle semesters and filters consistently

Semester numbers 1-8 encode year and type: odd numbers are `zimowy`, even numbers are `letni`; use `semesterTypeOf` instead of duplicating parity logic. Weekly filtering also uses `studyMode` and an optional exact semester number.

Conflict detection compares all schedule entries and reports overlapping use of the same normalized lecturer name or non-empty room for the same day, academic year, and semester type. Grid occupancy rejection is separate from lecturer/room conflict presentation.

## Integrate desiderata and availability

Load the latest lecturer assignments from:

`GET {assignmentsApiBaseUrl}/api/v1/assignments/lecturers`

The local environment resolves this under `/api-assignments`. Each assignment contains lecturer identity, semester metadata, subjects, and `availability: [{ id, day, from, to }]`.

Filter desiderata by active semester type, study mode, and optional semester number. Selecting a desideratum fills the form and stores `lecturerAssignmentId` on the block. Clear that ID when the lecturer name is changed manually; never match availability by display name alone.

During drag/copy, show green 15-minute cells inside the linked lecturer's availability and red cells outside it. If the entire saved block does not fit within one availability range for its day, show the warning icon beside the lecturer. Missing assignment linkage or an empty availability array means no overlay and no warning.

Availability day values may be abbreviations or Polish names. Preserve normalization for aliases such as `Pn/Pon`, `Wt`, `Śr/Sr`, `Czw`, `Pt`, `Sb/Sob`, and `Nd/Niedz`.

## Maintain comments as a frontend prototype

Open comments only from the comment button on a weekly-view block; ordinary block click continues to open entry editing. Show the count badge and right-side drawer.

Comments are stored in browser `localStorage` under versioned keys. They are not shared across browsers or users. The first open for a block seeds one demonstration exchange; record seeding separately so deleted demo comments do not reappear.

Read the current author from host-provided `sessionStorage`:

- `shogun_user_profile`: `{ firstName, lastName, email }`
- `shogun_roles`: realm role names

The host writes the profile in `frontend/pj-studies-host/src/app/auth.service.ts`; change that file only when the profile contract changes. Authors may edit/delete their own comments. Admins may delete every comment. Removing a block also removes its local comments. The comments feature is not currently present in list view.

The host schedule route currently permits `admin` and `planner`, not lecturers. Do not broaden route authorization without an explicit request.

## Preserve interaction boundaries

- Stop propagation from palette and comments controls so they do not open entry editing.
- Keep the drag operation attached to the explicit drag handle.
- Keep availability layers and day separators non-interactive with `pointer-events: none`.
- Maintain day boundary lines more strongly than group boundary lines.
- Keep the group header row visually distinct from the hourly grid.
- Keep CSS responsive for narrow screens and respect reduced-motion preferences in the drawer.

## Validate changes

Run from `frontend/pj-studies-schedule`:

```powershell
npm run build
```

Also run `git diff --check` from the repository root. If changing `pj-studies-host`, build it when its dependencies are installed; otherwise report that host validation was unavailable. Do not modify or clean unrelated generated `backend/**/obj/` changes already present in the worktree.
