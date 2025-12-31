import {App} from "obsidian";
import {ConfirmationModal} from "./modal";
import {Logger} from "../logger";
import {TemplateManager} from "./template";
import ZettelkastenPlugin from "../main";

export class ZettelkastenCommand {
	private app: App;
	private logger = Logger.createLogger("ZettelkastenCommand");
	public templateManager: TemplateManager;

	constructor(app: App) {
		this.app = app;
		this.templateManager = new TemplateManager(app, "zettelkasten templates");
	}

	/**
	 * Register the main Zettelkasten command with the plugin
	 * @param plugin - The main plugin instance
	 */
	public async registerCommand(plugin: ZettelkastenPlugin): Promise<void> {
		await this.templateManager.onload()
		plugin.addCommand({
			id: "open-zettelkasten-dashboard",
			name: "Open Zettelkasten Dashboard",
			icon: "brain",
			callback: () => {
				const model = new ConfirmationModal(
					this.app,
					"Zettelkasten Dashboard",
					() => {
						this.logger.error("Zettelkasten modal opened");
					}
				)
				model.open()
			},
			hotkeys: [
				{
					modifiers: ["Mod", "Shift"],
					key: "z",
				},
			],
		});
	}

	public async onunload(): Promise<void> {
		await this.templateManager.onunload()
	}
}
