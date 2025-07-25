import ZettelkastenPlugin from "../main";
import { App, Notice } from "obsidian";
import { DataviewJSManager } from "./manager";

export class DataviewCommand {
	private app: App;
	private plugin: ZettelkastenPlugin;
	private dataviewManager: DataviewJSManager;

	constructor(app: App, plugin: ZettelkastenPlugin) {
		this.app = app;
		this.plugin = plugin;
		this.dataviewManager = new DataviewJSManager(
			this.app,
			this.plugin.settings.dataviewQueryPath,
		);
	}

	public async initialize(): Promise<void> {
		await this.dataviewManager.onload();
		this.registerCodeBlockProcessor();
	}

	private registerCodeBlockProcessor(): void {
		this.plugin.registerMarkdownCodeBlockProcessor(
			this.plugin.settings.dataviewCodeBlockType,
			(source, el, ctx) => this.processDvjsBlock(source, el, ctx),
		);
	}

	public unload(): void {
		this.dataviewManager.cleanUpFileWatchers();
	}

	// In ZettelkastenPlugin
	private async processDvjsBlock(source: string, el: HTMLElement, ctx: any) {
		const lines = source.trim().split("\n");
		const scriptId = lines[0]; // The ID is the whole content
		if (!scriptId) return;

		// Parse parameters from remaining lines
		const params: any = {};
		lines.slice(1).forEach((line) => {
			const [key, value] = line.split(/[=:]/).map((s) => s.trim());
			if (key && value) {
				try {
					// Try to parse as JSON for complex values
					params[key] = JSON.parse(value);
				} catch {
					// Fallback to string
					params[key] = value.replace(/^["']|["']$/g, ""); // Remove quotes
				}
			}
		});
		// We call executeScript, not executeCode
		try {
			await this.dataviewManager.executeScript(scriptId, el, params, ctx);
		} catch (error) {
			new Notice(
				`Error executing script ${scriptId}: ${error instanceof Error ? error.message : "Unknown error"}`,
			);
		}
	}
}
