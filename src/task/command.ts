import ZettelkastenPlugin from "../main";
import { App } from "obsidian";
import { Logger } from "../logger";
import { ZettelkastenSettings } from "../types";
import { WeeklyKanbanModal } from "./modal";
import { NoteFactory } from "../notes";

export class WeeklyKanbanCommand {
	private app: App;
	private logger = Logger.createLogger("WeeklyKanbanCommand");
	private plugin: ZettelkastenPlugin;
	private factory: NoteFactory;

	constructor(app: App, plugin: ZettelkastenPlugin, factory: NoteFactory) {
		this.app = app;
		this.plugin = plugin;
		this.factory = factory;
	}

	/**
	 * Register the main Zettelkasten command with the plugin
	 * @param plugin - The main plugin instance
	 */
	public registerCommand(plugin: any): void {
		this.logger.debug(
			"ZettelkastenPlugin registerCommand - Registering weekly kanban command",
		);
		plugin.addCommand({
			id: "open-weekly-kanban-dashboard",
			name: "Open Weekly Kanban Dashboard",
			icon: "brain",
			callback: () =>
				new WeeklyKanbanModal(
					this.app,
					this.plugin.settings,
					this.factory,
				).open(),
		});
	}
}
