import {App, TFile} from "obsidian";
import {BaseNote, Body, NoteType} from "./note";
import {Logger} from "../logger";
import {Utils} from "../utils";

/**
 * Factory class for creating and managing notes
 * Handles note creation, loading from files, and template management
 */
export class NoteFactory {
	private app: App;
	private logger = Logger.createLogger('NoteFactory');
	private noteTypeMap: Map<NoteType, new (app: App, noteType: NoteType, template?: BaseNote) => BaseNote>;
	// 改进的模板存储结构：按类型分组存储模板
	private templates: Map<NoteType, Map<string, BaseNote>> = new Map();
	// 可选：存储默认模板
	private defaultTemplates: Map<NoteType, string> = new Map();

	constructor(app: App) {
		this.app = app;
		this.noteTypeMap = new Map();
	}

	/**
	 * Register a note class for a specific note type
	 * This allows the factory to create the correct note subclass
	 */
	public registerNoteClass(
		noteType: NoteType,
		noteClass: new (app: App, noteType: NoteType, template?: BaseNote) => BaseNote
	): void {
		this.noteTypeMap.set(noteType, noteClass);
		this.logger.info(`Registered note class for type: ${noteType}`);
	}

	/**
	 * Create a new note of the specified type
	 */
	public createNote(noteType: NoteType, template?: BaseNote): BaseNote {
		const NoteClass = this.noteTypeMap.get(noteType);
		if (!NoteClass) {
			this.logger.error(`No note class registered for type: ${noteType}`);
			throw new Error(`Unknown note type: ${noteType}`);
		}

		const note = new NoteClass(this.app, noteType, template);
		this.logger.info(`Created new ${noteType} note`);
		return note;
	}

	/**
	 * Load a note from a markdown file
	 */
	public async loadFromFile(path: string): Promise<BaseNote> {
		this.logger.info(`Loading note from file: ${path}`);

		// 获取 TFile 对象
		const file = this.app.vault.getAbstractFileByPath(path);
		if (!file || !(file instanceof TFile)) {
			throw new Error(`File not found or is not a valid file: ${path}`);
		}
		// fetch the file name
		const fileName = file.name;

		// Parse and populate the note
		let note = await this.populateNoteFromContent(file);
		// Ensure file name and synchronize the value of title in frontmatter
		note.setTitle(fileName);
		// Set the save path based on file location
		const pathParts = path.split('/');
		if (pathParts.length > 1) {
			pathParts.pop(); // Remove filename
			note.setPath(pathParts.join('/'));
		}

		return note;
	}

	/**
	 * Load multiple notes from a directory
	 */
	public async loadFromDirectory(dirPath: string): Promise<BaseNote[]> {
		this.logger.info(`Loading notes from directory: ${dirPath}`);

		const notes: BaseNote[] = [];
		const files = this.app.vault.getFiles().filter(file =>
			file.path.startsWith(dirPath) && file.extension === 'md'
		);

		for (const file of files) {
			try {
				const note = await this.loadFromFile(file.path);
				notes.push(note);
			} catch (error) {
				this.logger.error(`Failed to load note from ${file.path}: ${error}`);
			}
		}

		this.logger.info(`Loaded ${notes.length} notes from ${dirPath}`);
		return notes;
	}

	/**
	 * Register a template for a specific note type
	 * @param noteType - The type of note this template is for
	 * @param templateName - Unique name for the template
	 * @param template - The template note instance
	 */
	public registerTemplate(noteType: NoteType, templateName: string, template: BaseNote): void {
		if (!this.templates.has(noteType)) {
			this.templates.set(noteType, new Map());
		}

		this.templates.get(noteType)!.set(templateName, template);
		this.logger.info(`Registered template '${templateName}' for type: ${noteType}`);
	}

	/**
	 * Set default template for a note type
	 */
	public setDefaultTemplate(noteType: NoteType, templateName: string): void {
		const typeTemplates = this.templates.get(noteType);
		if (!typeTemplates || !typeTemplates.has(templateName)) {
			throw new Error(`Template '${templateName}' not found for type: ${noteType}`);
		}

		this.defaultTemplates.set(noteType, templateName);
		this.logger.info(`Set default template '${templateName}' for type: ${noteType}`);
	}

