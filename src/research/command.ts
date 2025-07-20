import ZettelkastenPlugin from '../main';
import { App, Plugin, Editor, MarkdownView, TFile, Notice, Modal, Setting } from 'obsidian';
import { ResearchDashboardModal, SearchDashboardModal } from './modals';
import { NoteFactory} from "../notes";
import { ISearchResult } from "./types";


export class ResearchCommands {
	private app: App;
	private plugin: ZettelkastenPlugin;
	private factory: NoteFactory;

	constructor(app: App, plugin: ZettelkastenPlugin, factory: NoteFactory) {
		this.app = app;
		this.plugin = plugin;
		this.factory = factory;
	}

	// Register all commands
	registerCommands() {
		if (!this.plugin.settings.DataviewConfig.enabled) {
			new Notice(`Dataview is not enabled. Please enable it in the settings to use Research Commands.`, 5000);
			throw new Error("Dataview is not enabled. Please enable it in the settings to use Research Commands.");
		}
		// Dashboard Commands
		this.registerDashboardCommands();
	}

	// Dashboard Commands
	private registerDashboardCommands() {
		this.plugin.addCommand({
			id: 'open-research-dashboard',
			name: 'Open Research Dashboard',
			icon: 'layout-dashboard',
			callback: () => {
				new ResearchDashboardModal(this.app, this.plugin, this.factory).open();
			}
		});

		this.plugin.addCommand({
			id: 'open-search-dashboard',
			name: 'Open Search Dashboard',
			icon: 'search',
			callback: () => {
				new SearchDashboardModal(
					this.app,
					this.plugin,
					this.factory,
					async (selectedNote: ISearchResult | ISearchResult[]) => {
						if (!(Array.isArray(selectedNote))) {
							selectedNote = [selectedNote];
						}
						selectedNote.map((note: ISearchResult) => {
							console.error(note.name);
						})
					},
					"zotero"
				).open();
			}
		});
	}
}

