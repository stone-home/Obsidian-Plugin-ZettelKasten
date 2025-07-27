import {App, Component, EventRef, TAbstractFile} from "obsidian";
import {Logger} from "../../logger";
import {Utils} from "../../utils";
import {NoteType} from "./config";
import {BaseNote} from "./note";
import {ITemplateMetadata} from "./types";
import {BaseTemplate} from "./default";


export class TemplateManager extends Component {
	private app: App;
	private logger = Logger.createLogger("NoteFactory");
	private fileWatcherRef: EventRef[] = [];
	private entrypoint: string = "zettelkasten templates";
	private templates: Map<NoteType, Map<string, ITemplateMetadata>> =
		new Map();

	constructor(app: App) {
		super();
		this.app = app;
	}

	public async onload() {
		super.onload();
		await this.registerFileWatchers()
	}

	public async onunload() {
		super.onunload();
		await this.unregisterFileWatchers();
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

				const originalTemplate = await BaseTemplate.loadFromFile(
					this.app,
					file.path,
				);
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
			throw new Error(
				`Entrypoint Data is invalid, Template Folder is a two-level folder, but parent is not defined. Entrypoint Data: ${this.entrypoint}`,
			);
		}
		const folderPath = file.parent.path;
		if (folderPath === this.entrypoint) {
			this.logger.info(
				`Skipping root directory: ${this.entrypoint}`,
			);
			return [undefined, undefined];
		}
		return [folderPath, file.parent.name]
	}

	/**
	 * Create a new template note of the specified type
	 */
	private createTemplate(noteType: NoteType): BaseNote {
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
		return note.getProperties().getPropertyValue("template") === true;
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
		return BaseTemplate.loadFromFile(this.app, templatePath);
	}

	/**
	 * List all template names for a note type
	 */
	public listTemplates(noteType: NoteType): string[] {
		const typeTemplates = this.templates.get(noteType);
		if (!typeTemplates) return [];
		return Array.from(typeTemplates.keys());
	}
}
