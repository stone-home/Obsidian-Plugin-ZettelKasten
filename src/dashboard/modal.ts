import ZettelkastenPlugin from "../main";
import { Modal, App, Notice, TFolder, setIcon } from "obsidian";
import {
	BaseDefault,
	BaseNote,
	KeyValue,
	NoteFactory,
	NoteType,
	NoteTypeData,
} from "../notes";
import { Logger } from "../logger";
import { CreateNoteOptions } from "../config";
import { INoteOption } from "../types";
import { ZettelkastenSettings } from "../types";
import { IntegrationManager } from "../3rd";
import { Utils, StepByStepFolderModal } from "../utils";
import { ConfigHelper } from "../config";
import { ResearchDashboardModal } from "../research/modals";
import { WeeklyKanbanModal } from "../task/modal";
import { ProjectDashboardModal } from "../project";
import { GroupNoteCards } from "./groupNoteCards";

export class ZettelKastenModal extends Modal {
	private factory: NoteFactory;
	private plugin: ZettelkastenPlugin;
	private currentNote: BaseNote | null = null;
	private currentNoteType: NoteType = NoteType.FLEETING;
	private logger = Logger.createLogger("ZettelkastenModal");
	private newNoteOptions: typeof CreateNoteOptions;
	private settings!: ZettelkastenSettings;
	private integrations: IntegrationManager;

	constructor(app: App, factory: NoteFactory, plugin: ZettelkastenPlugin) {
		super(app);
		this.factory = factory;
		this.plugin = plugin;
		this.newNoteOptions = this.supplementNoteOptions(CreateNoteOptions);
		this.integrations = IntegrationManager.getInstance(this.app);
	}

	async onOpen() {
		const { contentEl } = this;
		contentEl.empty();
		contentEl.addClass("zettelkasten-modal");

		// Load current note type if available
		await this.loadActivateNote();
		this.renderModal();
	}

	private async loadActivateNote() {
		try {
			const activeFile = this.app.workspace.getActiveFile();
			if (activeFile && activeFile.extension === "md") {
				this.currentNote = await this.factory.loadFromFile(
					activeFile.path,
				);
				this.currentNoteType = this.currentNote.getType();
				this.logger.info(
					`Loaded current note: ${this.currentNote.getTitle()} (${this.currentNoteType})`,
				);
			}
		} catch (error) {
			this.logger.error("Failed to load current note", error);
		}
	}

	private renderModal(): void {
		const { contentEl } = this;

		// Modal title
		contentEl.createEl("h2", {
			text: "Dashboard Guide",
			cls: "modal-title",
		});

		this.renderQuickAccess(contentEl);
		// New Note Section
		this.renderNewNoteSection(contentEl);

		// Active Note Section (if available)
		if (this.currentNote) {
			this.renderActiveNoteSection(contentEl);
			this.renderUpgradeSection(contentEl);
		}
	}

	private loadNewNoteOptions(): INoteOption[] {
		// [Mandatory] shallow copy of new note options
		const createNotes: INoteOption[] = JSON.parse(
			JSON.stringify(this.newNoteOptions),
		);
		if (
			this.plugin.settings?.createNoteOptions !== undefined &&
			this.plugin.settings.createNoteOptions.length > 0
		) {
			const optionsInSetting: INoteOption[] = JSON.parse(
				JSON.stringify(this.plugin.settings.createNoteOptions),
			);
			createNotes.push(...optionsInSetting);
		}
		return this.supplementNoteOptions(createNotes);
	}

