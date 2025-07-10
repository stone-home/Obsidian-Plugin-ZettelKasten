import { App, Command, Notice } from 'obsidian';
import { ZettelkastenModal } from './modal';
import { NoteFactory } from '../notes/factory';
import { Logger } from '../logger';

/**
 * Command handler for the Zettelkasten dashboard functionality
 * Integrates the ZettelkastenModal with the Obsidian command system
 */
export class ZettelkastenCommand {
	private app: App;
	private factory: NoteFactory;
	private logger = Logger.createLogger('ZettelkastenCommand');

	constructor(app: App, factory: NoteFactory) {
		this.app = app;
		this.factory = factory;
	}

	/**
	 * Register the main Zettelkasten command with the plugin
	 * @param plugin - The main plugin instance
	 */
	public registerCommand(plugin: any): void {
		plugin.addCommand({
			id: 'open-zettelkasten-dashboard',
			name: 'Open Zettelkasten Dashboard',
			icon: 'brain',
			callback: () => this.openZettelkastenModal(),
			hotkeys: [
				{
					modifiers: ['Mod', 'Shift'],
					key: 'z'
				}
			]
		});

		// Quick create commands for each note type
		plugin.addCommand({
			id: 'quick-create-fleeting',
			name: 'Quick Create Fleeting Note',
			icon: 'seedling',
			callback: () => this.quickCreateNote('fleeting')
		});

		plugin.addCommand({
			id: 'quick-create-literature',
			name: 'Quick Create Literature Note',
			icon: 'book',
			callback: () => this.quickCreateNote('literature')
		});

		plugin.addCommand({
			id: 'quick-create-atomic',
			name: 'Quick Create Atomic Note',
			icon: 'atom',
			callback: () => this.quickCreateNote('atomic')
		});

		plugin.addCommand({
			id: 'quick-create-permanent',
			name: 'Quick Create Permanent Note',
			icon: 'landmark',
			callback: () => this.quickCreateNote('permanent')
		});

		this.logger.info('Zettelkasten commands registered');
	}

	/**
	 * Register the command in various menus
	 * @param plugin - The main plugin instance
	 */
	public registerMenuItems(plugin: any): void {
		// Add to file menu
		plugin.registerEvent(
			this.app.workspace.on('file-menu', (menu: any, file: any) => {
				menu.addItem((item: any) => {
					item
						.setTitle('Zettelkasten Dashboard')
						.setIcon('brain')
						.onClick(() => this.openZettelkastenModal());
				});
			})
		);

		// Add to editor menu
		plugin.registerEvent(
			this.app.workspace.on('editor-menu', (menu: any) => {
				menu.addItem((item: any) => {
					item
						.setTitle('Zettelkasten Dashboard')
						.setIcon('brain')
						.onClick(() => this.openZettelkastenModal());
				});
			})
		);

		// Add separator and quick create options
		plugin.registerEvent(
			this.app.workspace.on('editor-menu', (menu: any) => {
				menu.addSeparator();

				menu.addItem((item: any) => {
					item
						.setTitle('New Fleeting Note')
						.setIcon('seedling')
						.onClick(() => this.quickCreateNote('fleeting'));
				});

				menu.addItem((item: any) => {
					item
						.setTitle('New Literature Note')
						.setIcon('book')
						.onClick(() => this.quickCreateNote('literature'));
				});

				menu.addItem((item: any) => {
					item
						.setTitle('New Atomic Note')
						.setIcon('atom')
						.onClick(() => this.quickCreateNote('atomic'));
				});

				menu.addItem((item: any) => {
					item
						.setTitle('New Permanent Note')
						.setIcon('landmark')
						.onClick(() => this.quickCreateNote('permanent'));
				});
			})
		);

		this.logger.info('Menu items registered');
	}

	/**
	 * Register ribbon icon for quick access
	 * @param plugin - The main plugin instance
	 */
	public registerRibbonIcon(plugin: any): void {
		plugin.addRibbonIcon('brain', 'Zettelkasten Dashboard', () => {
			this.openZettelkastenModal();
		});

		this.logger.info('Ribbon icon registered');
	}

	/**
	 * Open the Zettelkasten modal
	 */
	private async openZettelkastenModal(): Promise<void> {
		try {
			const modal = new ZettelkastenModal(this.app, this.factory);
			modal.open();

			this.logger.info('Zettelkasten modal opened');
		} catch (error) {
			this.logger.error(`Failed to open Zettelkasten modal: ${error}`);
			new Notice(`Failed to open Zettelkasten dashboard: ${error.message}`);
		}
	}

