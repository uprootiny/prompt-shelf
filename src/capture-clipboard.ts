import { Clipboard } from "@raycast/api";
import { addToHistory } from "./store";

export default async function CaptureClipboard() {
  const text = await Clipboard.readText();
  if (!text || text.trim().length === 0) return;
  await addToHistory(text.trim());
}
