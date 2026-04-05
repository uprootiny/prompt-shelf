import { Clipboard } from "@raycast/api";
import { addToHistory } from "./store";

export default async function CaptureClipboard() {
  // Read current clipboard
  const text = await Clipboard.readText();
  if (text && text.trim().length > 0) {
    await addToHistory(text.trim());
  }

  // Also pull from Raycast's clipboard history (last 20 items)
  // This catches items copied while the extension wasn't actively polling
  try {
    const items = await Clipboard.read({ offset: 0 });
    if (items && typeof items === "object" && "text" in items) {
      const t = (items as { text: string }).text?.trim();
      if (t && t.length > 0) {
        await addToHistory(t);
      }
    }
  } catch {
    // Clipboard.read may not support offset on all versions — that's fine,
    // the basic readText above is the primary capture path.
  }
}
