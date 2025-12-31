import {App, Component, EventRef, TAbstractFile} from "obsidian";
import {Logger} from "../logger";
import {Utils} from "../utils";
import {NoteType} from "./config";
import {BaseNote, BaseTemplate} from "./note";
import {ITemplateMetadata} from "./types";
import {
	FleetingDefaultTemplate,
	LiteratureDefaultTemplate,
	AtomicDefaultTemplate,
	PermanentDefaultTemplate
} from "./default";


export class TemplateManager extends Component {
	private app: App;
	private logger = Logger.createLogger("NoteFactory");
	private fileWatcherRef: EventRef[] = [];
	private entrypoint: string;
	private templates: Map<NoteType, Map<string, ITemplateMetadata>> =
		new Map();

	constructor(app: App, entrypoint?: string) {
		super();
		this.app = app;
		this.entrypoint = entrypoint ?? "zettelkasten templates";
	}

	public async onload() {
		super.onload();
		await this.preloadTemplates()
		await this.registerFileWatchers()
	}

	public async onunload() {
		super.onunload();
		await this.unregisterFileWatchers();
	}

	private async preloadTemplates(): Promise<void> {
		const tFolder = this.app.vault.getAbstractFileByPath(this.entrypoint);
		if (tFolder) {
			const files = this.app.vault
				.getFiles()
				.filter(
					(file) =>
						file.path.startsWith(tFolder.path) && file.extension === "md",
				).map(async file => {
					const templateNote = await this.loadTemplateFromFile(file.path)
					if (!this.isTemplate(templateNote)) {
						this.logger.debug(`Skipping non-template file: ${file.path}`);
						return;
					}
					// todo: I need to separate save template to fs and register it
					await this.registerTemplate(
						templateNote.getType(),
						templateNote.getTitle(),
						templateNote
					)
				})
		} else {
			this.logger.warn(
				`Entrypoint folder for templates not found: ${this.entrypoint}`,
			);
			await Utils.createFolder(this.app, this.entrypoint);
		}
		// todo: loop through all types and create a default template if it does not exist
	}

	// Register file watchers for auto-reload
	private async registerFileWatchers(): Promise<void> {
		this.fileWatcherRef.push(await this.createTemplateCreateWatcher());
		this.fileWatcherRef.push(await this.createTemplateRenameWatcher());
		this.fileWatcherRef.push(await this.createTemplateDeleteWatcher())

		this.fileWatcherRef.forEach((event) => {
			this.registerEvent(event);
		});
		this.logger.info(`Registered file watchers for templates`);
	}

	private async unregisterFileWatchers(): Promise<void> {
		this.fileWatcherRef.forEach((event) => {
			this.app.vault.offref(event);
		});
		this.fileWatcherRef = [];
		this.logger.info("Cleaned up file watchers for templates");
	}

	private async createTemplateCreateWatcher(): Promise<EventRef> {
		return this.app.vault.on("create", async (file) => {
			if (
				file.path.startsWith(this.entrypoint) &&
				file.path.endsWith(".md")
			) {
				const [folerPath, noteTypeValue] = this.getFolerPath(file);
				if (!folerPath || !noteTypeValue) {
					this.logger.error(
						`Invalid folder path or note type value for file: ${file.path}`,
					);
					return;
				}
				const noteType = noteTypeValue as NoteType;
				const fileName = file.name.replace(".md", "");
				const note = this.createTemplate(noteType);
				note.setTitle(fileName);
				note.setPath(folerPath);
				note.setType(noteType)
				await note.update();
				await this.registerTemplate(noteType, fileName, note).then(
					(template) => {
						if (template) {
							this.logger.info(
								`Registered new template: ${fileName} for type: ${noteType}`,
							);
						} else {
							this.logger.error(
								`Failed to register template: ${fileName} for type: ${noteType}`,
							);
						}
					},
				);
			}
		})
	}

	private async createTemplateRenameWatcher(): Promise<EventRef> {
		return this.app.vault.on("rename", async (file) => {
			if (
				file.path.startsWith(this.entrypoint) &&
				file.path.endsWith(".md")
			) {
				const [folerPath, noteTypeValue] = this.getFolerPath(file) as [string, NoteType];
				if (!folerPath || !noteTypeValue) {
					this.logger.error(
						`Invalid folder path or note type value for file: ${file.path}`,
					);
					return;
				}
				const fileName = file.name.replace(".md", "");

				const originalTemplate = await this.loadTemplateFromFile(file.path);
				const originalName = Utils.deepClone(
					originalTemplate.getTitle(),
				);

				const templateExist = this.templates
					.get(noteTypeValue)
					?.has(originalName);
				if (!templateExist) {
					this.logger.warn(
						`Template ${fileName} is a unregistered template, skipping rename event`,
					);
					return;
				}
				this.templates.get(noteTypeValue)?.delete(originalName);
				originalTemplate.setTitle(fileName);
				await originalTemplate.update();
				await this.registerTemplate(
					noteTypeValue,
					fileName,
					originalTemplate,
				).then((template) => {
					if (template) {
						this.logger.info(
							`Renamed template: ${originalName} to ${originalTemplate.getTitle()} for type: ${noteTypeValue}`,
						);
					} else {
						this.logger.error(
							`Failed to rename template: ${originalName} to ${originalTemplate.getTitle()} for type: ${noteTypeValue}`,
						);
					}
				});
			}
		})
	}