	/**
	 * Corrected: Builds the "Quick Search" section with the inline layout.
	 * @param container - The HTMLElement to append the section to.
	 */
	private renderQuickAccess(container: HTMLElement) {
		// Then, create the header element inside the section for the inline layout
		const quickSearchHeader = container.createDiv("quick-access-header");

		// Add the title to the header
		quickSearchHeader.createEl("h3", { text: "Quick Search" });

		// Add the button group to the header
		const buttonGroup = quickSearchHeader.createDiv(
			"quick-access-button-group",
		);
		const buttons = [
			{
				label: "Kanban",
				icon: "trello",
				callback: async () => {
					new WeeklyKanbanModal(
						this.app,
						this.plugin.settings,
						this.factory,
					).open();
					this.close();
				},
			},
			{
				label: "Research",
				icon: "atom",
				callback: async () => {
					new ResearchDashboardModal(
						this.app,
						this.plugin,
						this.factory,
					).open();
					this.close();
				},
			},
			{
				label: "Projects",
				icon: "folder-tree",
				callback: async () => {
					new ProjectDashboardModal(
						this.app,
						this.plugin,
						this.factory,
					).open();
					this.close();
				},
			},
		];

		buttons.forEach(({ label, icon, callback }) => {
			const buttonEl = buttonGroup.createEl("button", {
				cls: "quick-access-button",
				attr: { title: label }, // Use title attribute for hover tooltip,
			});
			buttonEl.addEventListener("click", async () => {
				new Notice(`Clicked on: Quick Search: ${label}`);
				await callback();
			});
			setIcon(buttonEl, icon);
		});
	}

	private renderNewNoteSection(container: HTMLElement): void {
		const section = container.createDiv("zettel-section");
		const header = section.createDiv("section-header");
		header.createEl("h3", { text: "New Note" });
		header.createEl("p", {
			text: "Each selection button can directly trigger relevant event",
			cls: "section-subtitle",
		});

		this.createOptionCards(section, [], (noteMeta) =>
			this.createNewNote(noteMeta),
		);
	}

	private renderActiveNoteSection(container: HTMLElement): void {
		const section = container.createDiv(
			"zettel-section active-note-section",
		);

		// 1. Create a container for the header elements
		const headerContainer = section.createDiv("header-container");

		// 2. Create the H3 inside the new container
		headerContainer.createEl("h3", { text: "Active Note" });

		// 3. Create the button, add your classes, and also place it inside
		const moveButton = headerContainer.createEl("button", { text: "Move" });
		moveButton.addClasses(["btn-small", "your-plugin-move-button"]); // Add a specific class

		moveButton.addEventListener("click", async () => {
			const dirEntry = this.currentNote?.getType();

			// recently, let's use date from settings, which may be stalls.
			let defaultPath = dirEntry
				? this.plugin.settings?.[`${dirEntry}Path`]
				: undefined;
			let defaultPathFile: TFolder | null =
				this.app.vault.getAbstractFileByPath(
					defaultPath || "",
				) as TFolder | null;

			new StepByStepFolderModal(
				this.app,
				defaultPathFile,
				false,
				async (selectedFolder) => {
					await this.currentNote?.move(selectedFolder.path);
					new Notice(
						`Moved ${this.currentNote?.getTitle()} to ${selectedFolder.path}`,
					);
				},
			).open();
			this.close();
		});

		const noteInfoCard = section.createDiv("active-note-card");

		// Note details
		const infoGrid = noteInfoCard.createDiv("note-info-grid");

		// Name row
		const nameRow = infoGrid.createDiv("info-row");
		nameRow.createEl("span", { text: "name:", cls: "info-label" });
		nameRow.createEl("span", {
			text: `${this.currentNote!.getTitle()}(${this.currentNote?.getPath()})`,
			cls: "info-value",
		});

		// Type row
		const typicalNoteEmoji = ConfigHelper.getNoteTypeConfig(
			this.currentNoteType,
		).emoji;
		const typeRow = infoGrid.createDiv("info-row");
		typeRow.createEl("span", { text: "type:", cls: "info-label" });
		const typeValue = typeRow.createEl("span", { cls: "info-value" });
		typeValue.innerHTML = `${typicalNoteEmoji} ${this.currentNoteType}`;

		// Tags row
		const tagsRow = infoGrid.createDiv("info-row");
		tagsRow.createEl("span", { text: "tags:", cls: "info-label" });
		const tags = this.currentNote!.getProperty("tags") || [];
		tagsRow.createEl("span", {
			text: tags.length > 0 ? tags.join(", ") : "No tags",
			cls: "info-value",
		});
	}

