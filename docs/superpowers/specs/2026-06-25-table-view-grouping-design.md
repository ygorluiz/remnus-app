# Table View Grouping Design

## Goal

Allow table views to group database rows by a `select` or `status` property, using the same grouping controls and ordering model as Kanban views. A grouped table view should show multiple table sections stacked vertically, one per group, and users should be able to reorder those groups by dragging the section titles up or down.

## Context

Remnus database views are stored in the `databases.views` JSON column. Kanban views already persist grouping with `groupByCol`, `groupOrder`, and `hiddenGroups` in `KanbanViewConfig`. Table views currently persist column order, hidden columns, column widths, row color, filters, sorts, open behavior, and default page icon settings in `TableViewConfig`.

The existing table renderer, `src/components/features/TableLayout.tsx`, owns a large amount of table behavior: inline cell editing, column resizing, column drag reorder, row hover actions, row drag reorder, context menus, filters, sorts, page icons, and create-row behavior. The grouped-table feature should preserve that behavior by wrapping the table renderer instead of rewriting its cells.

## Scope

V1 supports grouping by single-value `select` and `status` properties only. This intentionally matches Kanban grouping. Multi-value and computed grouping types are out of scope for this spec because they introduce ambiguous row membership, row counts, and drag behavior.

In scope:

- Add grouping controls to the table view settings sidebar under the Layout tab.
- Allow choosing a `select` or `status` property as the table grouping field.
- Allow showing and hiding individual groups, including `Uncategorized`.
- Render grouped table sections vertically in the main table view.
- Allow reordering group sections by dragging their titles vertically.
- Persist group order and hidden group settings per table view.
- Keep existing table editing, opening, column, and row action behavior working inside each group.

Out of scope:

- Grouping by `multi_select`, users, checkbox, date, text, number, URL, or email.
- Dragging rows between grouped table sections to change the grouped property.
- Virtualized rendering.
- Shared group order across different views.
- Database migrations.

## Data Model

Extend `TableViewConfig` with the same grouping fields Kanban uses:

```ts
groupByCol?: string;
groupOrder?: string[];
groupColBg?: boolean;
hiddenGroups?: string[];
```

Existing table view JSON remains valid because all new fields are optional. New table views should continue to start ungrouped by default. Grouping becomes active only when `groupByCol` points at an existing `select` or `status` schema column.

If the grouped property is deleted or changed to an unsupported type, the table falls back to the current ungrouped table rendering while preserving the stale config fields. The settings UI should only offer currently supported properties.

## Settings UI

The Layout tab should show a table grouping section for table views. It should reuse the Kanban grouping behavior and, where practical, the same component logic:

- `Group by` select lists schema columns whose type is `select` or `status`.
- A blank option disables grouping for the table view.
- `Group background color` controls whether grouped table section surfaces are tinted from the group option color.
- Each configured option plus `Uncategorized` appears as a visibility toggle.
- If no supported properties exist, show the existing localized `addSelectForGroup` message.

The implementation can either extract a shared grouping settings component from `KanbanLayoutSection` or introduce a small table-specific layout section that delegates to shared helpers. The preferred path is to avoid duplicating grouping-option normalization, hidden group toggling, and labels.

Any new user-facing text must use the `Database` namespace and be added to all 8 locale files. Reuse existing keys where possible, especially `sectionGrouping`, `groupBy`, `groupBackground`, `addSelectForGroup`, and `uncategorized`.

## Main View Rendering

Add a `GroupedTableLayout` wrapper that receives the same table props as `TableLayout` plus table grouping props. It should:

- Resolve the selected group column from `database.schema`.
- Normalize option values with the existing `normalizeOption` helper.
- Derive effective group order with the same behavior as Kanban: configured order first, then any newly added options in schema order.
- Always include `Uncategorized` last unless it is hidden.
- Partition already-filtered and already-sorted `processedPages` into group buckets.
- Render one vertical section per visible group.
- Render each section header with a drag handle affordance, localized group title, and visible row count.
- Render one `TableLayout` instance per non-empty group using the existing props.
- Render empty visible groups as compact empty sections with a localized empty message and a group-specific create action, not as full blank tables.

When grouping is disabled or invalid, `DatabaseView` should render the current single `TableLayout` path.

## Group Reordering

Group header drag should mirror Kanban group drag semantics, but vertically:

- Only real option groups are draggable.
- `Uncategorized` is not draggable and remains after configured option groups.
- Dropping one group header on another updates `TableViewConfig.groupOrder`.
- Reordering affects only the active table view.
- New options not present in `groupOrder` appear after the saved ordered options in schema order.

The drag surface should be limited to the group header or handle so normal table interactions remain unaffected.