	private async createTemplateDeleteWatcher(): Promise<EventRef> {
		return this.app.vault.on("delete", (file) => {
			if (
				file.path.startsWith(this.entrypoint) &&
				file.path.endsWith(".md")
			) {
				const folerPath = file.path.split("/");
				const fileName = folerPath.pop() as string;
				const noteTypeValue = folerPath.pop() as NoteType;

				this.templates
					.get(noteTypeValue)
					?.delete(fileName.replace(".md", ""));

			}
		})
	}

	private getFolerPath(file: TAbstractFile): [string, string]| [undefined, undefined] {
		if (!file.parent) {
			return [undefined, undefined];
		}
		const folderPath = file.parent.path;
		if (folderPath === this.entrypoint) {
			this.logger.warn(
				`Since template file, ${file.name}, is stored in the entrypoint,
				nothing will be done with it.`,
			);
			// todo: originally, moving to fleeting should be a better solution,
			// todo: but creating a new note is gonna trigger another create event.
			return [undefined, undefined];
		}
		const noteType = file.parent.name
		if (Utils.getKeyByValue(NoteType, noteType) === undefined) {
			this.logger.error(
				`Invalid note type for file: ${file.path}. Expected one of: ${Object.values(NoteType).join(", ")}`,
			);
			return [undefined, undefined];
		}
		return [folderPath, noteType];
	}

	private async loadTemplateFromFile(
		filePath: string,
	): Promise<BaseTemplate> {
		return await BaseTemplate.loadFromFile(
			this.app,
			filePath,
			true
		);
	}

	/**
	 * Create a new template note of the specified type
	 */
	private createTemplate(noteType: NoteType): BaseTemplate {
		const note = new BaseTemplate(this.app, noteType);
		this.logger.info(`Created new ${noteType} note`);
		return note;
	}

	/**
	 * Get a template dir by note type
	 */
	private async templateDir(noteType: NoteType): Promise<string> {
		const dir = this.entrypoint + "/" + noteType;
		await Utils.createFolder(this.app, dir);
		return dir;
	}

	/**
	 * Check if a note is a template
	 * @param note - The note to check
	 * @returns true if the note is a template, false otherwise
	 */
	private isTemplate(note: BaseNote): boolean {
		return note.getProperties().getPropertyValue("template");
	}

	/**
	 * Register a new template into the pool of templates
	 */
	public async registerTemplate(
		noteType: NoteType,
		templateName: string,
		template: BaseNote,
	): Promise<ITemplateMetadata | undefined> {
		if (!this.templates.has(noteType)) {
			this.templates.set(noteType, new Map());
		}
		template.setPath(await this.templateDir(noteType));
		template.setTitle(templateName);
		const templateFileExists: boolean = await template.exist();
		if (!templateFileExists) {
			this.logger.info(
				`Template file does not exist, creating new template: ${templateName}`,
			);
			await template.save();
		}
		this.templates
			.get(noteType)!
			.set(templateName, { path: template.getObPath(true) });
		this.logger.debug(
			`Registered template '${templateName}' for type: ${noteType}`,
		);
		return this.templates.get(noteType)!.get(templateName);
	}

	public getAllTemplates(): Map<NoteType, Map<string, ITemplateMetadata>> {
		return this.templates;
	}

	/**
	 * Get all templates for a specific note type
	 */
	public getTemplatesForType(
		noteType: NoteType,
	): Map<string, ITemplateMetadata> | undefined {
		return this.templates.get(noteType);
	}

	/**
	 * Get a specific template
	 */
	public async getTemplate(
		noteType: NoteType,
		templateName: string,
	): Promise<BaseNote | undefined> {
		const templatePath = this.templates
			.get(noteType)
			?.get(templateName)?.path;
		if (!templatePath) {
			this.logger.debug(
				`Template '${templateName}' not found for type: ${noteType}`,
			);
			return undefined;
		}
		return this.loadTemplateFromFile(templatePath)
	}

	/**
	 * List all template names for a note type
	 */
	public listTemplates(noteType: NoteType): string[] {
		const typeTemplates = this.getTemplatesForType(noteType);
		if (!typeTemplates) return [];
		return Array.from(typeTemplates.keys());
	}
}