	private renderUpgradeSection(container: HTMLElement): void {
		const section = container.createDiv("zettel-section");
		section.createEl("h3", { text: "Upgrade" });

		this.createOptionCards(
			section,
			ConfigHelper.getNoteTypeConfig(this.currentNoteType).upgradePath,
			(noteMeta) => this.noteUpgrade(noteMeta),
		);
	}

	private supplementNoteOptions(noteOptions: INoteOption[]): INoteOption[] {
		noteOptions.forEach((note) => {
			note.metadata = ConfigHelper.getNoteTypeConfig(note.type);
			// fetch default path
			const defaultPathMap = {
				[NoteType.FLEETING]: this.plugin.settings?.fleetingPath,
				[NoteType.LITERATURE]: this.plugin.settings?.literaturePath,
				[NoteType.PERMANENT]: this.plugin.settings?.permanentPath,
				[NoteType.ATOMIC]: this.plugin.settings?.atomPath,
			};
			const defaultPath = defaultPathMap[note.type] || note.metadata.path;

			// Set default values if not provided
			note.emoji = note.emoji || note.metadata.emoji;
			note.path = note.path || defaultPath;
			note.template = note.template || "default";
		});
		return noteOptions;
	}

	private async createNewNote(noteMetadata: INoteOption): Promise<void> {
		const noteType = noteMetadata.type;
		const notePath = noteMetadata.path;
		if (!noteType) {
			this.logger.error(`Invalid note type for ${noteType}`);
			new Notice(
				`Failed to create note: Invalid type`,
				ConfigHelper.getNotificationDuration("error"),
			);
			return;
		}
		if (!notePath) {
			this.logger.error(`Invalid note path for ${noteType}`);
			new Notice(
				`Failed to create note: Invalid path`,
				ConfigHelper.getNotificationDuration("error"),
			);
			return;
		}
		try {
			this.logger.info(`Creating new ${noteType} note`);

			// Create note using factory
			this.logger.info(
				`Creating new ${noteType} note with template ${noteMetadata.template}`,
			);
			const note = await this.factory.createFromTemplate(
				noteType,
				noteMetadata.template,
			);
			note.setPath(notePath);
			if (!note) {
				this.logger.error(
					`Failed to create note of type ${noteType} from template ${noteMetadata.template}`,
				);
				new Notice(
					`Failed to create note of type ${noteType}`,
					ConfigHelper.getNotificationDuration("error"),
				);
				return;
			}

			// Ensure the node has a right suffix
			const filename = await this.integrations
				.getTemplater()
				.getPrompt("Please enter the file name");
			if (filename) {
				this.logger.info(`Note title set to: ${filename}`);
				if (noteMetadata.prefixEnabled ?? true) {
					const prefix =
						noteMetadata.extraInfo?.prefix || Utils.generateDate();
					note.setTitle(`${prefix} - ${filename}`);
				} else {
					note.setTitle(filename);
				}
			}

			// Process extra properties and other metadata
			const extraTags = noteMetadata.extraInfo?.tags || [];
			extraTags.forEach((tag) => {
				note.addTag(tag);
			});
			const extraProperties = noteMetadata.extraInfo?.properties || [];
			extraProperties.forEach((property) => {
				if (property instanceof KeyValue) {
					note.setProperty(property.getKey(), property.getValue());
				}
			});

			// save note
			const file = await note.save();

			// Show success notification
			const duration = ConfigHelper.getNotificationDuration("success");
			new Notice(
				`Created new ${noteType} note: ${note.getTitle()}`,
				duration,
			);
			this.logger.info(`Created note: ${file.path}`);

			// Open the new note if feature is enabled
			if (this.plugin.settings?.autoOpenNewNote) {
				await this.app.workspace.openLinkText(file.path, "");
			}

			// Close modal
			this.close();
		} catch (error) {
			this.logger.logError(`Failed to create ${noteType} note`, error);
		}
	}

