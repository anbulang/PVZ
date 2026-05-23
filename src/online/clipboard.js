export async function copyText(text, env = globalThis) {
  const clipboard = env?.navigator?.clipboard;
  if (clipboard?.writeText) {
    try {
      await clipboard.writeText(text);
      return { ok: true, method: "clipboard" };
    } catch {
      // Fall through to the textarea path for browsers that block Clipboard API on HTTP.
    }
  }

  if (fallbackCopyText(text, env?.document)) return { ok: true, method: "fallback" };
  return { ok: false, method: "none" };
}

function fallbackCopyText(text, documentLike) {
  if (!documentLike?.body || !documentLike.createElement || typeof documentLike.execCommand !== "function") return false;
  const textarea = documentLike.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  Object.assign(textarea.style, {
    position: "fixed",
    left: "-9999px",
    top: "0",
    opacity: "0",
  });

  documentLike.body.appendChild(textarea);
  textarea.focus();
  textarea.select();
  try {
    return Boolean(documentLike.execCommand("copy"));
  } catch {
    return false;
  } finally {
    documentLike.body.removeChild(textarea);
  }
}
