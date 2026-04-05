import { showToast, Toast } from "@raycast/api";
import { readFileSync, existsSync } from "fs";
import { homedir } from "os";
import { join } from "path";
import {
  getPrompts,
  savePrompt,
  looksLikePrompt,
  suggestTags,
  readHistoryFromDisk,
} from "./store";

interface ClaudeHistoryEntry {
  display: string;
  timestamp: number;
  sessionId?: string;
  project?: string;
}

function readClaudeHistory(): ClaudeHistoryEntry[] {
  const historyPath = join(homedir(), ".claude", "history.jsonl");
  if (!existsSync(historyPath)) return [];
  const lines = readFileSync(historyPath, "utf-8").split("\n").filter(Boolean);
  const entries: ClaudeHistoryEntry[] = [];
  for (const line of lines) {
    try {
      entries.push(JSON.parse(line));
    } catch {
      /* skip malformed */
    }
  }
  return entries;
}

function titleFromText(text: string): string {
  const firstLine = text.split("\n")[0].trim();
  return firstLine.length > 60 ? firstLine.slice(0, 57) + "..." : firstLine;
}

export default async function SyncHistory() {
  await showToast({ style: Toast.Style.Animated, title: "Syncing history..." });

  try {
    const existingPrompts = await getPrompts();
    const existingContents = new Set(existingPrompts.map((p) => p.content));
    let imported = 0;

    // 1. Import from Claude Code history
    const claudeEntries = readClaudeHistory();
    for (const entry of claudeEntries) {
      const text = entry.display;
      if (!text || existingContents.has(text)) continue;
      if (!looksLikePrompt(text)) continue;

      const tags = [...suggestTags(text), "auto-imported", "claude-code"];
      await savePrompt(titleFromText(text), text, tags);
      existingContents.add(text);
      imported++;
    }

    // 2. Import from clipboard history on disk
    const clipboardEntries = readHistoryFromDisk();
    for (const entry of clipboardEntries) {
      const text = entry.content;
      if (!text || existingContents.has(text)) continue;
      if (!looksLikePrompt(text)) continue;

      const tags = [...suggestTags(text), "auto-imported", "clipboard"];
      await savePrompt(titleFromText(text), text, tags);
      existingContents.add(text);
      imported++;
    }

    await showToast({
      style: imported > 0 ? Toast.Style.Success : Toast.Style.Success,
      title:
        imported > 0
          ? `Imported ${imported} new prompt${imported === 1 ? "" : "s"}`
          : "No new prompts found",
    });
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Sync failed",
      message: error instanceof Error ? error.message : String(error),
    });
  }
}
