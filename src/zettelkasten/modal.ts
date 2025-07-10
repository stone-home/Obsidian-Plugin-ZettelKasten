import { App, Modal, Notice, TFile } from 'obsidian';
import { NoteFactory } from '../notes/factory';
import { BaseNote, NoteType } from '../notes/note';
import { Logger } from '../logger';
import { Utils } from '../utils';
import { CONFIG, ConfigHelper } from './config';
import type { NoteOption, UpgradeOption } from './types';

/**
 * Comprehensive Zettelkasten Modal for creating new notes, viewing active note info, and upgrading notes
 */
export class ZettelkastenModal extends Modal {
	private factory: NoteFactory;
	private currentNote: BaseNote | null = null;
	private currentNoteType: NoteType = NoteType.UNKNOWN;
	private logger = Logger.createLogger('ZettelkastenModal');

	private noteOptions: NoteOption[] = [
		{
			type: NoteType.FLEETING,
			label: ConfigHelper.getNoteTypeConfig(NoteType.FLEETING).label,
			emoji: ConfigHelper.getEmojiForType(NoteType.FLEETING),
			description: ConfigHelper.getNoteTypeConfig(NoteType.FLEETING).description
		},
		{
			type: NoteType.LITERATURE,
			label: ConfigHelper.getNoteTypeConfig(NoteType.LITERATURE).label,
			emoji: ConfigHelper.getEmojiForType(NoteType.LITERATURE),
			description: ConfigHelper.getNoteTypeConfig(NoteType.LITERATURE).description
		},
		{
			type: NoteType.ATOMIC,
			label: ConfigHelper.getNoteTypeConfig(NoteType.ATOMIC).label,
			emoji: ConfigHelper.getEmojiForType(NoteType.ATOMIC),
			description: ConfigHelper.getNoteTypeConfig(NoteType.ATOMIC).description
		},
		{
			type: NoteType.PERMANENT,
			label: ConfigHelper.getNoteTypeConfig(NoteType.PERMANENT).label,
			emoji: ConfigHelper.getEmojiForType(NoteType.PERMANENT),
			description: ConfigHelper.getNoteTypeConfig(NoteType.PERMANENT).description
		}
	];

	constructor(app: App, factory: NoteFactory) {
		super(app);
		this.factory = factory;
	}

	async onOpen() {
		const { contentEl } = this;
		contentEl.empty();
		contentEl.addClass('zettelkasten-modal');

		// Add inline styles to ensure they work immediately
		this.addInlineStyles();

		// Load current note if available
		await this.loadCurrentNote();

		this.renderModal();
	}

