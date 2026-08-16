# Component pattern playbooks

Use this reference when the component is interactive or has multiple coordinated parts. Start with native HTML. Use an ARIA pattern only when the intended interaction matches the pattern completely.

## Dialog and alert dialog

- Use native `dialog` when the project's browser support permits; otherwise implement the complete dialog pattern.
- Require an accessible name from a visible heading. Add a description only when it helps users understand the task.
- Move focus to the first meaningful control or a static heading/content node when reading context must come first.
- Keep focus inside a modal, make the background inert, close on Escape unless interruption would cause data loss, and restore focus to the invoker.
- Use `alertdialog` only for urgent interruptions that require a response, not for ordinary confirmation modals.
- Test initial focus, Tab/Shift+Tab loop, Escape, backdrop behavior, nested portals, restoration after the invoker disappears, zoom, and virtual-cursor reading order.

## Disclosure and accordion

- Use a button for each trigger with `aria-expanded`; associate the controlled panel when IDs are stable and useful.
- A disclosure has independent sections. Do not add tab keyboard behavior.
- For an accordion, place each trigger in an appropriate heading. Decide and document whether multiple panels may remain open.
- Enter and Space toggle the native button. Arrow-key navigation is optional and must be consistent if provided.

## Tabs

- Use tabs only for panels within one application/page context. Use links for route navigation.
- Implement `tablist`, `tab`, and `tabpanel`, with one selected tab and roving `tabindex`.
- Left/Right arrows move between horizontal tabs; Up/Down for vertical tabs. Home/End are recommended.
- Choose automatic activation only when panels render without noticeable latency; otherwise activate with Enter/Space.
- Move focus deliberately when a selected tab is deleted.

## Menu and menu button

- Use a menu for application-like commands, not ordinary site navigation.
- The trigger is a button. The popup implements `menu` with `menuitem` variants and managed focus.
- Enter/Space/ArrowDown opens and focuses an item; arrows move; Home/End jump; Escape closes and restores trigger focus; printable characters may perform typeahead.
- Do not put arbitrary form fields or complex layout inside a menu without selecting a more appropriate pattern.

## Combobox and autocomplete

- Keep DOM focus on the input and manage the active option with `aria-activedescendant`, unless using a well-tested existing primitive with an equivalent contract.
- Expose popup type, expanded state, controls relationship, active option, selected value, and instructions where needed.
- Arrow keys navigate suggestions without stealing normal text-editing keys. Enter commits; Escape closes or clears according to the documented model.
- Announce result counts and asynchronous failures without repeating every keystroke.
- Test typing, composition/IME, no results, loading, disabled options, long lists, mobile screen readers, and browser autofill.

## Listbox and select

- Prefer native `select` for ordinary single-choice fields.
- Use listbox only when its richer interaction is necessary. Implement option focus/selection, typeahead, and multi-select conventions completely.
- Do not place buttons, links, or other interactive descendants inside options.

## Tooltip and popover

- A tooltip supplements a control's name; it does not contain interactive content.
- Show on keyboard focus and pointer hover, dismiss on Escape, keep visible while pointer moves over it, and associate it as a description only when appropriate.
- Use a non-modal popover/disclosure/dialog pattern for interactive content.
- Never make essential information available only on hover.

## Carousel

- Provide an accessible region name, previous/next buttons, a pause control for automatic movement, and understandable slide position/status.
- Stop rotation on focus and hover. Honor reduced motion.
- Avoid making offscreen slides focusable or exposed as if visible.
- Prefer simple content and controls over implementing tabs unless direct slide selection truly behaves as tabs.

## Data table and grid

- Use a native table for read-only tabular data: caption, header cells, correct scope/associations, and meaningful reading order.
- Use `grid` only for spreadsheet-like cell navigation and editing. Implement roving focus, arrow navigation, selection/edit modes, and announcements completely.
- Sorting controls belong inside headers and expose sort state. Responsive layouts must preserve header relationships.

## Date picker

- Always allow direct text entry with format help and validation.
- Calendar buttons need a descriptive accessible name. The grid requires complete date navigation, current/selected/today distinctions, month changes, and focus restoration.
- Handle locale, first day of week, disabled dates, ranges, min/max, and parsing without relying on color.
- Prefer a proven existing primitive; custom date pickers have a large test surface.

## Toast and status

- Use `status` for polite updates and `alert` only for urgent, time-sensitive failures.
- Insert the message into an existing live-region container; changing the live-region attribute and content simultaneously can be missed.
- Keep important messages available elsewhere, such as inline errors or notification history.
- Do not move focus to ordinary success toasts. Provide a reachable dismiss button only when persistence warrants it.

## Drag and drop

- Provide a keyboard/pointer-equivalent operation such as move buttons, menus, or cut/paste commands.
- Announce pickup, destination, position, invalid destinations, drop, and cancellation.
- Preserve focus on the moved item or a predictable successor. Do not use deprecated ARIA drag attributes as the only implementation.

## File upload

- Use a labeled native file input even when styled through a custom trigger.
- Communicate accepted types, size/count limits, progress, validation, cancellation, retry, and successful attachment.
- Drop zones also need a keyboard-operable file picker. Uploaded items need accessible names and independent remove/retry controls.

## Pattern rejection gate

Before adopting a complex widget, answer:

1. Would native HTML satisfy the task?
2. Does this interaction truly match the chosen ARIA pattern?
3. Can the team implement and test the complete keyboard/focus contract?
4. Does the existing design system already provide a proven primitive?
5. What happens in loading, empty, error, disabled, responsive, zoomed, and touch states?

If the answer to the implementation or testing question is no, simplify the interaction.
