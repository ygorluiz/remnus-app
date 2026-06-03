// stopEvent for atom media node views. Returned to ProseMirror via
// ReactNodeViewRenderer(..., { stopEvent }). When it returns true PM does not
// process the event at all — so a click/keypress on an inner form control or
// link focuses/edits it natively instead of PM grabbing a NodeSelection (which
// made the whole block look "selected" and the field unclickable, especially
// right after insertion when a NodeSelection already sits on the fresh node).
// The drag handle is excluded so dragging the block still works.
export function mediaStopEvent({ event }: { event: Event }): boolean {
  const target = event.target as HTMLElement | null;
  if (!target) return false;
  if (target.closest('[data-drag-handle]')) return false;
  return Boolean(target.closest('input, textarea, select, button, a'));
}
