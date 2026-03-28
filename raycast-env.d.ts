/// <reference types="@raycast/api">

/* 🚧 🚧 🚧
 * This file is auto-generated from the extension's manifest.
 * Do not modify manually. Instead, update the `package.json` file.
 * 🚧 🚧 🚧 */

/* eslint-disable @typescript-eslint/ban-types */

type ExtensionPreferences = {}

/** Preferences accessible in all the extension's commands */
declare type Preferences = ExtensionPreferences

declare namespace Preferences {
  /** Preferences accessible in the `clipboard-history` command */
  export type ClipboardHistory = ExtensionPreferences & {}
  /** Preferences accessible in the `prompt-library` command */
  export type PromptLibrary = ExtensionPreferences & {}
  /** Preferences accessible in the `save-clipboard-as-prompt` command */
  export type SaveClipboardAsPrompt = ExtensionPreferences & {}
  /** Preferences accessible in the `capture-clipboard` command */
  export type CaptureClipboard = ExtensionPreferences & {}
  /** Preferences accessible in the `seed-library` command */
  export type SeedLibrary = ExtensionPreferences & {}
  /** Preferences accessible in the `sync-history` command */
  export type SyncHistory = ExtensionPreferences & {}
}

declare namespace Arguments {
  /** Arguments passed to the `clipboard-history` command */
  export type ClipboardHistory = {}
  /** Arguments passed to the `prompt-library` command */
  export type PromptLibrary = {}
  /** Arguments passed to the `save-clipboard-as-prompt` command */
  export type SaveClipboardAsPrompt = {}
  /** Arguments passed to the `capture-clipboard` command */
  export type CaptureClipboard = {}
  /** Arguments passed to the `seed-library` command */
  export type SeedLibrary = {}
  /** Arguments passed to the `sync-history` command */
  export type SyncHistory = {}
}

