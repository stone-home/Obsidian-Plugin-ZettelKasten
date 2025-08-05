import { App, Component, EventRef, TFile } from "obsidian";
import { BaseDefault, BaseNote, Body, KeyValue } from "./note";
import {
	AtomicDefaultTemplate,
	BaseTemplate,
	FleetingDefaultTemplate,
	LiteratureDefaultTemplate,
	PermanentDefaultTemplate,
} from "./default";
import { ITemplateMetadata } from "./types";
import { NoteType } from "./config";
import { INoteOption, ZettelkastenSettings } from "../types";
import { Logger } from "../logger";
import { Utils } from "../utils";

/**
 * Factory class for creating and managing notes
 * Handles note creation, loading from files, and template management
 */
export class NoteFactory extends Component {
	private app: App;
	private logger = Logger.createLogger("NoteFactory");
	private fileWatcherRef: EventRef[] = [];
	// The value should be fetch from settings, but for now we use a default value
	private defaultTemplateName: string = "default";
	private defaultTemplatesDir: string = "900-templates"; // todo: make this configurable in settings
	private noteTypeMap: Map<
		NoteType,
		new (app: App, noteType: NoteType, template?: BaseNote) => BaseNote
	>;
	// The templates are stored in a Map where the key is the NoteType
	private templates: Map<NoteType, Map<string, ITemplateMetadata>> =
		new Map();
	// Default templates for each note type
	private defaultTemplates: Map<NoteType, string> = new Map();

	constructor(app: App) {
		super();
		this.app = app;
		this.noteTypeMap = new Map();
	}

	public updateSettings(settings: ZettelkastenSettings): void {
		this.defaultTemplatesDir = settings.templateDirPath;
	}

	public factorReset(): void {
		this.defaultTemplateName = "default";
		this.defaultTemplatesDir = "900-templates"; // todo: make this configurable in settings
		this.noteTypeMap = new Map();
		// The templates are stored in a Map where the key is the NoteType
		this.templates = new Map();
		// Default templates for each note type
		this.defaultTemplates = new Map();
	}

	public async initialize(settings: ZettelkastenSettings): Promise<void> {
		this.logger.info("Update default templates directory from settings");
		this.defaultTemplatesDir = settings.templateDirPath;

		this.logger.info("Initializing default note classes");
		this.registerNoteClass(NoteType.FLEETING, BaseDefault);
		this.registerNoteClass(NoteType.LITERATURE, BaseDefault);
		this.registerNoteClass(NoteType.ATOMIC, BaseDefault);
		this.registerNoteClass(NoteType.PERMANENT, BaseDefault);

		this.logger.info("Initializing default templates");
		await this.initializeDefaultTemplates(settings);

		this.logger.info("Initializing file watchers for templates");
		this.registerFileWatchers();
	}

	private async initializeDefaultTemplates(
		settings: ZettelkastenSettings,
	): Promise<void> {
		await this.refreshAllTemplates();
		for (const type of Object.values(NoteType)) {
			let defaultTemplateName: string = settings.default[type];
			const isTemplateExist = await this.getTemplate(
				type,
				defaultTemplateName,
			);
			if (!isTemplateExist) {
				defaultTemplateName = this.defaultTemplateName;
				const isTemplateExist = await this.getTemplate(
					type,
					defaultTemplateName,
				);
				if (!isTemplateExist) {
					const defaultTemplates = this.defaultTemplatesClass();
					await this.registerTemplate(
						type,
						defaultTemplateName,
						new defaultTemplates[type](this.app, type),
					);
				}
			}
			this.setDefaultTemplate(type, defaultTemplateName);
		}
	}

	private defaultTemplatesClass(): Record<
		NoteType,
		new (app: App, noteType: NoteType) => BaseTemplate
	> {
		return {
			[NoteType.FLEETING]: FleetingDefaultTemplate,
			[NoteType.LITERATURE]: LiteratureDefaultTemplate,
			[NoteType.ATOMIC]: AtomicDefaultTemplate,
			[NoteType.PERMANENT]: PermanentDefaultTemplate,
		};
	}

