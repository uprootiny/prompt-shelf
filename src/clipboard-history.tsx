import {
  Action,
  ActionPanel,
  Alert,
  Clipboard,
  Color,
  Icon,
  List,
  confirmAlert,
  showToast,
  Toast,
} from "@raycast/api";
import { usePromise } from "@raycast/utils";
import {
  getHistory,
  clearHistory,
  removeFromHistory,
  markSaved,
  savePrompt,
  truncate,
  timeAgo,
  ClipboardEntry,
} from "./store";

export default function ClipboardHistory() {
  const { data: history, isLoading, revalidate } = usePromise(getHistory);

  async function handlePaste(entry: ClipboardEntry) {
    await Clipboard.paste(entry.content);
    showToast({ style: Toast.Style.Success, title: "Pasted" });
  }

  async function handleCopy(entry: ClipboardEntry) {
    await Clipboard.copy(entry.content);
    showToast({ style: Toast.Style.Success, title: "Copied" });
  }

  async function handleSaveAsPrompt(entry: ClipboardEntry) {
    const firstLine = entry.content.split("\n")[0].slice(0, 60);
    await savePrompt(
      firstLine,
      entry.content,
      entry.isPrompt ? ["auto-detected"] : [],
    );
    await markSaved(entry.id);
    revalidate();
    showToast({ style: Toast.Style.Success, title: "Saved to Prompt Library" });
  }

  async function handleDelete(entry: ClipboardEntry) {
    await removeFromHistory(entry.id);
    revalidate();
  }

  async function handleClearAll() {
    if (
      await confirmAlert({
        title: "Clear clipboard history?",
        message: "This cannot be undone.",
        primaryAction: { title: "Clear", style: Alert.ActionStyle.Destructive },
      })
    ) {
      await clearHistory();
      revalidate();
    }
  }

  const entries = history ?? [];
  const prompts = entries.filter((e) => e.isPrompt);
  const plain = entries.filter((e) => !e.isPrompt);

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search clipboard history..."
    >
      {prompts.length > 0 && (
        <List.Section title="Detected Prompts" subtitle={`${prompts.length}`}>
          {prompts.map((entry) => (
            <List.Item
              key={entry.id}
              title={truncate(entry.content)}
              subtitle={timeAgo(entry.timestamp)}
              icon={{ source: Icon.Stars, tintColor: Color.Yellow }}
              accessories={[
                entry.saved ? { icon: Icon.Bookmark, tooltip: "Saved" } : {},
                { text: `${entry.content.length} chars` },
              ]}
              actions={
                <ActionPanel>
                  <Action
                    title="Paste"
                    icon={Icon.Clipboard}
                    onAction={() => handlePaste(entry)}
                  />
                  <Action
                    title="Copy"
                    icon={Icon.CopyClipboard}
                    onAction={() => handleCopy(entry)}
                  />
                  {!entry.saved && (
                    <Action
                      title="Save as Prompt"
                      icon={Icon.Bookmark}
                      shortcut={{ modifiers: ["cmd"], key: "s" }}
                      onAction={() => handleSaveAsPrompt(entry)}
                    />
                  )}
                  <Action
                    title="Delete"
                    icon={Icon.Trash}
                    style={Action.Style.Destructive}
                    shortcut={{ modifiers: ["ctrl"], key: "x" }}
                    onAction={() => handleDelete(entry)}
                  />
                  <Action
                    title="Clear All History"
                    icon={Icon.Trash}
                    style={Action.Style.Destructive}
                    onAction={handleClearAll}
                  />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}
      <List.Section title="Clipboard" subtitle={`${plain.length}`}>
        {plain.map((entry) => (
          <List.Item
            key={entry.id}
            title={truncate(entry.content)}
            subtitle={timeAgo(entry.timestamp)}
            icon={Icon.Text}
            accessories={[{ text: `${entry.content.length} chars` }]}
            actions={
              <ActionPanel>
                <Action
                  title="Paste"
                  icon={Icon.Clipboard}
                  onAction={() => handlePaste(entry)}
                />
                <Action
                  title="Copy"
                  icon={Icon.CopyClipboard}
                  onAction={() => handleCopy(entry)}
                />
                <Action
                  title="Save as Prompt"
                  icon={Icon.Bookmark}
                  shortcut={{ modifiers: ["cmd"], key: "s" }}
                  onAction={() => handleSaveAsPrompt(entry)}
                />
                <Action
                  title="Delete"
                  icon={Icon.Trash}
                  style={Action.Style.Destructive}
                  shortcut={{ modifiers: ["ctrl"], key: "x" }}
                  onAction={() => handleDelete(entry)}
                />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}
