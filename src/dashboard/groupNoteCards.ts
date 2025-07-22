import { App, Modal, Notice, TFolder } from "obsidian";
import { StepByStepFolderModal, Utils } from "../utils";
import { NoteFactory, KeyValue } from "../notes";
import { Logger } from "../logger";
import { INoteOption } from "../types";
import { DataviewHelper, ViewNoteIndex } from "../dataview";
import ZettelkastenPlugin from "../main";

export class GroupNoteCards extends Modal {
	private modalTitle: string = "Select Note Type";
	private plugin: ZettelkastenPlugin;
	private options: INoteOption[];
	private callback: (noteMeta: INoteOption) => Promise<void>;
	private factory: NoteFactory;
	private logger: Logger = Logger.createLogger("GroupNoteCards");

	constructor(
		app: App,
		plugin: ZettelkastenPlugin,
		name: string,
		factory: NoteFactory,
		options: INoteOption[],
		callback: (noteMeta: INoteOption) => Promise<void>,
	) {
		super(app);
		this.plugin = plugin;
		this.modalTitle = name;
		this.options = options;
		this.callback = callback;
		this.factory = factory;
	}

	onOpen() {
		this.display();
	}

	onClose() {
		this.contentEl.empty();
	}

	private display() {
		const { contentEl } = this;
		contentEl.empty();
		contentEl.addClass("zettelkasten-modal");
		contentEl.createEl("h2", {
			text: this.modalTitle,
			cls: "modal-title",
		});

		const cardsContainer = contentEl.createDiv("note-cards-container");
		this.options.forEach((option) => {
			if (option.enabled) {
				if (option.folderNote) {
					this.folderCards(cardsContainer, option);
				} else {
					this.singleNoteCard(cardsContainer, option);
				}
			}
		});
	}

	private singleNoteCard(contentElemnt: HTMLElement, option: INoteOption) {
		const card = contentElemnt.createDiv("note-card clickable-card");
		const iconDiv = card.createDiv("note-card-icon");
		iconDiv.createEl("span", { text: option.emoji, cls: "card-emoji" });

		// Title only (no description for compact design)
		card.createEl("div", { text: option.label, cls: "note-card-title" });

		// Make card clickable
		card.addEventListener("click", async () => {
			await this.callback(option);
			this.close();
		});
	}

	private folderCards(contentElemnt: HTMLElement, option: INoteOption) {
		const card = contentElemnt.createDiv("note-card clickable-card");
		const iconDiv = card.createDiv("note-card-icon");
		iconDiv.createEl("span", { text: option.emoji, cls: "card-emoji" });

		// Title only (no description for compact design)
		card.createEl("div", { text: option.label, cls: "note-card-title" });

		// Make card clickable
		const targetPath = option.path || "";
		card.addEventListener("click", async () => {
			let defaultPathFile: TFolder | null =
				this.app.vault.getAbstractFileByPath(
					targetPath,
				) as TFolder | null;
			new StepByStepFolderModal(
				this.app,
				defaultPathFile,
				true,
				async (selectedFolder) => {
					// load _config.md file from the selected folder
					const configPath = `${targetPath}/_config.md`;
					if (!Utils.fileExists(this.app, configPath, false)) {
						new Notice(
							`The folder ${defaultPathFile} does not contain a _config.md file. Please create one to proceed.`,
						);
						this.close();
					}
					const configNote =
						await this.factory.loadFromFile(configPath);
					const defaultNoteTag =
						configNote.getProperty("ZT_root_tag") || "";
					const isNestedTag =
						configNote.getProperty("ZT_nested_tag") || false;
					const tagNameRegex =
						configNote.getProperty("ZT_name_regex") || "";
					let expectedTagName =
						tagNameRegex.length > 0
							? this.transformString(
									selectedFolder.name,
									tagNameRegex,
									isNestedTag,
								)
							: "";
					if (!expectedTagName) {
						expectedTagName = selectedFolder.name;
					}
					const indexFileName =
						tagNameRegex.length > 0
							? this.transformString(
									selectedFolder.name,
									tagNameRegex,
									false,
								)
							: selectedFolder.name;
					let selectedTag = `${defaultNoteTag}/${expectedTagName}`;
					// Ensure all white spaces are removed from the tag, as tag in Obsidian cannot contain spaces
					selectedTag = selectedTag.replace(/ /g, "");

					option = Utils.deepClone(option);
					option.path = selectedFolder.path;
					if (!option.extraInfo) {
						option.extraInfo = {};
					}
					option.extraInfo.prefix = `${Utils.generateDate()} - ${indexFileName}`;
					option.extraInfo.tags = [selectedTag];
					option.extraInfo.properties = [
						new KeyValue("category", ""),
					];

					// check whether the index.md file exists in the selected folder
					const indexPrefix = indexFileName || "unknown";
					const indexNoteName = `${indexPrefix} - index`;
					const indexNote = `${option.path}/${indexNoteName}.md`;
					if (!Utils.fileExists(this.app, indexNote, false)) {
						const indexNote = this.factory.createNote(option.type);
						indexNote.setTitle(indexNoteName);
						indexNote.setPath(option.path);
						indexNote.setProperty("ZT_folder_note", true);
						indexNote.setProperty("new", false);
						indexNote.addTag(selectedTag);
						indexNote.addTag(`📍tagNode`);
						indexNote.addAlias(`"#${selectedTag}"`);
						const dataviewSectionName = "Index Notes";
						indexNote.getBody().newSection(dataviewSectionName, 1);
						indexNote
							.getBody()
							.addContent(
								[
									DataviewHelper.getCodeBlockContent(
										this.plugin.settings
											.dataviewCodeBlockType,
										ViewNoteIndex,
									),
								],
								dataviewSectionName,
							);
						await indexNote.save();
					}
					await this.callback(option);
				},
			).open();
			this.close();
		});
	}

	private transformString(
		input: string,
		expression: string,
		isNested: boolean = false,
	): string | null {
		// Step 1: Use regex to capture everything after the first hyphen
		const match = input.match(expression);

		if (!match || !match[1]) {
			return null; // Return null if the pattern isn't found
		}

		// Get the captured part, which is e.g., "DataFrame" or " Python Ansible"
		let result = match[1];

		// Step 2: Trim leading/trailing whitespace
		result = result.trim();

		// Step 3: Replace all remaining spaces with a forward slash
		if (isNested) {
			result = result.replace(/ /g, "/");
		}

		return result;
	}
}