## Row Behavior

Rows remain editable and clickable exactly as they are in ungrouped tables. Row context-menu actions, duplicate/delete behavior, page icons, and inline property edits should continue to work inside each group.

For v1, row dragging is disabled while table grouping is active. The existing table row reorder callback expects a global page ID order, while grouped sections render partitioned subsets. Allowing group-local row drag without a grouped reorder model would make reorder persistence ambiguous, especially with filters active. This feature only adds group-title drag for vertical group order.

The group-specific `New` row action should create a page with the grouped property prefilled for that group. Creating from `Uncategorized` should not set the grouped property. Empty visible groups must still offer this create action.

## Large Record Handling

The design avoids loading more records than today. Grouping operates on `processedPages`, which is already available in memory after filtering and sorting. The additional work is a single linear pass over the visible rows plus rendering multiple table sections.

Edge cases to handle:

- Many records in one group should perform like the current ungrouped table because it still renders one table for that group.
- Many groups should not duplicate expensive state globally; each table section can have local UI state, but shared column widths, hidden columns, filters, sorts, and default icon settings must come from the same table config.
- The repeated table header should remain readable when many groups are stacked.
- The floating toggle-columns button should not appear in every grouped section. Prefer showing it once at the grouped-table level or only in the first visible table section; column visibility remains available in the settings sidebar.
- Empty visible groups should show a lightweight empty state and a create action rather than a large blank table.
- Hidden groups should not render rows, but the rows must reappear unchanged when the group is shown again.
- Filtering should run before grouping, so group counts reflect visible rows.
- Sorting should run before grouping, so row order within each group respects the active sorts.
- Grouping should be calculated with stable memoized helpers so a large table does not repartition rows on unrelated UI state changes.

This feature does not introduce pagination or virtualization. If large grouped tables remain slow after implementation, that should be handled as a separate performance project.

## Components And Data Flow

- `src/lib/types/views.ts`: add optional grouping fields to `TableViewConfig`.
- `src/components/features/DatabaseView.tsx`: pass table grouping config into the settings sidebar, route grouped table views to `GroupedTableLayout`, and persist group config with the existing `mutateConfig` flow.
- `src/components/features/database-sidebar/...`: expose grouping controls for table views, preferably by extracting shared grouping UI from the Kanban layout section.
- `src/components/features/GroupedTableLayout.tsx`: derive grouped pages, render vertical group sections, handle group header drag, and delegate row/table behavior to `TableLayout`.
- `src/components/features/TableLayout.tsx`: keep edits minimal. Add small props only where needed, such as disabling row drag in grouped mode, hiding repeated toggle-column controls, or adjusting empty-state/new-row behavior inside grouped sections.

No server action or database schema change is required because `updateDatabaseViews` already persists the full view JSON.

## Error Handling

- Missing `groupByCol`, unsupported column types, or deleted columns should render the ungrouped table.
- Unknown option values on existing rows should go to `Uncategorized`.
- Stale `groupOrder` entries that no longer exist in the schema should be ignored.
- Stale `hiddenGroups` entries should be ignored until matching options exist again.
- Empty databases and fully filtered-out groups should use existing empty-state language.
- Grouped row drag should present the existing disabled drag affordance instead of silently accepting a drag that cannot persist correctly.

## Testing

Focused tests should cover the pure grouping/order logic:

- No grouping returns the ungrouped table path.
- Configured option order is respected.
- New options append after saved `groupOrder`.
- Unknown or empty row values go to `Uncategorized`.
- Hidden groups are omitted and can be restored.
- Filters and sorts apply before grouping.
- Row drag is disabled in grouped table mode.

Manual browser verification should cover:

- Create a table view, group by a status property, and see vertically stacked table sections.
- Drag group titles up/down and confirm the order persists after refresh.
- Hide and show a group from settings.
- Create a new row inside a group and confirm the grouped status is prefilled.
- Edit a row, open a page, duplicate/delete a row, resize/reorder columns, and toggle columns inside a grouped table.
- Confirm row dragging is disabled in grouped table mode while group-title dragging still works.
- Verify a large sample database remains usable enough that scrolling, group header drag, and row hover actions do not overlap or break.

Run project verification after implementation:

- `npm run lint`
- A focused component/helper test command if available
- Browser smoke test with the dev server bound to the local network host

## Follow-Ups

- Evaluate grouping by `checkbox`, users, dates, and multi-value fields after the select/status version is in use.
- Consider grouped-row drag in a later version by defining a full global reorder model that works with filters, sorts, and cross-group movement.
- If large grouped tables feel slow in practice, handle pagination or virtualization as a separate performance project.
