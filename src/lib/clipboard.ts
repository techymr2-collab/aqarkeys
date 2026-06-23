/**
 * Copy text to the clipboard, robust against the Clipboard API's
 * "document is not focused" failure — a real, reproducible false
 * negative that can fire even on a genuine click (e.g. right after a
 * tab switch, a recently-blurred window, or a re-render shifting focus
 * before the async call resolves). Re-asserts focus first, then falls
 * back to the legacy execCommand technique, which has looser focus
 * requirements than the modern async Clipboard API.
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  window.focus();

  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // fall through to the legacy fallback below
    }
  }

  try {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.style.position = "fixed";
    textarea.style.top = "0";
    textarea.style.left = "0";
    textarea.style.opacity = "0";
    textarea.style.pointerEvents = "none";
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(textarea);
    return ok;
  } catch {
    return false;
  }
}
