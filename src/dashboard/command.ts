import ZettelkastenPlugin from "../main";
import { App } from "obsidian";
import { NoteFactory } from "../notes";
import { Logger } from "../logger";
import { ZettelKastenModal } from "./modal";

export class ZettelkastenCommand {
	private app: App;
	private logger = Logger.createLogger("ZettelkastenCommand");
	private factory: NoteFactory;
	private plugin: ZettelkastenPlugin;

	constructor(app: App, factory: NoteFactory, plugin: ZettelkastenPlugin) {
		this.app = app;
		this.factory = factory;
		this.plugin = plugin;
	}

	/**
	 * Register the main Zettelkasten command with the plugin
	 * @param plugin - The main plugin instance
	 */
	public registerCommand(plugin: any): void {
		plugin.addCommand({
			id: "open-zettelkasten-dashboard",
			name: "Open Zettelkasten Dashboard",
			icon: "brain",
			callback: () => this.openZettelkastenModal(),
			hotkeys: [
				{
					modifiers: ["Mod", "Shift"],
					key: "z",
				},
			],
		});
	}

	/**
	 * Open the Zettelkasten modal
	 */
	private async openZettelkastenModal(): Promise<void> {
		try {
			const modal = new ZettelKastenModal(
				this.app,
				this.factory,
				this.plugin,
			);
			modal.open();

			this.logger.info("Zettelkasten modal opened");
		} catch (error) {
			this.logger.logError(
				`Failed to open Zettelkasten modal: ${error}`,
				error,
			);
		}
	}
}