	private addInlineStyles(): void {
		// Create and inject styles directly
		const styleId = 'zettelkasten-modal-styles';
		let existingStyle = document.getElementById(styleId);

		if (existingStyle) {
			existingStyle.remove();
		}

		const style = document.createElement('style');
		style.id = styleId;

		const uiConfig = ConfigHelper.getUIConfig();

		style.textContent = `
			.zettelkasten-modal {
				max-width: ${uiConfig.MODAL.maxWidth}px !important;
				width: auto !important;
				min-width: ${uiConfig.MODAL.minWidth}px !important;
			}

			.note-cards-container {
				display: grid !important;
				grid-template-columns: repeat(${uiConfig.CARDS.NEW_NOTE.columns}, 1fr) !important;
				gap: ${uiConfig.MODAL.cardGap} !important;
				margin-top: 0.75rem !important;
			}

			.note-card {
				border: 1px solid var(--background-modifier-border) !important;
				border-radius: 4px !important;
				padding: 0.5rem 0.25rem !important;
				text-align: center !important;
				background: var(--background-primary) !important;
				transition: all ${uiConfig.ANIMATIONS.duration} ${uiConfig.ANIMATIONS.transitionEasing} !important;
				min-height: ${uiConfig.CARDS.NEW_NOTE.minHeight}px !important;
				display: flex !important;
				flex-direction: column !important;
				justify-content: center !important;
				align-items: center !important;
				cursor: pointer !important;
			}

			.note-card:hover {
				border-color: var(--interactive-accent) !important;
				background: var(--background-modifier-hover) !important;
				transform: ${uiConfig.ANIMATIONS.hoverTransform} !important;
			}

			.note-card-icon .card-emoji {
				font-size: ${uiConfig.CARDS.NEW_NOTE.iconSize} !important;
				display: block !important;
				line-height: 1 !important;
				margin-bottom: 0.25rem !important;
			}

			.note-card-title {
				font-size: ${uiConfig.CARDS.NEW_NOTE.titleSize} !important;
				font-weight: 500 !important;
				margin: 0 !important;
				color: var(--text-normal) !important;
				line-height: 1.2 !important;
			}

			.upgrade-cards-container {
				display: grid !important;
				grid-template-columns: repeat(auto-fit, minmax(${uiConfig.CARDS.UPGRADE.minWidth}px, 1fr)) !important;
				gap: 0.4rem !important;
				margin-top: 0.75rem !important;
			}

			.upgrade-card {
				border: 1px solid var(--background-modifier-border) !important;
				border-radius: 4px !important;
				padding: 0.4rem 0.2rem !important;
				text-align: center !important;
				background: var(--background-primary) !important;
				transition: all ${uiConfig.ANIMATIONS.duration} ${uiConfig.ANIMATIONS.transitionEasing} !important;
				min-height: ${uiConfig.CARDS.UPGRADE.minHeight}px !important;
				display: flex !important;
				flex-direction: column !important;
				justify-content: center !important;
				align-items: center !important;
				cursor: pointer !important;
			}

			.upgrade-card:hover {
				border-color: var(--interactive-accent) !important;
				background: var(--background-modifier-hover) !important;
				transform: ${uiConfig.ANIMATIONS.hoverTransform} !important;
			}

			.upgrade-card.selected {
				border-color: var(--interactive-accent) !important;
				background: var(--interactive-accent) !important;
				color: var(--text-on-accent) !important;
			}

			.upgrade-card.selected .upgrade-card-title {
				color: var(--text-on-accent) !important;
			}

			.upgrade-card-icon .card-emoji {
				font-size: ${uiConfig.CARDS.UPGRADE.iconSize} !important;
				display: block !important;
				line-height: 1 !important;
				margin-bottom: 0.2rem !important;
			}

			.upgrade-card-title {
				font-size: ${uiConfig.CARDS.UPGRADE.titleSize} !important;
				font-weight: 500 !important;
				margin: 0 !important;
				color: var(--text-normal) !important;
				line-height: 1.1 !important;
			}

			.zettel-section {
				margin-bottom: ${uiConfig.MODAL.sectionGap} !important;
				padding: 1rem !important;
				border: 1px solid var(--background-modifier-border) !important;
				border-radius: 6px !important;
				background: var(--background-secondary) !important;
			}
		`;

		document.head.appendChild(style);
	}

