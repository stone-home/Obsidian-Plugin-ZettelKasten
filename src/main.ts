// Example integration in your main.ts file
import { Plugin, Notice } from 'obsidian';
import { Logger } from './logger';
import { NoteFactory } from './notes';
import { IntegrationManager} from "./3rd";
import { ZettelkastenSettings} from "./types";
import { ZettelkastenSettingTab } from './settings';
import { DEFAULT_SETTINGS } from "./config";
import { WeeklyKanbanCommand } from "./task";
import { ZettelkastenCommand } from "./dashboard";
import { ResearchCommands } from "./research";
import { DataviewJSManager } from "./dataview";


export default class ZettelkastenPlugin extends Plugin {
	private factory!: NoteFactory;
	private zettelkastenCommand!: ZettelkastenCommand;
	private integrationManager!: IntegrationManager;
	private dataviewJSManager!: DataviewJSManager;
	private logger = Logger.createLogger('ZettelkastenPlugin');
	public settings!: ZettelkastenSettings;

	async onload() {
		this.logger.info('Zettelkasten Plugin loaded');

		// Load Settings
		await this.loadSettings();
		await this.saveSettings()

		this.app.workspace.onLayoutReady( async () => {
			// Initialize factory
			this.factory = new NoteFactory(this.app);
			await this.factory.initialize(this.settings) // The function onLayoutReady ensures that all file index are loaded and is able to retrieve the file for templates from file system.
			// Load Settings Tab
			this.addSettingTab(new ZettelkastenSettingTab(this.app, this, this.factory))

			// Initialize Zettelkasten features
			await this.initializeZettelkastenFeatures();

			// Initialize Weekly Kanban Command
			if (this.settings.features.WEEKLY_KANBAN.enabled) {
				const weeklyKanbanCommand = new WeeklyKanbanCommand(this.app, this.settings, this.factory);
				weeklyKanbanCommand.registerCommand(this);
			}

			// initialize Research Commands
			const researchCommands = new ResearchCommands(this.app, this, this.factory);
			researchCommands.registerCommands();
		});

		// load integration manager
		this.integrationManager = IntegrationManager.getInstance(this.app);
		await this.integrationManager.initialize()

		// load Zettelkasten-Dataview Manager
		this.dataviewJSManager = new DataviewJSManager(this.app);
		await this.dataviewJSManager.onload();
		// Register markdown processor for custom syntax
		this.registerMarkdownCodeBlockProcessor('dvjs',
			(source, el, ctx) => this.processDvjsBlock(source, el, ctx)
		);


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
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	onunload() {
		console.log('Zettelkasten Plugin unloaded');
	}

	// In ZettelkastenPlugin
	private async processDvjsBlock(source: string, el: HTMLElement, ctx: any) {

		const lines = source.trim().split('\n');
		const scriptId = lines[0]; // The ID is the whole content
		if (!scriptId) return;

		// Parse parameters from remaining lines
		const params: any = {};
		lines.slice(1).forEach(line => {
			const [key, value] = line.split(/[=:]/).map(s => s.trim());
			if (key && value) {
				try {
					// Try to parse as JSON for complex values
					params[key] = JSON.parse(value);
				} catch {
					// Fallback to string
					params[key] = value.replace(/^["']|["']$/g, ''); // Remove quotes
				}
			}
		});
		// We call executeScript, not executeCode
		try {
			await this.dataviewJSManager.executeScript(scriptId, el, params);
		} catch (error) {
			new Notice(`Error executing script ${scriptId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
		}
	}
}
