import { useState } from "react";
import {
  Action,
  ActionPanel,
  Alert,
  Clipboard,
  Color,
  Detail,
  Form,
  Icon,
  List,
  confirmAlert,
  showToast,
  Toast,
} from "@raycast/api";
import { usePromise } from "@raycast/utils";
import {
  getPrompts,
  deletePrompt,
  recordPromptUse,
  updatePrompt,
  savePrompt,
  exportLibrary,
  importLibrary,
  getStats,
  seedLibrary,
  truncate,
  timeAgo,
  Prompt,
} from "./store";

// --- Stats View ---

function StatsView({ onBack }: { onBack: () => void }) {
  const { data: stats, isLoading } = usePromise(getStats);

  if (isLoading || !stats) {
    return <Detail isLoading={true} />;
  }

  const md = [
    "# Prompt Shelf — Statistics",
    "",
    "| Metric | Value |",
    "|--------|-------|",
    `| Saved prompts | **${stats.promptCount}** |`,
    `| Clipboard entries | **${stats.historyCount}** |`,
    `| Auto-detected prompts | **${stats.detectedPrompts}** |`,
    `| Total paste/copy uses | **${stats.totalUses}** |`,
    "",
    "## Top Tags",
    "",
    ...(stats.topTags.length > 0
      ? stats.topTags.map(
          ([tag, count], i) => `${i + 1}. \`${tag}\` — ${count} prompts`,
        )
      : ["_No tags yet_"]),
    "",
    "## Library Health",
    "",
    stats.promptCount === 0
      ? "Library is empty. Use **Seed Library** to get started with useful prompts."
      : stats.totalUses === 0
        ? "You have prompts saved but haven't used any yet. Try pasting one!"
        : `Average use: ${(stats.totalUses / stats.promptCount).toFixed(1)}x per prompt`,
  ].join("\n");

  return (
    <Detail
      markdown={md}
      actions={
        <ActionPanel>
          <Action title="Back" icon={Icon.ArrowLeft} onAction={onBack} />
          <Action
            title="Seed Library with Starter Prompts"
            icon={Icon.PlusCircle}
            onAction={async () => {
              const count = await seedLibrary();
              onBack();
              showToast({
                style: Toast.Style.Success,
                title: `Added ${count} starter prompts`,
              });
            }}
          />
        </ActionPanel>
      }
    />
  );
}

// --- Edit Form ---

