// Example integration in your main.ts file
import { App, Plugin, Notice, addIcon } from 'obsidian';
import { Logger } from './logger';
import { ZettelkastenModal } from './zettelkasten/modal';
import { ZettelkastenCommand } from './zettelkasten/command';
import { FleetingDefaultTemplate, LiteratureDefaultTemplate, AtomicDefaultTemplate, PermanentDefaultTemplate } from './notes/default';
import { NoteType, NoteFactory } from './notes';


export default class ZettelkastenPlugin extends Plugin {
	private factory: NoteFactory;
	private zettelkastenCommand: ZettelkastenCommand;
	private logger = Logger.createLogger('ZettelkastenPlugin');

	async onload() {
		console.log('Zettelkasten Plugin loaded');

		// Initialize factory
		this.factory = new NoteFactory(this.app);

		// Register note types
		await this.registerNoteTypes();

		// Initialize Zettelkasten features
		await this.initializeZettelkastenFeatures();

		// Add additional commands and features
		this.addExtraCommands();

		// Add status bar integration
		this.addZettelkastenStatusBar();

		// Register workspace events
		this.registerZettelkastenEvents();

		new Notice('Zettelkasten Plugin loaded with dashboard!');
	}

	private async registerNoteTypes() {
		// Register note classes with factory
		this.factory.registerNoteClass(NoteType.FLEETING, FleetingDefaultTemplate);
		this.factory.registerNoteClass(NoteType.LITERATURE, LiteratureDefaultTemplate);
		this.factory.registerNoteClass(NoteType.PERMANENT, PermanentDefaultTemplate);
		this.factory.registerNoteClass(NoteType.ATOMIC, AtomicDefaultTemplate);

		// Initialize default templates
		await this.factory.initializeDefaultTemplates();

		this.logger.info('All note types registered');
	}

	private async initializeZettelkastenFeatures() {
		// Add custom icons
		this.addCustomIcons();

		// Initialize Zettelkasten command
		this.zettelkastenCommand = new ZettelkastenCommand(this.app, this.factory);
		this.zettelkastenCommand.registerCommand(this);
		this.zettelkastenCommand.registerMenuItems(this);
		this.zettelkastenCommand.registerRibbonIcon(this);

		this.logger.info('Zettelkasten features initialized');
	}

	private addCustomIcons() {
		// Main dashboard icon
		addIcon('brain', `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
			<path d="M12 2C13.1046 2 14 2.89543 14 4C14 4.74028 13.5978 5.38663 13 5.73244V7C14.1046 7 15 7.89543 15 9C15 10.1046 14.1046 11 13 11H11C9.89543 11 9 10.1046 9 9C9 7.89543 9.89543 7 11 7V5.73244C10.4022 5.38663 10 4.74028 10 4C10 2.89543 10.8954 2 12 2Z" stroke="currentColor" stroke-width="2"/>
			<path d="M9 13C9 11.8954 9.89543 11 11 11H13C14.1046 11 15 11.8954 15 13C15 14.1046 14.1046 15 13 15H11C9.89543 15 9 14.1046 9 13Z" stroke="currentColor" stroke-width="2"/>
			<path d="M7 17C7 15.8954 7.89543 15 9 15H15C16.1046 15 17 15.8954 17 17C17 18.1046 16.1046 19 15 19H9C7.89543 19 7 18.1046 7 17Z" stroke="currentColor" stroke-width="2"/>
		</svg>`);

		// Note type specific icons
		addIcon('seedling', `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
			<path d="M12 22C12 22 20 18 20 10C20 6.68629 17.3137 4 14 4C12.5 4 11.5 5 12 7C8 7 4 9 4 15C4 18 7 22 12 22Z" stroke="currentColor" stroke-width="2"/>
		</svg>`);

		addIcon('book', `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
			<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" stroke="currentColor" stroke-width="2"/>
			<path d="M6.5 2H20V22H6.5A2.5 2.5 0 0 1 4 19.5V4.5A2.5 2.5 0 0 1 6.5 2Z" stroke="currentColor" stroke-width="2"/>
		</svg>`);

		addIcon('atom', `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
			<circle cx="12" cy="12" r="1" stroke="currentColor" stroke-width="2"/>
			<path d="M20.2 20.2C21.4 19 21.4 17 20.2 15.8C19 14.6 17 14.6 15.8 15.8C14.6 17 14.6 19 15.8 20.2C17 21.4 19 21.4 20.2 20.2Z" stroke="currentColor" stroke-width="2"/>
			<path d="M3.8 3.8C5 2.6 7 2.6 8.2 3.8C9.4 5 9.4 7 8.2 8.2C7 9.4 5 9.4 3.8 8.2C2.6 7 2.6 5 3.8 3.8Z" stroke="currentColor" stroke-width="2"/>
			<path d="M8.2 15.8C7 14.6 5 14.6 3.8 15.8C2.6 17 2.6 19 3.8 20.2C5 21.4 7 21.4 8.2 20.2C9.4 19 9.4 17 8.2 15.8Z" stroke="currentColor" stroke-width="2"/>
		</svg>`);

		addIcon('landmark', `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
			<path d="M3 21H21" stroke="currentColor" stroke-width="2"/>
			<path d="M5 21V7L12 4L19 7V21" stroke="currentColor" stroke-width="2"/>
			<path d="M9 9V17" stroke="currentColor" stroke-width="2"/>
			<path d="M15 9V17" stroke="currentColor" stroke-width="2"/>
		</svg>`);
	}

