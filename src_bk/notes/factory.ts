import { App, TFile } from "obsidian";
import { BaseNote, KeyValue, IProperties, Body } from "./note";
import { Logger } from "../logger";
import { NoteType } from "../types";
import { Utils } from "../utils";

/**
 * Factory class for creating and managing notes
 * Handles note creation, loading from files, and template management
 */
export class NoteFactory {
	private app: App;
	private logger = Logger.createLogger('NoteFactory');
	// NoteTypeMap is a map storing basic note classes for each NoteType when creation a new note
	private noteTypeMap: Map<NoteType, new (app: App, noteType: string, template?: BaseNote) => BaseNote>;
	// Templates is a map of storing designed templates using to update notes created by noteTypeMap class type
	private templates: Map<NoteType, Map<string, BaseNote>> = new Map();
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
		noteClass: new (app: App, noteType: string, template?: BaseNote) => BaseNote
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

		const note = new NoteClass(this.app, noteType.valueOf(), template);
		this.logger.info(`Created new ${noteType} note`);
		return note;
	}

	/**
	 * Load a note from a markdown file
	 */
	public async loadFromFile(path: string): Promise<BaseNote> {
		this.logger.info(`Loading note from file: ${path}`);

		// Get the file from vault
		const file = this.app.vault.getAbstractFileByPath(path);
		if (!file || !(file instanceof TFile)) {
			throw new Error(`File not found or is not a valid file: ${path}`);
		}

		// Read file content
		const content = await this.app.vault.read(file);

		// Parse to determine note type
		const noteType = this.detectNoteType(content);

		// Create base note instance
		const note = this.createNote(noteType);

		// Parse and populate the note
		await this.populateNoteFromContent(note, content, path);

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
	 * Detect note type from content
	 */
	private detectNoteType(content: string): NoteType {
		const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);

		if (frontmatterMatch) {
			const frontmatter = frontmatterMatch[1];
			const typeMatch = frontmatter.match(/type:\s*(.+)/);

			if (typeMatch) {
				const typeValue = typeMatch[1].trim();
				const typeKey = Utils.getKeyByValue(NoteType, typeValue);
				if (typeKey) {
					return NoteType[typeKey];
				}
			}
		}

		// Default to FLEETING if no type found
		this.logger.warn('No note type found in file, defaulting to FLEETING');
		return NoteType.FLEETING;
	}

	/**
	 * Populate a note instance with content from a file
	 */
	private async populateNoteFromContent(note: BaseNote, content: string, path: string): Promise<void> {
		// Parse frontmatter and body
		const frontmatterRegex = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/;
		const match = content.match(frontmatterRegex);

		if (match) {
			const [, frontmatter, bodyContent] = match;

			// Parse frontmatter properties directly to IProperties format
			const parsedProperties = this.parseFrontmatter(frontmatter);

			// Update note properties using the built-in update method
			note.getProperties().update(parsedProperties, true);

			// Parse body content and update note body
			const parsedBody = this.parseBody(bodyContent);
			parsedBody.update(note.getBody());

			// Mark as not new since it's loaded from file
			note.setProperty('new', false);

		} else {
			// No frontmatter found, treat entire content as body
			this.logger.warn('No frontmatter found in file, treating entire content as body');
			const parsedBody = this.parseBody(content);
			parsedBody.update(note.getBody());
		}

		// Set the save path based on file location
		const pathParts = path.split('/');
		if (pathParts.length > 1) {
			pathParts.pop(); // Remove filename
			note.setPath(pathParts.join('/'));
		}

		this.logger.info(`Successfully populated note: ${note.getTitle()}`);
	}

	/**
	 * Parse frontmatter into key-value pairs
	 */
	private parseFrontmatter(frontmatter: string): Record<string, any> {
		const properties: Record<string, any> = {};
		const lines = frontmatter.split('\n');

		let currentKey: string | null = null;
		let currentValue: any = null;
		let inArray = false;

		for (const line of lines) {
			const trimmed = line.trim();

			if (!trimmed) continue;

			// Check if it's an array item
			if (trimmed.startsWith('- ') && currentKey && inArray) {
				if (!Array.isArray(currentValue)) {
					currentValue = [];
				}
				currentValue.push(trimmed.substring(2).trim());
				continue;
			}

			// Check if it's a key-value pair
			const colonIndex = line.indexOf(':');
			if (colonIndex > 0) {
				// Save previous key-value if exists
				if (currentKey !== null) {
					properties[currentKey] = currentValue;
				}

				currentKey = line.substring(0, colonIndex).trim();
				const valueStr = line.substring(colonIndex + 1).trim();

				// Check if value is empty (potential array)
				if (!valueStr) {
					inArray = true;
					currentValue = [];
				} else {
					inArray = false;
					// Parse value based on content
					if (valueStr === 'true' || valueStr === 'false') {
						currentValue = valueStr === 'true';
					} else if (!isNaN(Number(valueStr))) {
						currentValue = Number(valueStr);
					} else {
						currentValue = valueStr;
					}
				}
			}
		}

		// Save last key-value pair
		if (currentKey !== null) {
			properties[currentKey] = currentValue;
		}

		this.logger.debug(`Parsed properties: ${JSON.stringify(properties)}`);
		return properties;
	}

	/**
	 * Parse body content into Body object
	 */
	private parseBody(bodyContent: string): Body {
		const body = new Body();
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

		this.logger.debug(`Parsed body with sections`);
		return body;
	}

	/**
	 * Apply modifications to a note (useful for template editor)
	 */
	public applyModifications(note: BaseNote, modifications: {
		properties?: Record<string, any>,
		sections?: Array<{ name: string, content: string, level: number }>
	}): void {
		// Apply property modifications
		if (modifications.properties) {
			for (const [key, value] of Object.entries(modifications.properties)) {
				note.setProperty(key, value);
			}
		}

		// Apply body modifications
		if (modifications.sections) {
			for (const section of modifications.sections) {
				note.getBody().newSection(section.name, section.level);
				note.addBodyContent(section.content, section.name, section.level);
			}
		}

		this.logger.info('Applied modifications to note');
	}
}
