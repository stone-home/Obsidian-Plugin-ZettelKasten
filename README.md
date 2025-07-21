# Zettelkasten Manager

> [!warning] The Content of this README is auto-generated from Gemini AI. Will be updated soon.

The Zettelkasten Manager is a plugin for Obsidian that provides a comprehensive suite of tools for managing your Zettelkasten notes. It helps you create, organize, and link your notes with ease, following the principles of the Zettelkasten method.

---

## Features

- **Zettelkasten Dashboard**: Access a dashboard to create new notes, view active notes, and upgrade notes to different types.
- **Note Types**: The plugin supports four types of notes: Fleeting, Literature, Atomic, and Permanent.
- **Templates**: Use default or custom templates for each note type to maintain consistency in your note-taking.
- **Customizable Settings**: Configure note creation options, default paths, and other settings to tailor the plugin to your workflow.
- **Templater Integration**: The plugin integrates with the Templater plugin for more advanced templating capabilities.

---

## How to Use

1.  **Open the Zettelkasten Dashboard**: Use the command "Open Zettelkasten Dashboard" (default hotkey: `Mod+Shift+Z`) to access the main dashboard.
2.  **Create a New Note**: From the dashboard, select the type of note you want to create. The plugin will guide you through the process of creating a new note based on your configured templates and settings.
3.  **Manage Active Notes**: The dashboard displays information about the currently active note, including its title, type, and tags. You can also move the active note to a different folder from the dashboard.
4.  **Upgrade Notes**: The dashboard allows you to upgrade a note from one type to another (e.g., from a Fleeting note to a Literature note).

---

## Installation

### From Obsidian

1.  Open **Settings** in Obsidian.
2.  Go to **Community plugins**.
3.  Make sure "Restricted mode" is turned off.
4.  Click **Browse** and search for "Zettelkasten Manager".
5.  Click **Install** and then **Enable**.

### Manual Installation

1.  Download the latest release from the [GitHub releases page](https://www.google.com/search?q=https://github.com/stone-home/obsidian-plugin-zettelkasten/releases).
2.  Extract the downloaded zip file.
3.  Copy the extracted folder to your Obsidian vault's plugins folder: `<YourVault>/.obsidian/plugins/`.
4.  Reload Obsidian.
5.  Go to **Settings** \> **Community plugins**, and enable "Zettelkasten Manager".

---

## Configuration

The Zettelkasten Manager offers a variety of settings to customize your experience. You can access them by going to **Settings** \> **Zettelkasten Settings**.

### Basic Settings

- **Auto Open New Note**: Automatically open a newly created note in the editor.
- **Show Upgrade Notifications**: Display notifications when a note can be upgraded.
- **Default Templates**: Set the default template for each note type (Fleeting, Literature, Atomic, Permanent).

### Paths

- **Note Paths**: Set the default folder paths for Fleeting, Literature, Permanent, and Atomic notes.
- **Template Directory Path**: Specify the folder where your note templates are stored.

### Note Creation

- **Configure Note Types**: Customize the available note types and their default properties when creating a new note. You can add, remove, and edit note creation options.

---

## Dependencies

- [winston](https://www.npmjs.com/package/winston)

---

## License

This plugin is licensed under the MIT License.
