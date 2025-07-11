import {Modal, App, Notice} from "obsidian";
import {NoteFactory} from "./factory";
import {BaseDefault, BaseNote} from "./note";
import {Logger} from "../logger";
import {NoteType, ConfigHelper, CreateNoteOptions, CONFIG} from "./config";
import {INoteOption} from "./types";
import { ZettelkastenSettings } from "../types";


export class ZettelKastenModal extends Modal {
	private factory: NoteFactory;
	private currentNote: BaseNote | null = null;
	private currentNoteType: NoteType = NoteType.FLEETING;
	private logger = Logger.createLogger('ZettelkastenModal');
	private newNoteOptions: typeof CreateNoteOptions;
	private settings: ZettelkastenSettings | undefined;

	constructor(app: App, factory: NoteFactory, settings?: ZettelkastenSettings) {
		super(app);
		this.factory = factory;
		this.settings = settings;
		this.newNoteOptions = this.supplementNoteOptions(CreateNoteOptions)
	}

	async onOpen() {
		const {contentEl} = this;
		contentEl.empty();
		contentEl.addClass('zettelkasten-modal');

		// Load current note type if available
		await this.loadActivateNote();
		this.renderModal();
	}

	private async loadActivateNote() {
		try {
			const activeFile = this.app.workspace.getActiveFile();
			if (activeFile && activeFile.extension === 'md') {
				this.currentNote = await this.factory.loadFromFile(activeFile.path);
				this.currentNoteType = this.currentNote.getType();
				this.logger.info(`Loaded current note: ${this.currentNote.getTitle()} (${this.currentNoteType})`);
			}
		} catch (error) {
			this.logger.error('Failed to load current note', error);
		}
	}

	private renderModal(): void {
		const {contentEl} = this;

		// Modal title
		contentEl.createEl('h2', {
			text: 'Dashboard Guide',
			cls: 'modal-title'
		});

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
		const createNotes = [...this.newNoteOptions];
		if (this.settings?.createNoteOptions !==undefined && this.settings.createNoteOptions.length > 0) {
			createNotes.push(...this.settings.createNoteOptions);
		}
		return createNotes;
	}

	private renderNewNoteSection(container: HTMLElement): void {
		const section = container.createDiv('zettel-section');
		const header = section.createDiv('section-header');
		header.createEl('h3', { text: 'New Note' });
		header.createEl('p', {
			text: 'Each selection button can directly trigger relevant event',
			cls: 'section-subtitle'
		});

		this.createOptionCards(section, this.loadNewNoteOptions(), (noteMeta) => this.createNewNote(noteMeta));
	}

	private createOptionCards(container: HTMLElement, options: INoteOption[], callback: (noteMeta: INoteOption) => Promise<void>): void {
		const cardsContainer = container.createDiv('note-cards-container');
		options.forEach(option => {
			if (option.enabled) {
				const card = cardsContainer.createDiv('note-card clickable-card');
				const iconDiv = card.createDiv('note-card-icon');
				iconDiv.createEl('span', { text: option.emoji, cls: 'card-emoji' });

				// Title only (no description for compact design)
				card.createEl('div', { text: option.label, cls: 'note-card-title' });

				// Make card clickable
				card.addEventListener('click', async () => {
					await callback(option);
				});
			}
		});
	}

	private renderActiveNoteSection(container: HTMLElement): void {
		const section = container.createDiv('zettel-section active-note-section');
		section.createEl('h3', { text: 'Active Note' });

		const noteInfoCard = section.createDiv('active-note-card');

		// Note details
		const infoGrid = noteInfoCard.createDiv('note-info-grid');

		// Name row
		const nameRow = infoGrid.createDiv('info-row');
		nameRow.createEl('span', { text: 'name:', cls: 'info-label' });
		nameRow.createEl('span', { text: this.currentNote!.getTitle(), cls: 'info-value' });

		// Type row
		const typicalNoteEmoji = ConfigHelper.getNoteTypeConfig(this.currentNoteType).emoji
		const typeRow = infoGrid.createDiv('info-row');
		typeRow.createEl('span', { text: 'type:', cls: 'info-label' });
		const typeValue = typeRow.createEl('span', { cls: 'info-value' });
		typeValue.innerHTML = `${typicalNoteEmoji} ${this.currentNoteType}`;

		// Tags row
		const tagsRow = infoGrid.createDiv('info-row');
		tagsRow.createEl('span', { text: 'tags:', cls: 'info-label' });
		const tags = this.currentNote!.getProperty('tags') || [];
		tagsRow.createEl('span', {
			text: tags.length > 0 ? tags.join(', ') : 'No tags',
			cls: 'info-value'
		});
	}

