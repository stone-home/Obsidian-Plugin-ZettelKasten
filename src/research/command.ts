import ZettelkastenPlugin from "../main";
import {
	App,
	Plugin,
	Editor,
	MarkdownView,
	TFile,
	Notice,
	Modal,
	Setting,
} from "obsidian";
import { ResearchDashboardModal, SearchDashboardModal } from "./modals";
import { NoteFactory } from "../notes";
import { ISearchResult } from "./types";

export class ResearchCommands {
	private app: App;
	private plugin: ZettelkastenPlugin;
	private factory: NoteFactory;
	private researchDashboard: ResearchDashboardModal;

	constructor(app: App, plugin: ZettelkastenPlugin, factory: NoteFactory) {
		this.app = app;
		this.plugin = plugin;
		this.factory = factory;
		this.researchDashboard = new ResearchDashboardModal(
			this.app,
			this.plugin,
			this.factory,
		);
	}

	// Register all commands
	registerCommands() {
		if (!this.plugin.settings.dataviewEnabled) {
			new Notice(
				`Dataview is not enabled. Please enable it in the settings to use Research Commands.`,
				5000,
			);
			throw new Error(
				"Dataview is not enabled. Please enable it in the settings to use Research Commands.",
			);
		}
		// Dashboard Commands
		this.registerDashboardCommands();
		this.registerAtomicNotesSearchCommands()
	}

	// Dashboard Commands
	private registerDashboardCommands() {
		this.plugin.addCommand({
			id: "open-research-dashboard",
			name: "Open Research Dashboard",
			icon: "layout-dashboard",
			callback: () => {
				this.researchDashboard.open()
			},
		});
	}

	private registerAtomicNotesSearchCommands() {
		this.plugin.addCommand({
			id: "open-atomic-notes-search-dashboard",
			name: "Open Atomic Notes Search",
			icon: "atom",
			callback: () => {
				new SearchDashboardModal(
					this.app,
					this.plugin,
					this.factory,
					(selectedNote) =>
						this.researchDashboard.quickSearchAndInsetNote(selectedNote),
					this.plugin.settings.atomPath,
					"Atomic Search",
				).open();
			},
		});
	}
}