	// Register file watchers for auto-reload
	private registerFileWatchers(): void {
		this.fileWatcherRef.push(
			this.app.vault.on("create", async (file) => {
				if (
					file.path.startsWith(this.defaultTemplatesDir) &&
					file.path.endsWith(".md")
				) {
					if (!file.parent) {
						throw new Error(
							`Entrypoint Data is invalid, Template Folder is a two-level folder, but parent is not defined. Entrypoint Data: ${this.defaultTemplates}`,
						);
					}
					const folerPath = file.parent.path;
					if (folerPath === this.defaultTemplatesDir) {
						this.logger.info(
							`Skipping root directory: ${this.defaultTemplatesDir}`,
						);
						return; // Skip root directory
					}

					const noteTypeValue = file.parent.name;
					const noteTypeKey = Utils.getKeyByValue(
						NoteType,
						noteTypeValue,
					);
					if (!noteTypeKey) {
						this.logger.error(
							`Unknown note type: ${noteTypeValue} for file: ${file.path}`,
						);
						return;
					}
					const noteType = NoteType[noteTypeKey];
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
			}),
		);

		this.fileWatcherRef.push(
			this.app.vault.on("rename", async (file) => {
				if (
					file.path.startsWith(this.defaultTemplatesDir) &&
					file.path.endsWith(".md")
				) {
					if (!file.parent) {
						throw new Error(
							`Entrypoint Data is invalid, Template Folder is a two-level folder, but parent is not defined. Entrypoint Data: ${this.defaultTemplates}`,
						);
					}
					const folerPath = file.parent.path;
					if (folerPath === this.defaultTemplatesDir) {
						this.logger.info(
							`Skipping root directory: ${this.defaultTemplatesDir}`,
						);
						return; // Skip root directory
					}

					const noteTypeValue = file.parent.name as NoteType;
					const fileName = file.name.replace(".md", "");

					const originalTemplate = await this.loadFromFile(
						file.path,
						true,
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
			}),
		);

		this.fileWatcherRef.push(
			this.app.vault.on("delete", (file) => {
				if (
					file.path.startsWith(this.defaultTemplatesDir) &&
					file.path.endsWith(".md")
				) {
					const folerPath = file.path.split("/");
					const fileName = folerPath.pop() as string;
					const noteTypeValue = folerPath.pop() as NoteType;

					this.templates
						.get(noteTypeValue)
						?.delete(fileName.replace(".md", ""));
				}
			}),
		);

		this.fileWatcherRef.forEach((event) => {
			this.registerEvent(event);
		});
	}

	public cleanUpFileWatchers(): void {
		this.fileWatcherRef.forEach((event) => {
			this.app.vault.offref(event);
		});
		this.fileWatcherRef = [];
		this.logger.info("Cleaned up file watchers for templates");
		this.logger.info("NoteFactory cleaned up");
	}

	/**
	 * Register a note class for a specific note type
	 * This allows the factory to create the correct note subclass
	 */
	public registerNoteClass(
		noteType: NoteType,
		noteClass: new (
			app: App,
			noteType: NoteType,
			template?: BaseNote,
		) => BaseNote,
	): void {
		this.noteTypeMap.set(noteType, noteClass);
		this.logger.info(`Registered note class for type: ${noteType}`);
	}

	/**
	 * Create a new note of the specified type
	 */
	public createNote(noteType: NoteType, template?: BaseNote): BaseNote {
		this.logger.info(
			`Creating new note of type: ${noteType} with template: ${template?.getTitle() || "none"}`,
		);
		const NoteClass = this.noteTypeMap.get(noteType);

		if (!NoteClass) {
			this.logger.error(`No note class registered for type: ${noteType}`);
			throw new Error(`Unknown note type: ${noteType}`);
		}
		return new NoteClass(this.app, noteType, template);
	}

	/**
	 * Create a new template note of the specified type
	 */
	public createTemplate(noteType: NoteType): BaseNote {
		const note = new BaseTemplate(this.app, noteType);
		this.logger.info(`Created new ${noteType} note`);
		return note;
	}

	/**
	 * Load a note from a markdown file
	 */
	public async loadFromFile(
		path: string,
		keepOriginalName: boolean = false,
		isTemplate: boolean = true,
	): Promise<BaseNote> {
		this.logger.debug(`Loading note from file: ${path}`);

		// obtain TFile object from the path
		const file = this.app.vault.getAbstractFileByPath(path);
		if (!file || !(file instanceof TFile)) {
			throw new Error(`File not found or is not a valid file: ${path}`);
		}
		// fetch the file name
		const fileName = file.basename;

		// Parse and populate the note
		let note = await this.populateNoteFromContent(file, isTemplate);
		// Ensure file name and synchronize the value of title in frontmatter
		if (!keepOriginalName) {
			note.setTitle(fileName);
		}
		// Set the save path based on file location
		const pathParts = path.split("/");
		if (pathParts.length > 1) {
			pathParts.pop(); // Remove filename
			note.setPath(pathParts.join("/"));
		}

		return note;
	}

	/**
	 * Load multiple notes from a directory
	 */
	public async loadFromDirectory(dirPath: string): Promise<BaseNote[]> {
		const notes: BaseNote[] = [];
		const files = this.app.vault
			.getFiles()
			.filter(
				(file) =>
					file.path.startsWith(dirPath) && file.extension === "md",
			);

		for (const file of files) {
			try {
				const note = await this.loadFromFile(file.path);
				notes.push(note);
			} catch (error) {
				this.logger.error(
					`Failed to load note from ${file.path}: ${error}`,
				);
			}
		}

		this.logger.debug(`Loaded ${notes.length} notes from ${dirPath}`);
		return notes;
	}

	/**
	 * Populate a note instance with content from a file
	 */
	private async populateNoteFromContent(note: TFile, isTemplate: boolean = true): Promise<BaseTemplate | BaseDefault> {
		this.logger.debug(
			`Loading notes from file: ${note.basename} and populate it`,
		);
		// Load frontmatter and content
		const cache = this.app.metadataCache.getFileCache(note);
		const frontmatter = cache!.frontmatter;

		// Gather type first to create a note
		let enumKey = Utils.getKeyByValue(NoteType, frontmatter!.type);
		if (!enumKey) {
			enumKey = "FLEETING";
		}
		let newNote: BaseTemplate | BaseDefault;
		if (isTemplate) {
			newNote = this.createTemplate(NoteType[enumKey]);
		} else {
			// If not a template, create a default note
			newNote = this.createNote(NoteType[enumKey]);
		}
		const properties = newNote.getProperties();

		if (frontmatter) {
			for (const [key, propValue] of Object.entries(frontmatter)) {
				properties.setPropertyValue(key, propValue, true);
			}
		}
		const body: Body = await this.parseBody(note);
		newNote.getBody().update(body);
		return newNote;
	}

	/**
	 * Parse body content into Body object
	 */
	private async parseBody(note: TFile): Promise<Body> {
		const content = await this.app.vault.read(note);
		const frontmatterRegex = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/;
		const match = content.match(frontmatterRegex);
		const body = new Body();

		if (match) {
			const [, frontmatter, bodyContent] = match;
			const lines = bodyContent.split("\n");

			let currentSection = "default";
			let currentHeadLevel = 1;
			let contentBuffer: string[] = [];

			for (const line of lines) {
				// Check if line is a header
				const headerMatch = line.match(/^(#+)\s+(.+)$/);

				if (headerMatch) {
					// Save previous section content if exists
					if (contentBuffer.length > 0) {
						body.addContent(
							contentBuffer.join("\n").trim(),
							currentSection,
							currentHeadLevel,
						);
						contentBuffer = [];
					}

					// Update current section
					currentHeadLevel = headerMatch[1].length;
					currentSection = headerMatch[2].trim();

					// Create new section
					body.newSection(currentSection, currentHeadLevel);
				} else {
					// Add line to content buffer (skip empty lines at the beginning)
					if (line.trim() || contentBuffer.length > 0) {
						contentBuffer.push(line);
					}
				}
			}

			// Save remaining content
			if (contentBuffer.length > 0) {
				body.addContent(
					contentBuffer.join("\n").trim(),
					currentSection,
					currentHeadLevel,
				);
			}
		}

		this.logger.debug(`Parsed body with sections`);
		return body;
	}

	/**
	 * Clone an existing note
	 */
	public cloneNote(sourceNote: BaseNote, newTitle: string): BaseNote {
		const noteType = sourceNote.getType();
		const clonedNote = this.createNote(noteType);

		// Copy properties
		const sourceProps = sourceNote.getProperties().getProperties();
		clonedNote.getProperties().update(sourceProps, true);

		// Copy body
		sourceNote.getBody().update(clonedNote.getBody());

		// Set new title and ID
		clonedNote.setTitle(newTitle);
		clonedNote.setProperty("id", Utils.generateZettelID());
		clonedNote.setProperty("create", Utils.generateDate());

		return clonedNote;
	}

	/**
	 * Register a template for a specific note type
	 * @param noteType - The type of note this template is for
	 * @param templateName - Unique name for the template
	 * @param template - The template note instance
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
		return this.loadFromFile(templatePath);
	}

	/**
	 * Refresh all types of templates from the filesystem
	 */
	public async refreshAllTemplates(): Promise<void> {
		for (const noteType of Object.keys(NoteType)) {
			await this.refreshTemplates(
				NoteType[noteType as keyof typeof NoteType] as NoteType,
			);
		}
	}

	/**
	 * Refresh templates from the filesystem
	 */
	public async refreshTemplates(noteType: NoteType): Promise<void> {
		this.logger.debug(`Refereshing templates for note type: ${noteType}`);
		const templates = await this.loadFromDirectory(
			await this.templateDir(noteType),
		);
		for (const template of templates) {
			if (!this.isTemplate(template)) {
				this.logger.warn(
					`Skipping non-template note: ${template.getTitle()}`,
				);
				return;
			}
			const isTemplateExist = await this.getTemplate(
				noteType,
				template.getTitle(),
			);
			if (isTemplateExist === undefined) {
				await this.registerTemplate(
					noteType,
					template.getTitle(),
					template,
				);
			}
		}
	}

	/**
	 * List all template names for a note type
	 */
	public listTemplates(noteType: NoteType): string[] {
		const typeTemplates = this.templates.get(noteType);
		if (!typeTemplates) return [];
		return Array.from(typeTemplates.keys());
	}

	/**
	 * Get a template dir by note type
	 */
	private async templateDir(noteType: NoteType): Promise<string> {
		const dir = this.defaultTemplatesDir + "/" + noteType;
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
	 * Set default template for a note type
	 */
	public setDefaultTemplate(noteType: NoteType, templateName: string): void {
		const typeTemplates = this.templates.get(noteType);
		if (!typeTemplates || !typeTemplates.has(templateName)) {
			throw new Error(
				`Template '${templateName}' not found for type: ${noteType}`,
			);
		}
		this.defaultTemplates.set(noteType, templateName);
		this.logger.info(
			`Set default template '${templateName}' for type: ${noteType}`,
		);
	}

	/**
	 * Get default template for a note type
	 */
	public getDefaultTemplate(noteType: NoteType): string {
		const defaultTemplate = this.defaultTemplates.get(noteType);
		if (!defaultTemplate) {
			this.logger.error(`No default template set for type: ${noteType}`);
			throw new Error(`No default template set for type: ${noteType}`);
		}
		return defaultTemplate;
	}

	/**
	 * Create a note from a template
	 * @param noteType - Type of note to create
	 * @param templateName - Name of the template to use (optional, uses default if not specified)
	 */
	public async createFromTemplate(
		noteType: NoteType,
		templateName?: string,
	): Promise<BaseNote> {
		let template: BaseNote | undefined;
		if (!templateName) {
			templateName = this.getDefaultTemplate(noteType);
		}
		template = await this.getTemplate(noteType, templateName);
		if (!template) {
			this.logger.error(
				`Template '${templateName}' not found for type: ${noteType}`,
			);
			throw new Error(
				`Template '${templateName}' not found for type: ${noteType}`,
			);
		}
		this.logger.info(
			`Creating new note of type: ${noteType} from template: ${templateName || undefined}`,
		);
		return this.createNote(noteType, template);
	}

	public async createNoteCard(
		filename: string,
		noteCard: INoteOption,
	): Promise<BaseNote> {
		const copiedNoteCard = Utils.deepClone(noteCard);
		const note = await this.createFromTemplate(
			copiedNoteCard.type,
			copiedNoteCard.template,
		);

		// Set the path for the new note, ensure prefix is used in a proper way
		const prefix = copiedNoteCard.extraInfo?.prefix || Utils.generateDate();
		if (prefix == undefined) {
			note.setTitle(filename);
		} else {
			note.setTitle(`${prefix} - ${filename}`);
		}
		if (!copiedNoteCard.path) {
			throw new Error(
				`Path is not defined for note card: ${filename} with type ${copiedNoteCard.type}`,
			);
		}
		note.setPath(copiedNoteCard.path);

		// Process extra properties and other metadata
		const extraTags = copiedNoteCard.extraInfo?.tags || [];
		extraTags.forEach((tag) => {
			note.addTag(tag);
		});
		const extraProperties = copiedNoteCard.extraInfo?.properties || [];
		extraProperties.forEach((property) => {
			if (property instanceof KeyValue) {
				note.setProperty(property.getKey(), property.getValue());
			}
		});

		if (copiedNoteCard.openAfterCreation) {
			await this.app.workspace.openLinkText(note.getTitle(), "", false, {
				state: { mode: copiedNoteCard.openMode ?? "source" },
			});
		}

		return note;
	}
}
