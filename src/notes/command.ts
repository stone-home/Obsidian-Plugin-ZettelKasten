import { App } from 'obsidian';
import { NoteFactory } from './factory';
import { Logger } from '../logger';
import {ZettelKastenModal} from "./modal";
import { ZettelkastenSettings } from '../types';





export class ZettelkastenCommand {
	private app: App;
	private logger = Logger.createLogger('ZettelkastenCommand');
	private factory: NoteFactory;
	private settings: ZettelkastenSettings | undefined;


	constructor(app: App, factory: NoteFactory, settings?: ZettelkastenSettings) {
		this.app = app;
		this.factory = factory;
		this.settings = settings
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
			const modal = new ZettelKastenModal(this.app, this.factory, this.settings);
			modal.open();

			this.logger.info('Zettelkasten modal opened');
		} catch (error) {
			this.logger.logError(`Failed to open Zettelkasten modal: ${error}`, error);
		}
	}
}
