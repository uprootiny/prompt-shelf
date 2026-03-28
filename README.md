# Prompt Shelf

A Raycast extension that turns your clipboard into a smart prompt workbench. It captures clipboard history, automatically detects AI prompts (English and Hebrew), and organizes them into a searchable, taggable library.

## Features

- **Smart prompt detection** -- every clipboard entry is scored against signal patterns (imperative instructions, prompt engineering jargon, template markers, role assignments, Hebrew patterns) and flagged automatically
- **Auto-tagging** -- when saving a prompt, tags are suggested based on word frequency analysis (with stop-word filtering)
- **Clipboard history** -- stores up to 500 entries with deduplication against the 20 most recent, separated into "Detected Prompts" and plain clipboard sections
- **Prompt library** -- full CRUD: save, edit, duplicate, delete prompts; browse by tag; view usage stats
- **Seed library** -- 10 curated starter prompts covering code review, debugging, refactoring, CI workflows, agent system prompts, fleet digests, and more
- **Export / Import** -- export your entire library as JSON to clipboard; import from clipboard with content-based deduplication
- **Statistics dashboard** -- prompt count, clipboard entries, auto-detected prompts, total uses, top tags, library health summary
- **Background capture** -- a no-view command that polls the clipboard every 10 seconds and logs new entries

## Commands

| Command | Mode | Description |
|---------|------|-------------|
| **Clipboard History** | View | Browse clipboard history with prompt detection. Detected prompts are highlighted and can be saved to the library with one action. |
| **Prompt Library** | View | Browse, search, paste, edit, duplicate, export/import prompts. Organized by tag with usage-count color coding. |
| **Save Clipboard as Prompt** | View | Reads clipboard, auto-detects if it is a prompt, suggests a title (first line) and tags, lets you edit before saving. |
| **Start Clipboard Capture** | Background | Runs every 10 seconds. Reads clipboard and stores new entries in history (no UI). |
| **Seed Prompt Library** | No-view | Adds 10 starter prompts to the library, skipping any that already exist by title. |

## How Prompt Detection Works

The `looksLikePrompt()` function in `src/store.ts` checks text against a set of regex-based signal patterns. A piece of text qualifies as a prompt if it is between 30 and 50,000 characters, has at least 3 lines and 80+ characters, and matches one or more signals:

| Signal category | Examples matched |
|----------------|-----------------|
| Imperative instructions | "you are", "act as", "write", "generate", "summarize", "i want you to" |
| Prompt engineering jargon | "step-by-step", "chain-of-thought", "few-shot", "system prompt" |
| Template markers | Jinja `{{ }}` / `{% %}`, XML role tags `<system>`, `<user>`, `<assistant>` |
| Code fences | Triple backticks with 20+ characters of content |
| Numbered instructions | Lines starting with "1.", "step 1", "first," |
| Output format directives | "respond in json", "format as markdown", "output as yaml" |
| Role/persona assignment | "expert in", "specialist at", "senior with" |
| Hebrew patterns | Imperatives and request forms in Hebrew script |

Text with 5+ lines and 200+ characters is also accepted even without signal matches, as multi-line structured text is often a prompt.

## Installation

```bash
git clone https://github.com/uprootiny/prompt-shelf.git
cd prompt-shelf
npm install
```

Open Raycast and run the **Import Extension** developer command, or:

```bash
npm run dev
```

This starts `ray develop`, which loads the extension in Raycast in development mode.

## Project Structure

```
src/
  store.ts                  -- storage, prompt detection, auto-tagging, export/import, stats
  clipboard-history.tsx     -- Clipboard History command (list view)
  prompt-library.tsx        -- Prompt Library command (list + detail + edit + stats views)
  save-clipboard-as-prompt.tsx -- Save Clipboard as Prompt command (form)
  capture-clipboard.ts      -- Background clipboard capture (no-view, 10s interval)
  seed-library.ts           -- Seed Prompt Library command (no-view)
assets/
  extension-icon.png        -- Raycast extension icon
```

## License

MIT
