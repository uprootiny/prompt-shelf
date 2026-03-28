import {
  Action,
  ActionPanel,
  Clipboard,
  Form,
  popToRoot,
  showToast,
  Toast,
} from "@raycast/api";
import { useState, useEffect } from "react";
import { savePrompt, looksLikePrompt, suggestTags } from "./store";

export default function SaveClipboardAsPrompt() {
  const [content, setContent] = useState("");
  const [title, setTitle] = useState("");
  const [tags, setTags] = useState("");
  const [detected, setDetected] = useState(false);

  useEffect(() => {
    (async () => {
      const text = await Clipboard.readText();
      if (text) {
        setContent(text);
        setDetected(looksLikePrompt(text));
        const firstLine = text.split("\n")[0].slice(0, 60);
        setTitle(firstLine);
        setTags(suggestTags(text).join(", "));
      }
    })();
  }, []);

  async function handleSubmit() {
    if (!content.trim()) {
      showToast({ style: Toast.Style.Failure, title: "Clipboard is empty" });
      return;
    }
    const tagList = tags
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
    await savePrompt(title || "Untitled", content, tagList);
    showToast({ style: Toast.Style.Success, title: "Prompt saved" });
    popToRoot();
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save Prompt" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="title"
        title="Title"
        value={title}
        onChange={setTitle}
        placeholder="Prompt name..."
      />
      <Form.TextArea
        id="content"
        title="Content"
        value={content}
        onChange={setContent}
        placeholder="Paste or edit prompt content..."
      />
      <Form.TextField
        id="tags"
        title="Tags"
        value={tags}
        onChange={setTags}
        placeholder="coding, analysis, creative (comma-separated)"
      />
      {detected && (
        <Form.Description
          title="Auto-detected"
          text="This looks like a prompt"
        />
      )}
    </Form>
  );
}
