import ZettelkastenPlugin from "../main";
import {App} from "obsidian";
import {ConfirmationModal, NoteBaseV2, NoteFactory} from "../notes";
import {Logger} from "../logger";
import {ZettelKastenModal} from "./modal";
import {NoteType} from "../notes/V2/config";

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

		plugin.addCommand({
			id: "open-zettelkasten-dashboard-v2",
			name: "Open Zettelkasten Dashboard (Version 2)",
			icon: "brain",
			callback: () => {
				const model = new ConfirmationModal(this.app, "xxxxxxxxxx", async () => {
					const note = new NoteBaseV2(this.app, NoteType.FLEETING)
					note.setTitle("Zettelkasten-test");
					note.setPath("test")
					console.error(note)
					await note.save();
					console.error(`File exists: ${await note.exist()}`);
					await sleep(5000);
					note.addTag("new,");
					note.addTag("test");
					await note.update();
					console.error(note);
					await sleep(5000);
					await note.rename("zetelkasten-test-renamed");
					await sleep(5000);
					await note.move("test2")
					await sleep(5000);
					await note.delete();


				});
				model.open()
			}
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
