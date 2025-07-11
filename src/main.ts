// Example integration in your main.ts file
import { App, Plugin, Notice, addIcon } from 'obsidian';
import { Logger } from './logger';
import { NoteType, NoteFactory, ZettelkastenCommand } from './notes';
import { IntegrationManager} from "./3rd";


export default class ZettelkastenPlugin extends Plugin {
	// @ts-ignore
	private factory: NoteFactory;
	// @ts-ignore
	private zettelkastenCommand: ZettelkastenCommand;
	// @ts-ignore
	private integrationManager: IntegrationManager;
	private logger = Logger.createLogger('ZettelkastenPlugin');

	async onload() {
		console.log('Zettelkasten Plugin loaded');

		// Initialize factory
		this.factory = new NoteFactory(this.app);
		this.factory.initializeDefaultNoteClasses()
		await this.factory.initializeDefaultTemplates();

		// load integration manager
		this.integrationManager = IntegrationManager.getInstance(this.app);
		await this.integrationManager.initialize()


		// Initialize Zettelkasten features
		await this.initializeZettelkastenFeatures();

		new Notice('Zettelkasten Plugin loaded with dashboard!');
	}

	private async initializeZettelkastenFeatures() {
		// Initialize Zettelkasten command
		this.zettelkastenCommand = new ZettelkastenCommand(this.app, this.factory);
		this.zettelkastenCommand.registerCommand(this);
		// this.zettelkastenCommand.registerMenuItems(this);
		// this.zettelkastenCommand.registerRibbonIcon(this);

		this.logger.info('Zettelkasten features initialized');
	}

	private IntegrationInitialization() {

	}

	onunload() {
		console.log('Zettelkasten Plugin unloaded');
	}
}

