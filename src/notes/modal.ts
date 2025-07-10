import {Modal, App} from "obsidian";
import {NoteType, NoteTypeData} from "./config";
import {NoteFactory} from "./factory";
import {BaseNote} from "./note";
import {Logger} from "../logger";



export class ZettelKastenModal extends Modal {
	private factory: NoteFactory;
	private currentNote: BaseNote | null = null;
	private currentNoteType: NoteType = NoteType.FLEETING;
	private logger = Logger.createLogger('ZettelkastenModal');

	constructor(app: App, factory: NoteFactory) {
		super(app);
		this.factory = factory;
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
		// if (this.currentNote) {
		// 	this.renderActiveNoteSection(contentEl);
		// 	this.renderUpgradeSection(contentEl);
		// }
	}

	private renderNewNoteSection(container: HTMLElement): void {
		const section = container.createDiv('zettel-section');
		const header = section.createDiv('section-header');
		header.createEl('h3', { text: 'New Note' });
		header.createEl('p', {
			text: 'Each selection button can directly trigger relevant event',
			cls: 'section-subtitle'
		});

		const cardsContainer = section.createDiv('note-cards-container');

		Object.entries(NoteTypeData).forEach(([key, option]) => {
			const card = cardsContainer.createDiv('note-card clickable-card');

			// Icon
			const iconDiv = card.createDiv('note-card-icon');
			iconDiv.createEl('span', { text: option.emoji, cls: 'card-emoji' });

			// Title only (no description for compact design)
			card.createEl('div', { text: option.label, cls: 'note-card-title' });

			// Make card clickable
			card.addEventListener('click', async () => {
				await this.createNewNote(key);
			});
		});
	}
}
