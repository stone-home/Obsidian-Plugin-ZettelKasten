// Example integration in your main.ts file
import { Plugin, Notice } from "obsidian";
import { Logger } from "./logger";
import { NoteFactory } from "./notes";
import { IntegrationManager } from "./3rd";
import { ZettelkastenSettings } from "./types";
import { ZettelkastenSettingTab } from "./settings";
import { DEFAULT_SETTINGS } from "./config";
import { WeeklyKanbanCommand } from "./task";
import { ZettelkastenCommand } from "./dashboard";
import { ResearchCommands } from "./research";
import { DataviewCommand } from "./dataview";

export default class ZettelkastenPlugin extends Plugin {
	private factory!: NoteFactory;
	private dataview!: DataviewCommand;
	private zettelkastenCommand!: ZettelkastenCommand;
	private logger = Logger.createLogger("ZettelkastenPlugin");
	public integrationManager!: IntegrationManager;
	public settings!: ZettelkastenSettings;

	async onload() {
		this.logger.info("Zettelkasten Plugin loaded");

		// Load Settings
		await this.loadSettings();
		await this.saveSettings();

		this.app.workspace.onLayoutReady(async () => {
			// Initialize factory
			this.factory = new NoteFactory(this.app);
			await this.factory.initialize(this.settings); // The function onLayoutReady ensures that all file index are loaded and is able to retrieve the file for templates from file system.
			// Load Settings Tab
			this.addSettingTab(
				new ZettelkastenSettingTab(this.app, this, this.factory),
			);

			// Initialize Zettelkasten features
			await this.initializeZettelkastenFeatures();

			// initialize Research Commands
			const researchCommands = new ResearchCommands(
				this.app,
				this,
				this.factory,
			);
			researchCommands.registerCommands();

			// Initialize Weekly Kanban Command
			if (this.settings.kanbanEnabled) {
				const weeklyKanbanCommand = new WeeklyKanbanCommand(
					this.app,
					this,
					this.factory,
				);
				weeklyKanbanCommand.registerCommand(this);
			}

			// initialize Dataview Command
			if (this.settings.dataviewEnabled) {
				this.dataview = new DataviewCommand(this.app, this);
				await this.dataview.initialize();
			}
		});

		// load integration manager
		this.integrationManager = IntegrationManager.getInstance(this.app);
		await this.integrationManager.initialize();
		new Notice("Zettelkasten Plugin loaded with dashboard!");
	}

	private async initializeZettelkastenFeatures() {
		this.zettelkastenCommand = new ZettelkastenCommand(
			this.app,
			this.factory,
			this,
		);
		this.zettelkastenCommand.registerCommand(this);
		this.logger.info("Zettelkasten features initialized");
	}

	// Method to load settings
	async loadSettings() {
		this.settings = Object.assign(
			{},
			DEFAULT_SETTINGS,
			await this.loadData(),
		);
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	onunload() {
		console.log("Zettelkasten Plugin unloaded");
		this.factory.cleanUpFileWatchers();
		this.dataview.unload();
	}
}