	private async noteUpgrade(noteMetadata: INoteOption): Promise<void> {
		const noteType = noteMetadata.type;
		const notePath = noteMetadata.path;
		if (!noteType) {
			this.logger.error(`Invalid note type for ${noteType}`);
			new Notice(
				`Failed to create note: Invalid type`,
				ConfigHelper.getNotificationDuration("error"),
			);
			return;
		}
		if (!notePath) {
			this.logger.error(`Invalid note path for ${noteType}`);
			new Notice(
				`Failed to create note: Invalid path`,
				ConfigHelper.getNotificationDuration("error"),
			);
			return;
		}
		try {
			this.logger.info(
				`Upgrade ${this.currentNote?.getTitle()} to ${noteType} note`,
			);
			// Create note using factory
			const note = (await this.factory.createFromTemplate(
				noteType,
				noteMetadata.template,
			)) as BaseDefault;

			// Ensure the node has a right suffix
			const filename = await this.integrations
				.getTemplater()
				.getPrompt("Please enter the file name");
			if (filename) {
				this.logger.info(`Note title set to: ${filename}`);
				const prefix =
					noteMetadata.extraInfo?.prefix || Utils.generateDate();
				note.setTitle(`${prefix} - ${filename}`);
			}

			// Process extra properties and other metadata
			const extraTags = noteMetadata.extraInfo?.tags || [];
			extraTags.forEach((tag) => {
				note.addTag(tag);
			});
			const extraProperties = noteMetadata.extraInfo?.properties || [];
			extraProperties.forEach((property) => {
				if (property instanceof KeyValue) {
					note.setProperty(property.getKey(), property.getValue());
				}
			});

			note.setPath(notePath);
			note.addSourceNote(`[[${this.currentNote?.getTitle()}]]`);

			// Save the note
			const file = await note.save();

			// Show success notification
			const duration = ConfigHelper.getNotificationDuration("success");
			new Notice(
				`Created new ${noteType} note: ${note.getTitle()}`,
				duration,
			);
			this.logger.info(`Created note: ${file.path}`);

			// Open the new note if feature is enabled
			if (this.plugin.settings?.autoOpenNewNote) {
				await this.app.workspace.openLinkText(
					note.getTitle(),
					"",
					false,
					{ state: { mode: "source" } },
				);
			}

			// Close modal
			this.close();
		} catch (error) {
			this.logger.logError(`Failed to upgrade ${noteType} note`, error);
		}
	}

	private createOptionCards(
		container: HTMLElement,
		noteTypes: NoteType[],
		callback: (noteMeta: INoteOption) => Promise<void>,
	): void {
		const cardsContainer = container.createDiv("note-cards-container");
		const allNoteTemplates = this.loadNewNoteOptions();
		const selectedNoteTypes =
			noteTypes.length > 0 ? noteTypes : Object.values(NoteType);
		selectedNoteTypes.forEach((noteType) => {
			const typeTemplates = allNoteTemplates.filter((template) => {
				return template.type === noteType;
			});
			const card = cardsContainer.createDiv("note-card clickable-card");
			const iconDiv = card.createDiv("note-card-icon");
			iconDiv.createEl("span", {
				text: NoteTypeData[noteType].emoji,
				cls: "card-emoji",
			});

			// Title only (no description for compact design)
			card.createEl("div", {
				text: NoteTypeData[noteType].label,
				cls: "note-card-title",
			});

			// Make card clickable
			card.addEventListener("click", async () => {
				const gCards = new GroupNoteCards(
					this.app,
					this.plugin,
					`All ${NoteTypeData[noteType].label} Cards`,
					this.factory,
					typeTemplates,
					callback,
				);
				gCards.open();
				this.close();
			});
		});
	}
}