	private async loadCurrentNote(): Promise<void> {
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
		const { contentEl } = this;

		// Modal title
		contentEl.createEl('h2', {
			text: 'Zettelkasten Dashboard',
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

	private renderNewNoteSection(container: HTMLElement): void {
		const section = container.createDiv('zettel-section');
		const header = section.createDiv('section-header');
		header.createEl('h3', { text: 'New Note' });
		header.createEl('p', {
			text: 'Each selection button can directly trigger relevant event',
			cls: 'section-subtitle'
		});

		const cardsContainer = section.createDiv('note-cards-container');

		this.noteOptions.forEach(option => {
			const card = cardsContainer.createDiv('note-card clickable-card');

			// Icon
			const iconDiv = card.createDiv('note-card-icon');
			iconDiv.createEl('span', { text: option.emoji, cls: 'card-emoji' });

			// Title only (no description for compact design)
			card.createEl('div', { text: option.label, cls: 'note-card-title' });

			// Make card clickable
			card.addEventListener('click', async () => {
				await this.createNewNote(option.type);
			});
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
		const typeRow = infoGrid.createDiv('info-row');
		typeRow.createEl('span', { text: 'type:', cls: 'info-label' });
		const typeValue = typeRow.createEl('span', { cls: 'info-value' });
		const typeEmoji = ConfigHelper.getEmojiForType(this.currentNoteType);
		typeValue.innerHTML = `${typeEmoji} ${this.currentNoteType}`;

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

		const upgradeContainer = section.createDiv('upgrade-cards-container');

		upgradeOptions.forEach(option => {
			const card = upgradeContainer.createDiv('upgrade-card clickable-card');
			if (!option.enabled) {
				card.classList.remove('clickable-card');
				card.classList.add('disabled');
			}

			// Icon
			const iconDiv = card.createDiv('upgrade-card-icon');
			iconDiv.createEl('span', { text: option.emoji, cls: 'card-emoji' });

			// Title only (no description for compact design)
			card.createEl('div', { text: option.label, cls: 'upgrade-card-title' });

			if (option.enabled) {
				// Direct upgrade on click - no selection needed
				card.addEventListener('click', async () => {
					await this.performUpgrade(option.type);
				});
			}
		});
	}

	private async createNewNote(noteType: NoteType): Promise<void> {
		try {
			this.logger.info(`Creating new ${noteType} note`);

			// Create note using factory
			const note = this.factory.createNote(noteType);

			// Set default title if needed
			const defaultTitle = `New ${Utils.capitalize(noteType)} Note`;
			note.setTitle(defaultTitle);

			// Save the note
			const file = await note.save();

			// Show success notification
			const duration = ConfigHelper.getNotificationDuration('success');
			new Notice(`Created new ${noteType} note: ${note.getTitle()}`, duration);
			this.logger.info(`Created note: ${file.path}`);

			// Open the new note if feature is enabled
			if (ConfigHelper.isFeatureEnabled('AUTO_OPEN_CREATED_NOTES')) {
				await this.app.workspace.openLinkText(note.getTitle(), '');
			}

			// Close modal
			this.close();

		} catch (error) {
			this.logger.logError(`Failed to create ${noteType} note`, error);
		}
	}

	private async performUpgrade(upgradeType: NoteType): Promise<void> {
		if (!upgradeType || !this.currentNote) {
			new Notice('Unable to perform upgrade');
			return;
		}

		try {
			this.logger.info(`Starting upgrade from ${this.currentNoteType} to ${upgradeType}`);

			// Create upgraded note
			const upgradedNote = this.factory.createNote(upgradeType);

			// Copy properties and content
			const currentProperties = this.currentNote.getProperties().getProperties();
			upgradedNote.getProperties().update(currentProperties, true);
			upgradedNote.getBody().update(this.currentNote.getBody());

			// Update type and metadata
			upgradedNote.setType(upgradeType);
			upgradedNote.setProperty('id', Utils.generateZettelID());
			upgradedNote.setProperty('create', Utils.generateDate());

			// Add upgrade metadata
			this.addUpgradeMetadata(upgradedNote, upgradeType);

			// Set appropriate path
			this.setUpgradePath(upgradedNote, upgradeType);

			// Save the upgraded note
			const savedFile = await upgradedNote.save();

			// Update original note
			await this.handleOriginalNote(upgradedNote, upgradeType);

			// Show success notification
			const duration = ConfigHelper.getNotificationDuration('success');
			new Notice(`Note upgraded successfully to ${upgradeType}`, duration);
			this.logger.info(`Note upgrade completed: ${savedFile.path}`);

			// Open the new note
			await this.app.workspace.openLinkText(upgradedNote.getTitle(), '');

			this.close();

		} catch (error) {
			this.logger.logError(`Upgrade to ${upgradeType} failed`, error);
		}
	}

	private getUpgradeOptions(): UpgradeOption[] {
		const availableTypes = ConfigHelper.getUpgradeOptions(this.currentNoteType);

		return this.noteOptions
			.filter(option => availableTypes.includes(option.type))
			.map(option => ({
				type: option.type,
				label: option.label,
				emoji: option.emoji,
				description: option.description,
				enabled: true
			}));
	}

	private addUpgradeMetadata(upgradedNote: BaseNote, targetType: NoteType): void {
		const upgradeHistory = this.currentNote!.getProperty('upgrade_history') || [];
		upgradeHistory.push({
			from: this.currentNoteType,
			to: targetType,
			date: Utils.generateDate(),
			original_id: this.currentNote!.getProperty('id')
		});
		upgradedNote.setProperty('upgrade_history', upgradeHistory);
		upgradedNote.setProperty('upgraded_from', this.currentNote!.getTitle());
	}

	private setUpgradePath(upgradedNote: BaseNote, targetType: NoteType): void {
		const targetPath = ConfigHelper.getPathForType(targetType);
		if (targetPath) {
			upgradedNote.setPath(targetPath);
		}
	}

	private async handleOriginalNote(upgradedNote: BaseNote, targetType: NoteType): Promise<void> {
		const activeFile = this.app.workspace.getActiveFile();
		if (activeFile) {
			const originalContent = await this.app.vault.read(activeFile);
			const upgradeNotice = `\n\n---\n**Note Upgraded**: This note has been upgraded to [[${upgradedNote.getTitle()}]] as a ${targetType}.`;
			await this.app.vault.modify(activeFile, originalContent + upgradeNotice);
		}
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();

		// Clean up inline styles
		const styleElement = document.getElementById('zettelkasten-modal-styles');
		if (styleElement) {
			styleElement.remove();
		}
	}
}