	private addExtraCommands() {
		// Show vault statistics command
		this.addCommand({
			id: 'show-zettelkasten-stats',
			name: 'Show Zettelkasten Vault Statistics',
			icon: 'bar-chart',
			callback: async () => {
				await this.zettelkastenCommand.showVaultStats();
			}
		});

		// Quick search Zettelkasten notes
		this.addCommand({
			id: 'search-zettelkasten-notes',
			name: 'Search Zettelkasten Notes',
			icon: 'search',
			callback: () => {
				// Open search with Zettelkasten-specific filters
				// This could be enhanced to filter by note types
				this.app.internalPlugins.getPluginById('global-search')?.instance?.openGlobalSearch('type:');
			}
		});

		// Create note from template command
		this.addCommand({
			id: 'create-from-zettel-template',
			name: 'Create Note from Zettelkasten Template',
			icon: 'file-plus',
			callback: async () => {
				await this.showTemplateSelector();
			}
		});
	}

	private addZettelkastenStatusBar() {
		const statusBarItem = this.addStatusBarItem();
		statusBarItem.addClass('zettelkasten-status');

		// Initial setup
		this.updateStatusBar(statusBarItem);

		// Update when active file changes
		this.registerEvent(
			this.app.workspace.on('active-leaf-change', async () => {
				await this.updateStatusBar(statusBarItem);
			})
		);
	}

	private async updateStatusBar(statusBarItem: HTMLElement) {
		const activeFile = this.app.workspace.getActiveFile();

		if (!activeFile || activeFile.extension !== 'md') {
			statusBarItem.style.display = 'none';
			return;
		}

		try {
			const note = await this.factory.loadFromFile(activeFile.path);
			const noteType = note.getType();
			const emoji = this.getEmojiForType(noteType);

			statusBarItem.innerHTML = `<span title="Zettelkasten Note Type">${emoji} ${noteType}</span>`;
			statusBarItem.style.display = 'block';
			statusBarItem.style.cursor = 'pointer';

			// Click to open dashboard
			statusBarItem.onclick = () => {
				new ZettelkastenModal(this.app, this.factory).open();
			};

		} catch (error) {
			// Not a Zettelkasten note
			statusBarItem.style.display = 'none';
		}
	}

	private registerZettelkastenEvents() {
		// Auto-suggest note types for new files
		this.registerEvent(
			this.app.workspace.on('file-open', async (file) => {
				if (file && file.extension === 'md') {
					setTimeout(async () => {
						await this.checkNewFile(file);
					}, 500);
				}
			})
		);

		// Watch for file modifications to update metadata
		this.registerEvent(
			this.app.vault.on('modify', async (file) => {
				if (file instanceof TFile && file.extension === 'md') {
					await this.handleFileModification(file);
				}
			})
		);
	}

	private async checkNewFile(file: any) {
		try {
			const content = await this.app.vault.read(file);

			// Check if it's a new file without Zettelkasten metadata
			if (!content.includes('type:') && content.trim().length < 100) {
				// Show suggestion after a delay to avoid spam
				const lastSuggestion = localStorage.getItem('last-zettel-suggestion');
				const now = Date.now();

				if (!lastSuggestion || now - parseInt(lastSuggestion) > 5 * 60 * 1000) { // 5 minutes
					new Notice('💡 Tip: Use Ctrl+Shift+Z to open Zettelkasten Dashboard for structured note creation', 6000);
					localStorage.setItem('last-zettel-suggestion', now.toString());
				}
			}
		} catch (error) {
			// Ignore errors for non-readable files
		}
	}

	private async handleFileModification(file: TFile) {
		// This could be used to automatically update note metadata
		// or suggest upgrades based on content changes
		try {
			const note = await this.factory.loadFromFile(file.path);

			// Example: Auto-update last modified timestamp
			note.setProperty('last_modified', new Date().toISOString());

			// You could add more automated features here

		} catch (error) {
			// Not a Zettelkasten note, ignore
		}
	}

	private async showTemplateSelector() {
		// Create a simple template selector modal
		const modal = new class extends Modal {
			constructor(app: App, factory: NoteFactory) {
				super(app);
				this.factory = factory;
			}

			onOpen() {
				const { contentEl } = this;
				contentEl.createEl('h2', { text: 'Select Template' });

				const noteTypes = [
					{ type: NoteType.FLEETING, label: '🌱 Fleeting Note Template' },
					{ type: NoteType.LITERATURE, label: '📚 Literature Note Template' },
					{ type: NoteType.ATOMIC, label: '⚛️ Atomic Note Template' },
					{ type: NoteType.PERMANENT, label: '🏛️ Permanent Note Template' }
				];

				noteTypes.forEach(({ type, label }) => {
					const button = contentEl.createEl('button', {
						text: label,
						cls: 'template-button'
					});

					button.onclick = async () => {
						try {
							const note = await this.factory.createFromTemplate(type);
							const file = await note.save();
							new Notice(`Created note from template: ${note.getTitle()}`);
							await app.workspace.openLinkText(note.getTitle(), '');
							this.close();
						} catch (error) {
							new Notice(`Failed to create from template: ${error.message}`);
						}
					};
				});
			}
		}(this.app, this.factory);

		modal.open();
	}

	private getEmojiForType(type: NoteType): string {
		const emojiMap = {
			[NoteType.FLEETING]: '🌱',
			[NoteType.LITERATURE]: '📚',
			[NoteType.ATOMIC]: '⚛️',
			[NoteType.PERMANENT]: '🏛️',
			[NoteType.UNKNOWN]: '❓'
		};
		return emojiMap[type] || '❓';
	}

	onunload() {
		console.log('Zettelkasten Plugin unloaded');
	}
}

// Export everything for external use
export { ZettelkastenModal, ZettelkastenCommand };
export type { ZettelkastenVaultStats } from './zettelkasten/command';