	/**
	 * Get all templates for a specific note type
	 */
	public getTemplatesForType(noteType: NoteType): Map<string, BaseNote> | undefined {
		return this.templates.get(noteType);
	}

	/**
	 * Get a specific template
	 */
	public getTemplate(noteType: NoteType, templateName: string): BaseNote | undefined {
		return this.templates.get(noteType)?.get(templateName);
	}

	/**
	 * Get default template for a note type
	 */
	public getDefaultTemplate(noteType: NoteType): BaseNote | undefined {
		const defaultName = this.defaultTemplates.get(noteType);
		if (!defaultName) return undefined;

		return this.getTemplate(noteType, defaultName);
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
	 * Create a note from a template
	 * @param noteType - Type of note to create
	 * @param templateName - Name of the template to use (optional, uses default if not specified)
	 */
	public createFromTemplate(noteType: NoteType, templateName?: string): BaseNote {
		let template: BaseNote | undefined;

		if (templateName) {
			template = this.getTemplate(noteType, templateName);
			if (!template) {
				throw new Error(`Template '${templateName}' not found for type: ${noteType}`);
			}
		} else {
			// Use default template if no name specified
			template = this.getDefaultTemplate(noteType);
			if (!template) {
				throw new Error(`No default template set for type: ${noteType}`);
			}
		}

		return this.createNote(noteType, template);
	}

	/**
	 * Load templates from a directory
	 * Templates should have a 'template: true' property in frontmatter
	 */
	public async loadTemplatesFromDirectory(dirPath: string): Promise<void> {
		this.logger.info(`Loading templates from directory: ${dirPath}`);

		const files = this.app.vault.getFiles().filter(file =>
			file.path.startsWith(dirPath) && file.extension === 'md'
		);

		let loadedCount = 0;
		for (const file of files) {
			try {
				const content = await this.app.vault.read(file);

				// Check if it's a template
				if (this.isTemplate(content)) {
					const note = await this.loadFromFile(file.path);
					const noteType = note.getType();
					const templateName = file.basename; // or extract from frontmatter

					this.registerTemplate(noteType, templateName, note);
					loadedCount++;
				}
			} catch (error) {
				this.logger.error(`Failed to load template from ${file.path}: ${error}`);
			}
		}

		this.logger.info(`Loaded ${loadedCount} templates from ${dirPath}`);
	}

	/**
	 * Check if content represents a template
	 */
	private isTemplate(content: string): boolean {
		const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
		if (!frontmatterMatch) return false;

		const frontmatter = frontmatterMatch[1];
		return /template:\s*true/i.test(frontmatter);
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

		// Set new title and ID
		clonedNote.setTitle(newTitle);
		clonedNote.setProperty('id', Utils.generateZettelID());
		clonedNote.setProperty('create', Utils.generateDate());

		// Copy body
		sourceNote.getBody().update(clonedNote.getBody());

		return clonedNote;
	}

	/**
	 * Populate a note instance with content from a file
	 */
	private async populateNoteFromContent(note: TFile): Promise<BaseNote> {
		// Load frontmatter and content
		const cache = this.app.metadataCache.getFileCache(note);
		const frontmatter = cache!.frontmatter

		// Gather type first to create a note
		let enumKey = Utils.getKeyByValue(NoteType, frontmatter!.type)
		if (!enumKey){
			enumKey = "FLEETING";
		}
		let newNote: BaseNote = this.createNote(NoteType[enumKey]);
		const properties = newNote.getProperties();

		if (frontmatter) {
			for (const [key, propValue] of Object.entries(frontmatter)) {
				properties.setPropertyValue(key, propValue, true)
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
			const lines = bodyContent.split('\n');

			let currentSection = 'default';
			let currentHeadLevel = 1;
			let contentBuffer: string[] = [];

			for (const line of lines) {
				// Check if line is a header
				const headerMatch = line.match(/^(#+)\s+(.+)$/);

				if (headerMatch) {
					// Save previous section content if exists
					if (contentBuffer.length > 0) {
						body.addContent(contentBuffer.join('\n').trim(), currentSection, currentHeadLevel);
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
				body.addContent(contentBuffer.join('\n').trim(), currentSection, currentHeadLevel);
			}
		}

		this.logger.debug(`Parsed body with sections`);
		return body;
	}
}