	private renderUpgradeSection(container: HTMLElement): void {
		const section = container.createDiv('zettel-section');
		section.createEl('h3', { text: 'Upgrade' });

		const upgradeOptions = this.getUpgradeOptions();

		if (upgradeOptions.length === 0) {
			section.createEl('p', {
				text: 'No upgrade options available for this note type.',
				cls: 'no-options'
			});
			return;
		}

		this.createOptionCards(section, upgradeOptions, (noteMeta) => this.noteUpgrade(noteMeta));
	}

	private getUpgradeOptions(): INoteOption[] {
		const upgradePath = ConfigHelper.getNoteTypeConfig(this.currentNoteType).upgradePath;
		const upgradeOptions: INoteOption[] = [];
		upgradePath.forEach((option) => {
			const noteMetadata = ConfigHelper.getNoteTypeConfig(option);
			if (noteMetadata) {
				upgradeOptions.push({
					enabled: true,
					type: option,
					label: noteMetadata.label,
				})
			}
		})
		return this.supplementNoteOptions(upgradeOptions);
	}

	private supplementNoteOptions(noteOptions: INoteOption[]): INoteOption[] {
		noteOptions.forEach(note => {
			note.metadata = ConfigHelper.getNoteTypeConfig(note.type)
			// fetch default path
			const defaultPathMap = {
				[NoteType.FLEETING]: this.settings?.fleetingPath,
				[NoteType.LITERATURE]: this.settings?.literaturePath,
				[NoteType.PERMANENT]: this.settings?.permanentPath,
				[NoteType.ATOMIC]: this.settings?.atomicPath,
			}
			const defaultPath = defaultPathMap[note.type] || note.metadata.path;

			// Set default values if not provided
			note.emoji = note.emoji || note.metadata.emoji
			note.path = note.path || defaultPath
			note.template = note.template || 'default';
		})
		return noteOptions;

	}

	private async createNewNote(noteMetadata: INoteOption): Promise<void> {
		const noteType = noteMetadata.type;
		const notePath = noteMetadata.path
		if (!noteType) {
			this.logger.error(`Invalid note type for ${noteType}`);
			new Notice(`Failed to create note: Invalid type`, ConfigHelper.getNotificationDuration('error'));
			return;
		}
		if (!notePath) {
			this.logger.error(`Invalid note path for ${noteType}`);
			new Notice(`Failed to create note: Invalid path`, ConfigHelper.getNotificationDuration('error'));
			return;
		}
		try {
			this.logger.info(`Creating new ${noteType} note`);

			// Create note using factory
			const note = await this.factory.createFromTemplate(noteType, noteMetadata.template);
			note.setPath(notePath)
			if (!note) {
				this.logger.error(`Failed to create note of type ${noteType} from template ${noteMetadata.template}`);
				new Notice(`Failed to create note of type ${noteType}`, ConfigHelper.getNotificationDuration('error'));
				return;
			}
			// Save the note
			const file = await note.save();

			// Show success notification
			const duration = ConfigHelper.getNotificationDuration('success');
			new Notice(`Created new ${noteType} note: ${note.getTitle()}`, duration);
			this.logger.info(`Created note: ${file.path}`);

			// Open the new note if feature is enabled
			if (CONFIG.FEATURES.AUTO_OPEN_CREATED_NOTES) {
				await this.app.workspace.openLinkText(note.getTitle(), '');
			}

			// Close modal
			this.close();

		} catch (error) {
			this.logger.logError(`Failed to create ${noteType} note`, error);
		}
	}

	private async noteUpgrade(noteMetadata: INoteOption): Promise<void> {
		const noteType = noteMetadata.type;
		const notePath = noteMetadata.path
		if (!noteType) {
			this.logger.error(`Invalid note type for ${noteType}`);
			new Notice(`Failed to create note: Invalid type`, ConfigHelper.getNotificationDuration('error'));
			return;
		}
		if (!notePath) {
			this.logger.error(`Invalid note path for ${noteType}`);
			new Notice(`Failed to create note: Invalid path`, ConfigHelper.getNotificationDuration('error'));
			return;
		}
		try {
			this.logger.info(`Upgrade ${this.currentNote?.getTitle()} to ${noteType} note`);
			// Create note using factory
			const note = await this.factory.createFromTemplate(noteType, noteMetadata.template) as BaseDefault;
			note.setPath(notePath)
			note.addSourceNote(`[[${this.currentNote?.getTitle()}]]`);

			// Save the note
			const file = await note.save();

			// Show success notification
			const duration = ConfigHelper.getNotificationDuration('success');
			new Notice(`Created new ${noteType} note: ${note.getTitle()}`, duration);
			this.logger.info(`Created note: ${file.path}`);

			// Open the new note if feature is enabled
			if (CONFIG.FEATURES.AUTO_OPEN_CREATED_NOTES) {
				await this.app.workspace.openLinkText(note.getTitle(), '');
			}

			// Close modal
			this.close();


		} catch (error) {
			this.logger.logError(`Failed to upgrade ${noteType} note`, error);
		}
	}
}
