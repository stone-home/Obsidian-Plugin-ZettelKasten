import { App } from 'obsidian';
import { Logger } from '../logger';
import { ZettelkastenSettings } from '../types';
import { WeeklyKanbanModal } from "./modal";
import { NoteFactory} from "../notes";


export class WeeklyKanbanCommand {
	private app: App;
	private logger = Logger.createLogger('WeeklyKanbanCommand');
	private settings: ZettelkastenSettings;
	private factory: NoteFactory;


	constructor(app: App, settings: ZettelkastenSettings, factory: NoteFactory) {
		this.app = app;
		this.settings = settings;
		this.factory = factory;
	}


	/**
	 * Register the main Zettelkasten command with the plugin
	 * @param plugin - The main plugin instance
	 */
	public registerCommand(plugin: any): void {
		this.logger.debug('ZettelkastenPlugin registerCommand - Registering weekly kanban command');
		plugin.addCommand({
			id: 'open-weekly-kanban-dashboard',
			name: 'Oepn Weekly Kanban Dashboard',
			icon: 'brain',
			callback: () => new WeeklyKanbanModal(this.app, this.settings, this.factory).open(),
			hotkeys: [
				{
					modifiers: ['Mod', 'Shift'],
					key: 'k'
				}
			]
		});
	}

}
