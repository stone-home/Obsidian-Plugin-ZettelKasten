import { App } from "obsidian";
import { NoteFactory } from "../../notes";
import { SearchDashboardModal } from './search';
import { AbsSearchHandler } from './searchHandlers';
import ZettelkastenPlugin from "../../main";


export class SearchHelper {
	private app: App;
	private plugin: ZettelkastenPlugin;
	private factory: NoteFactory;

	constructor(app: App, plugin: ZettelkastenPlugin, factory: NoteFactory) {
		this.app = app;
		this.plugin = plugin;
		this.factory = factory;
	}

	public async call(
		handler: AbsSearchHandler,
		targetDir?: string,
		searchTitle?: string,
		searchTags?: string[]
	): Promise<void> {
		const searchModal = new SearchDashboardModal(
			this.app,
			this.plugin,
			this.factory,
			(searchQuery) => handler.process(searchQuery),
			targetDir,
			searchTitle,
			searchTags
		)
		searchModal.open()
	}



}