	/**
	 * Quick create a note of specific type without opening the modal
	 * @param noteType - The type of note to create
	 */
	private async quickCreateNote(noteType: string): Promise<void> {
		try {
			this.logger.info(`Quick creating ${noteType} note`);

			// Convert string to NoteType enum
			const noteTypeEnum = this.stringToNoteType(noteType);
			if (!noteTypeEnum) {
				throw new Error(`Invalid note type: ${noteType}`);
			}

			// Create note using factory
			const note = this.factory.createNote(noteTypeEnum);

			// Set default title
			const defaultTitle = `New ${this.capitalize(noteType)} Note`;
			note.setTitle(defaultTitle);

			// Save the note
			const file = await note.save();

			new Notice(`Created new ${noteType} note: ${note.getTitle()}`);
			this.logger.info(`Created note: ${file.path}`);

			// Open the new note
			await this.app.workspace.openLinkText(note.getTitle(), '');

		} catch (error) {
			this.logger.error(`Failed to create ${noteType} note: ${error}`);
			new Notice(`Failed to create ${noteType} note: ${error.message}`);
		}
	}

	/**
	 * Convert string to NoteType enum
	 */
	private stringToNoteType(noteTypeString: string): any {
		const typeMap: Record<string, any> = {
			'fleeting': 'fleeting',
			'literature': 'literature',
			'atomic': 'atomic',
			'permanent': 'permanent'
		};

		return typeMap[noteTypeString.toLowerCase()];
	}

	/**
	 * Capitalize first letter of a string
	 */
	private capitalize(str: string): string {
		return str.charAt(0).toUpperCase() + str.slice(1);
	}

	/**
	 * Check if Zettelkasten features are available
	 */
	public isAvailable(): boolean {
		try {
			return this.factory !== null && this.app !== null;
		} catch (error) {
			this.logger.error(`Error checking availability: ${error}`);
			return false;
		}
	}

	/**
	 * Get current statistics about the vault's Zettelkasten notes
	 */
	public async getVaultStats(): Promise<{
		total: number;
		byType: Record<string, number>;
		recentNotes: string[];
	}> {
		try {
			const allFiles = this.app.vault.getMarkdownFiles();
			const stats = {
				total: 0,
				byType: {
					fleeting: 0,
					literature: 0,
					atomic: 0,
					permanent: 0,
					unknown: 0
				},
				recentNotes: [] as string[]
			};

			// Analyze each markdown file
			for (const file of allFiles) {
				try {
					const note = await this.factory.loadFromFile(file.path);
					const noteType = note.getType();

					stats.total++;

					// Count by type
					if (noteType in stats.byType) {
						stats.byType[noteType]++;
					} else {
						stats.byType.unknown++;
					}

					// Add to recent notes (last 10)
					if (stats.recentNotes.length < 10) {
						stats.recentNotes.push(note.getTitle());
					}

				} catch (error) {
					// Skip files that can't be loaded as Zettelkasten notes
					this.logger.debug(`Skipping non-Zettelkasten file: ${file.path}`);
				}
			}

			this.logger.info(`Vault stats calculated: ${stats.total} total notes`);
			return stats;

		} catch (error) {
			this.logger.error(`Error calculating vault stats: ${error}`);
			return {
				total: 0,
				byType: { fleeting: 0, literature: 0, atomic: 0, permanent: 0, unknown: 0 },
				recentNotes: []
			};
		}
	}

	/**
	 * Show vault statistics in a notice
	 */
	public async showVaultStats(): Promise<void> {
		try {
			const stats = await this.getVaultStats();

			const message = `Zettelkasten Vault Stats:
Total Notes: ${stats.total}
Fleeting: ${stats.byType.fleeting}
Literature: ${stats.byType.literature}
Atomic: ${stats.byType.atomic}
Permanent: ${stats.byType.permanent}`;

			new Notice(message, 8000);

		} catch (error) {
			this.logger.error(`Error showing vault stats: ${error}`);
			new Notice('Failed to calculate vault statistics');
		}
	}
}

// Export interfaces for external use
export interface ZettelkastenVaultStats {
	total: number;
	byType: Record<string, number>;
	recentNotes: string[];
}