function EditPromptForm({
  prompt,
  onSave,
}: {
  prompt: Prompt;
  onSave: () => void;
}) {
  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Save Changes"
            onSubmit={async (values: {
              title: string;
              content: string;
              tags: string;
            }) => {
              const tagList = values.tags
                .split(",")
                .map((t: string) => t.trim())
                .filter(Boolean);
              await updatePrompt(prompt.id, {
                title: values.title,
                content: values.content,
                tags: tagList,
              });
              onSave();
              showToast({ style: Toast.Style.Success, title: "Updated" });
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextField id="title" title="Title" defaultValue={prompt.title} />
      <Form.TextArea
        id="content"
        title="Content"
        defaultValue={prompt.content}
      />
      <Form.TextField
        id="tags"
        title="Tags"
        defaultValue={prompt.tags.join(", ")}
        placeholder="comma-separated"
      />
    </Form>
  );
}

// --- Detail View ---

function PromptDetail({
  prompt,
  onUpdate,
}: {
  prompt: Prompt;
  onUpdate: () => void;
}) {
  const md = [
    `# ${prompt.title}`,
    "",
    `**Tags:** ${prompt.tags.length ? prompt.tags.map((t) => "`" + t + "`").join(" ") : "none"}`,
    `**Used:** ${prompt.useCount} times | **Created:** ${new Date(prompt.createdAt).toLocaleDateString()} | **Last used:** ${timeAgo(prompt.usedAt)}`,
    `**Length:** ${prompt.content.length} chars, ${prompt.content.split("\n").length} lines`,
    "",
    "---",
    "",
    "````",
    prompt.content,
    "````",
  ].join("\n");

  return (
    <Detail
      markdown={md}
      actions={
        <ActionPanel>
          <Action
            title="Paste"
            icon={Icon.Clipboard}
            onAction={async () => {
              await Clipboard.paste(prompt.content);
              await recordPromptUse(prompt.id);
              onUpdate();
              showToast({ style: Toast.Style.Success, title: "Pasted" });
            }}
          />
          <Action
            title="Copy"
            icon={Icon.CopyClipboard}
            shortcut={{ modifiers: ["cmd"], key: "c" }}
            onAction={async () => {
              await Clipboard.copy(prompt.content);
              await recordPromptUse(prompt.id);
              onUpdate();
              showToast({ style: Toast.Style.Success, title: "Copied" });
            }}
          />
          <Action.Push
            title="Edit"
            icon={Icon.Pencil}
            shortcut={{ modifiers: ["cmd"], key: "e" }}
            target={<EditPromptForm prompt={prompt} onSave={onUpdate} />}
          />
        </ActionPanel>
      }
    />
  );
}

// --- List Actions ---

function PromptActions({
  prompt,
  revalidate,
}: {
  prompt: Prompt;
  revalidate: () => void;
}) {
  return (
    <ActionPanel>
      <Action
        title="Paste"
        icon={Icon.Clipboard}
        onAction={async () => {
          await Clipboard.paste(prompt.content);
          await recordPromptUse(prompt.id);
          revalidate();
          showToast({ style: Toast.Style.Success, title: "Pasted" });
        }}
      />
      <Action.Push
        title="View"
        icon={Icon.Eye}
        shortcut={{ modifiers: ["cmd"], key: "o" }}
        target={<PromptDetail prompt={prompt} onUpdate={revalidate} />}
      />
      <Action
        title="Copy"
        icon={Icon.CopyClipboard}
        shortcut={{ modifiers: ["cmd"], key: "c" }}
        onAction={async () => {
          await Clipboard.copy(prompt.content);
          await recordPromptUse(prompt.id);
          revalidate();
        }}
      />
      <Action.Push
        title="Edit"
        icon={Icon.Pencil}
        shortcut={{ modifiers: ["cmd"], key: "e" }}
        target={<EditPromptForm prompt={prompt} onSave={revalidate} />}
      />
      <Action
        title="Duplicate"
        icon={Icon.PlusSquare}
        shortcut={{ modifiers: ["cmd"], key: "d" }}
        onAction={async () => {
          await savePrompt(prompt.title + " (copy)", prompt.content, [
            ...prompt.tags,
          ]);
          revalidate();
          showToast({ style: Toast.Style.Success, title: "Duplicated" });
        }}
      />
      <Action
        title="Export Library to Clipboard"
        icon={Icon.Download}
        shortcut={{ modifiers: ["cmd", "shift"], key: "e" }}
        onAction={async () => {
          const json = await exportLibrary();
          await Clipboard.copy(json);
          showToast({
            style: Toast.Style.Success,
            title: "Library JSON copied to clipboard",
          });
        }}
      />
      <Action
        title="Import from Clipboard"
        icon={Icon.Upload}
        shortcut={{ modifiers: ["cmd", "shift"], key: "i" }}
        onAction={async () => {
          const json = await Clipboard.readText();
          if (!json) {
            showToast({ style: Toast.Style.Failure, title: "Clipboard empty" });
            return;
          }
          try {
            const count = await importLibrary(json);
            revalidate();
            showToast({
              style: Toast.Style.Success,
              title: `Imported ${count} new prompts`,
            });
          } catch {
            showToast({ style: Toast.Style.Failure, title: "Invalid JSON" });
          }
        }}
      />
      <Action
        title="Delete"
        icon={Icon.Trash}
        style={Action.Style.Destructive}
        shortcut={{ modifiers: ["ctrl"], key: "x" }}
        onAction={async () => {
          if (
            await confirmAlert({
              title: `Delete "${prompt.title}"?`,
              primaryAction: {
                title: "Delete",
                style: Alert.ActionStyle.Destructive,
              },
            })
          ) {
            await deletePrompt(prompt.id);
            revalidate();
          }
        }}
      />
    </ActionPanel>
  );
}

// --- List Item ---

function PromptItem({
  prompt,
  revalidate,
}: {
  prompt: Prompt;
  revalidate: () => void;
}) {
  return (
    <List.Item
      key={prompt.id}
      title={prompt.title}
      subtitle={truncate(prompt.content, 50)}
      icon={{
        source: Icon.Bookmark,
        tintColor:
          prompt.useCount > 5
            ? Color.Green
            : prompt.useCount > 0
              ? Color.Blue
              : Color.SecondaryText,
      }}
      accessories={[
        ...(prompt.tags.length > 0
          ? [{ tag: { value: prompt.tags[0], color: Color.Blue } }]
          : []),
        ...(prompt.tags.length > 1
          ? [
              {
                tag: {
                  value: `+${prompt.tags.length - 1}`,
                  color: Color.SecondaryText,
                },
              },
            ]
          : []),
        {
          text: prompt.useCount > 0 ? `${prompt.useCount}x` : "",
          tooltip: "Times used",
        },
        { text: timeAgo(prompt.usedAt) },
      ]}
      actions={<PromptActions prompt={prompt} revalidate={revalidate} />}
    />
  );
}

// --- Main ---

export default function PromptLibrary() {
  const { data: prompts, isLoading, revalidate } = usePromise(getPrompts);
  const [showStats, setShowStats] = useState(false);

  if (showStats) {
    return (
      <StatsView
        onBack={() => {
          setShowStats(false);
          revalidate();
        }}
      />
    );
  }

  const allTags = [...new Set((prompts ?? []).flatMap((p) => p.tags))].sort();
  const untagged = (prompts ?? []).filter((p) => p.tags.length === 0);
  const total = (prompts ?? []).length;

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder={`Search ${total} prompts...`}
    >
      {allTags.map((tag) => {
        const tagged = (prompts ?? []).filter((p) => p.tags.includes(tag));
        return (
          <List.Section key={tag} title={tag} subtitle={`${tagged.length}`}>
            {tagged.map((prompt) => (
              <PromptItem
                key={prompt.id}
                prompt={prompt}
                revalidate={revalidate}
              />
            ))}
          </List.Section>
        );
      })}
      {untagged.length > 0 && (
        <List.Section title="Untagged" subtitle={`${untagged.length}`}>
          {untagged.map((prompt) => (
            <PromptItem
              key={prompt.id}
              prompt={prompt}
              revalidate={revalidate}
            />
          ))}
        </List.Section>
      )}
      {total === 0 && !isLoading && (
        <List.EmptyView
          title="No prompts yet"
          description="Use 'Seed Library' from Actions, or save prompts from clipboard"
          icon={Icon.Bookmark}
          actions={
            <ActionPanel>
              <Action
                title="Seed Library with Starter Prompts"
                icon={Icon.PlusCircle}
                onAction={async () => {
                  const count = await seedLibrary();
                  revalidate();
                  showToast({
                    style: Toast.Style.Success,
                    title: `Added ${count} starter prompts`,
                  });
                }}
              />
              <Action
                title="View Stats"
                icon={Icon.BarChart}
                onAction={() => setShowStats(true)}
              />
            </ActionPanel>
          }
        />
      )}
    </List>
  );
}
