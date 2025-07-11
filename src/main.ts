// Example integration in your main.ts file
import { App, Plugin, Notice, addIcon } from 'obsidian';
import { Logger } from './logger';
import { NoteType, NoteFactory, ZettelkastenCommand } from './notes';
import { IntegrationManager} from "./3rd";
import { ZettelkastenSettings} from "./types";
import { ZettelkastenSettingTab } from './settings';
import { DEFAULT_SETTINGS } from "./config";


export default class ZettelkastenPlugin extends Plugin {
	// @ts-ignore
	private factory: NoteFactory;
	// @ts-ignore
	private zettelkastenCommand: ZettelkastenCommand;
	// @ts-ignore
	private integrationManager: IntegrationManager;
	private logger = Logger.createLogger('ZettelkastenPlugin');

	// @ts-ignore
	settings: ZettelkastenSettings;

	async onload() {
		this.logger.info('Zettelkasten Plugin loaded');

		// Load Settings
		await this.loadSettings();

		// Initialize factory
		this.factory = new NoteFactory(this.app);
		this.factory.updateSettings(this.settings)
		this.factory.initializeDefaultNoteClasses()
		await this.factory.initializeDefaultTemplates();

		// Load Settings Tab
		this.addSettingTab(new ZettelkastenSettingTab(this.app, this, this.factory))
		// this.factory.updateSettings(this.settings)


		// load integration manager
		this.integrationManager = IntegrationManager.getInstance(this.app);
		await this.integrationManager.initialize()


		// Initialize Zettelkasten features
		await this.initializeZettelkastenFeatures();

		new Notice('Zettelkasten Plugin loaded with dashboard!');
	}

	private async initializeZettelkastenFeatures() {
		// Initialize Zettelkasten command
		this.zettelkastenCommand = new ZettelkastenCommand(this.app, this.factory, this.settings);
		this.zettelkastenCommand.registerCommand(this);
		// this.zettelkastenCommand.registerMenuItems(this);
		// this.zettelkastenCommand.registerRibbonIcon(this);

		this.logger.info('Zettelkasten features initialized');
	}

	// Method to load settings
	async loadSettings() {
		// Load existing settings or use default ones
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	onunload() {
		console.log('Zettelkasten Plugin unloaded');
	}
}

