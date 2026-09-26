// Minimal cross-component event bus for profile fields that need to show
// up live in more than one place at once (e.g. the Identity display name
// input in the Profile tab and the account card in the Sidebar). No
// state library in this project, so a plain window CustomEvent is the
// lightest way to keep two unrelated components in sync without lifting
// state all the way up to dashboard/page.tsx.

const DISPLAY_NAME_EVENT = "raided:display-name-change";

// Call whenever the person edits their display name, so anything showing
// it elsewhere on the page can update immediately (not just after the
// debounced Supabase save finishes).
export function emitDisplayNameChange(name) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(DISPLAY_NAME_EVENT, { detail: name }));
}

// Subscribes to display name changes. Returns an unsubscribe function,
// so callers can use it directly as a useEffect cleanup.
export function onDisplayNameChange(callback) {
  if (typeof window === "undefined") return () => {};
  const handler = (e) => callback(e.detail);
  window.addEventListener(DISPLAY_NAME_EVENT, handler);
  return () => window.removeEventListener(DISPLAY_NAME_EVENT, handler);
}
