import { App, Command, Notice } from 'obsidian';
import { NoteFactory } from './factory';
import { Logger } from '../logger';
import {ZettelKastenModal} from "./modal";





export class ZettelkastenCommand {
	private app: App;
	private logger = Logger.createLogger('ZettelkastenCommand');
	private factory: NoteFactory;


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
	}

	/**
	 * Open the Zettelkasten modal
	 */
	private async openZettelkastenModal(): Promise<void> {
		try {
			const modal = new ZettelKastenModal(this.app, this.factory);
			modal.open();

			this.logger.info('Zettelkasten modal opened');
		} catch (error) {
			this.logger.logError(`Failed to open Zettelkasten modal: ${error}`, error);
		}
	}
}
