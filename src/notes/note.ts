import { App, Notice, TFile, TAbstractFile } from "obsidian";
import {
	IKeyValue,
	INoteLink,
	IProperties,
	IZettelkastenProperties,
	IBodySection,
	IBody,
} from "./types";
import { NoteType } from "./config";
import { Logger } from "../logger";
import { Utils } from "../utils";
import { IntegrationManager } from "../3rd";

export class KeyValue<T> implements IKeyValue<T> {
	private key: string;
	private value: T;

	constructor(key: string, value: T) {
		this.key = key;
		this.value = value;
	}

	public getKey(): string {
		return this.key;
	}

	public getValue(): T {
		return this.value;
	}

	public setValue(value: T): void {
		this.value = value;
	}

	public toString(): string {
		let output: string = "";
		// [TS] using different approach to format the output based on the type of value
		if (Array.isArray(this.value)) {
			if (this.value.length === 0) {
				output = `${this.key}: []\n`; // Return empty array format
			} else {
				const formattedArray = this.value
					// prevent undefined or null values in the array
					.filter((item) => item !== undefined && item !== null)
					.map((item) => `  - ${item}`)
					.join("\n");
				output = `${this.key}:\n${formattedArray}\n`;
			}
		} else {
			output = `${this.key}: ${this.value}\n`;
		}
		return output;
	}
}

export class Property {
	protected _properties: IProperties;
	protected logger = Logger.createLogger("Property");
	protected static readonly protectedKeys: string[] = ["id", "create"];

	constructor() {
		this._properties = {
			title: new KeyValue("title", ""),
			type: new KeyValue("type", ""),
			tags: new KeyValue("tags", []),
			aliases: new KeyValue("aliases", []),
		};
	}

	public update(updates: Partial<IProperties>, force: boolean = false): void {
		this.logger.debug(`Starting property update...`);
		updates = Utils.deepClone(updates);

		const isTemplate = this.getPropertyValue("template") as
			| boolean
			| undefined;
		const isUpdateTemplate =
			Object.prototype.hasOwnProperty.call(updates, "template") &&
			(updates.template as boolean | undefined);

		for (const key in updates) {
			// Check if the key exists in the provided updates object
			if (Object.prototype.hasOwnProperty.call(updates, key)) {
				const incomingKeyValue = updates[key];
				if (Property.protectedKeys.includes(key)) {
					if (isTemplate && !isUpdateTemplate) {
						if (incomingKeyValue) {
							this.setPropertyValue(
								key,
								incomingKeyValue.getValue(),
								true,
							);
						}
						continue;
					} else {
						this.logger.warn(
							`Attempted to update protected property: ${key}. This will be ignored.`,
						);
						continue;
					}
				}
				if (incomingKeyValue) {
					const valueToSet = incomingKeyValue.getValue();
					this.setPropertyValue(key, valueToSet, force);
				}
			}
		}
		this.logger.debug(`Property update finished.`);
	}

	public getProperties(): IProperties {
		this.logger.debug("Get all properties");
		return this._properties;
	}

	public add(key: string, value: any = ""): void {
		this.logger.debug(`property ${key}:${value} is added`);
		this.setPropertyValue(key, value);
	}

	public remove(key: string): void {
		if (this._properties.hasOwnProperty(key)) {
			delete this._properties[key];
			this.logger.debug(`property ${key} is removed`);
		} else {
			this.logger.warn(
				`Attempted to remove non-existing property: ${key}`,
			);
		}
	}

	public getPropertyValue<T = any>(key: string): T {
		this.logger.debug(
			`property ${key}:${this._properties[key]?.getValue()} is returned`,
		);
		return this._properties[key]?.getValue();
	}

	public setPropertyValue(
		key: string,
		value: any,
		cleanup: boolean = false,
	): void {
		if (!this._properties.hasOwnProperty(key)) {
			this._properties[key] = new KeyValue(key, value);
			this.logger.debug(`property ${key}:${value} is added`);
		} else {
			const currentValue = this._properties[key].getValue();
			if (Array.isArray(currentValue)) {
				if (cleanup) {
					this.logger.debug(`property ${key} is cleaned up`);
					currentValue.length = 0;
				}
				const valuesToAdd = Array.isArray(value) ? value : [value];
				currentValue.push(...valuesToAdd);
			} else {
				this._properties[key].setValue(value);
			}
			this.logger.debug(`property ${key}:${value} is changed`);
		}
	}

	// For all getter/setter methods, we add precise return types and parameter types
	public getTitle(): string {
		this.logger.debug("Get Property: title");
		return this.getPropertyValue("title");
	}

	public setTitle(title: string): void {
		this.logger.debug(`Set Property: title:${title}`);
		this.setPropertyValue("title", title);
	}

	public getType(): string {
		this.logger.debug("Get Property: type");
		return this.getPropertyValue("type");
	}

	public setType(type: string): void {
		this.logger.debug(`Set Property: type:${type}`);
		this.setPropertyValue("type", type);
	}

	public getTags(): string[] {
		this.logger.debug("Get Property: tags");
		return this.getPropertyValue("tags");
	}

	public addTag(tag: string | string[]): void {
		this.logger.debug(`Add Property: tags:${tag}`);
		this.setPropertyValue("tags", tag);
	}

	public getAliases(): string[] {
		this.logger.debug("Get Property: aliases");
		return this.getPropertyValue("aliases");
	}

	public addAlias(alias: string | string[]): void {
		this.logger.debug(`Add Property: aliases:${alias}`);
		this.setPropertyValue("aliases", alias);
	}

	public toString(): string {
		this.logger.debug("Generate string-form content");
		let propString = "---\n";
		for (const key in this._properties) {
			propString += this._properties[key].toString();
		}
		propString += "---\n";
		return propString;
	}
}

export class BodySection implements IBodySection {
	public title: string;
	public head_level: number = 1;
	public content: Array<string> = [];

	constructor(title: string, head_level: number = 1) {
		this.title = title;
		this.head_level = head_level;
	}

	public addContent(content: string[] | string): void {
		if (String.isString(content)) {
			content = [content]; // Convert single string to array
		}
		this.content.push(...content);
	}

	public getId(): string {
		return `${this.title.replace(/\s+/g, "-").toLowerCase()}-${this.head_level}`;
	}
}

export class Body implements IBody {
	public sections: Map<string, IBodySection> = new Map();
	private logger = Logger.createLogger("Body");

	constructor() {
		this.sections = new Map<string, IBodySection>();
	}

	public newSection(name: string, head_level: number): IBodySection {
		this.logger.debug(
			`Create new section with name: ${name} and head level: ${head_level}`,
		);
		const section = new BodySection(name, head_level);
		return this.addSection(section);
	}

	public addSection(section: IBodySection): IBodySection {
		this.logger.debug(`Add section with id ${section.getId()}`);
		this.sections.set(section.getId(), section);
		return section;
	}

	public getSectionById(id: string): IBodySection | undefined {
		this.logger.debug(`Get Section with id ${id}`);
		return this.sections.get(id) || undefined;
	}

	public getSection(
		name: string,
		head_level: number,
	): IBodySection | undefined {
		this.logger.debug(
			`Get section by name: ${name} and head level: ${head_level}`,
		);
		const section = new BodySection(name, head_level);
		return this.getSectionById(section.getId()) || undefined;
	}

	public addContent(
		content: string | string[],
		sectionName: string = "default",
		head_level: number = 1,
	): void {
		const sectionId = new BodySection(sectionName, head_level).getId();
		if (!this.sections.has(sectionId)) {
			this.newSection(sectionName, head_level);
		}
		const section = this.getSectionById(sectionId);
		if (section) {
			section.addContent(content);
		}
	}

	/* * Update the body with another Body instance.
	 * This method merges this body's content into the provided Body instance.
	 * Then, whole provided Body instance will be assigned to this body.
	 * If a section with the same name and head level exists, it appends the content.
	 * If not, it creates a new section with the given name and head level.
	 * @param body The Body instance to update from.
	 */
	public update(body: Body): void {
		for (const [sectionId, content] of body.sections) {
			if (!this.getSectionById(sectionId)) {
				this.newSection(content.title, content.head_level);
			}
			this.addContent(content.content, content.title, content.head_level);
		}
	}

	public toString(): string {
		let body: string = "";
		for (const [id, content] of this.sections) {
			if (content) {
				body += `${"#".repeat(content.head_level)} ${content.title}\n`;
				body += content.content.join("\n") + "\n";
			}
		}
		return body;
	}
}

export class NoteLink implements INoteLink {
	public targetNote: BaseNote;
	public header: IBodySection;
	public form?: "list" | "checklist";
	private app: App;
	public property: boolean = false; // Indicates if this link is a property link

	constructor(
		app: App,
		targetNote: BaseNote,
		header: IBodySection,
		form?: "list" | "checklist",
	) {
		this.app = app;
		this.targetNote = targetNote;
		this.header = header;
		this.form = form;
	}

	public enablePropertyLink(): void {
		this.property = true;
	}

	public async link(): Promise<void> {
		if (await this.targetNote.exist()) {
			const body = this.targetNote.getBody();
			const section = body.getSectionById(this.header.getId());
			this.header.content.forEach((content) => {
				const linkText = this.formatLink(content);
				section?.addContent(linkText);
			});
			await this.targetNote.update();
		}
	}

	private formatLink(content: string): string {
		const link = `[[${content}]]`;

		switch (this.form) {
			case "list":
				return `- ${link}`;
			case "checklist":
				return `- [ ] ${link}`;
			default:
				return link;
		}
	}

	private addLinkToContent(content: string, linkText: string): string {
		// Insert the link at the end of the content
		return content + "\n\n" + linkText;
	}
}

// Base class for notes, providing common properties and methods
export abstract class BaseNote {
	protected app: App;
	protected properties: Property;
	protected body: Body;
	protected linkedPages: INoteLink[] = [];
	protected savePath: string = "000-inbox";
	protected subPage: boolean = false;
	protected template?: BaseNote;
	protected noteType: NoteType;
	private logger = Logger.createLogger("BaseNote");
	private integrations: IntegrationManager;

	abstract defaultProperty(): Property;
	abstract defaultBody(): Body;

	constructor(app: App, noteType: NoteType, template?: BaseNote) {
		this.app = app;
		this.noteType = noteType;
		this.properties = this.defaultProperty();
		this.body = this.defaultBody();
		this.integrations = IntegrationManager.getInstance(this.app);
		if (template) {
			this.updateByTemplate(template, true);
		}
	}

	public updateByTemplate(
		template: BaseNote,
		keepNoteOrder: boolean = true,
	): void {
		if (keepNoteOrder) {
			this.properties.update(
				template.getProperties().getProperties(),
				false,
			);
			this.body.update(template.getBody());
			this.setTitle(""); // Clear the title to ensure the template title is not used
		} else {
			template
				.getProperties()
				.update(this.properties.getProperties(), false);
			template.getBody().update(this.getBody());

			this.properties = template.getProperties();
			this.body = template.getBody();
		}
		// Due to each template exists a field, call 'template'
		// must remove it before saving
		if (this.properties.getPropertyValue("template")) {
			this.logger.debug("Remove template property before saving");
			this.properties.remove("template");
		}
	}

	public getProperties(): Property {
		this.logger.debug("Get properties of the note");
		return this.properties;
	}

	public getBody(): Body {
		this.logger.debug("Get body of the note");
		return this.body;
	}

	public setBody(body: Body): void {
		this.logger.debug("Set body of the note");
		this.body = body;
	}

	// 基础属性操作方法
	public getTitle(): string {
		return this.properties.getTitle();
	}

	public setTitle(title: string): void {
		this.properties.setTitle(title);
	}

	public getType(): NoteType {
		let note_key = Utils.getKeyByValue(NoteType, this.properties.getType());
		if (!note_key) {
			this.logger.warn(
				`Note type ${this.properties.getType()} is not recognized, defaulting to UNKNOWN`,
			);
			note_key = "FLEETING";
		}
		return NoteType[note_key];
	}

	public setType(n_type: NoteType): void {
		this.properties.setType(n_type.valueOf());
	}

	public setPath(obDirPath: string): void {
		this.logger.debug(`The save path is changed to ${this.savePath}`);
		this.savePath = obDirPath;
	}

	public getPath(): string {
		return this.savePath;
	}

	public addTag(tag: string | string[]): void {
		const tags = Array.isArray(tag) ? tag : [tag];
		const unifiedTags = Utils.unifiedTagFormat(tags, false, true);
		this.properties.addTag(unifiedTags);
	}

	public addAlias(alias: string | string[]): void {
		const aliases = Array.isArray(alias) ? alias : [alias];
		this.properties.addAlias(aliases);
	}

	public setProperty(key: string, value: any): void {
		this.properties.setPropertyValue(key, value);
	}

	public getProperty(key: string): any {
		return this.properties.getPropertyValue(key);
	}

	public enableSubpage(): void {
		this.subPage = true;
		this.logger.debug("Subpage mode is enabled");
	}

	public disableSubpage(): void {
		this.subPage = false;
		this.logger.debug("Subpage mode is disabled");
	}

	public getObPath(extension: boolean = false): string {
		let obPath = `${this.savePath}/${this.getTitle()}`;
		if (extension) {
			obPath += ".md";
		}
		return obPath;
	}

	public addBodyContent(
		content: string | string[],
		section_name: string,
		head_level: number,
	): void {
		this.body.addContent(content, section_name, head_level);
	}

	/**
	 * Empties the body of the note, resetting it to a new Body instance.
	 * This method is useful for clearing the content of the note.
	 */
	public emptyBody(): void {
		this.logger.debug("Empty the body of the note");
		this.body = new Body();
	}

	public addLinkInstance(link: INoteLink): void {
		this.linkedPages.push(link);
	}

	public addLinkedPage(
		targetNote: BaseNote,
		header: IBodySection,
		form?: "list" | "checklist",
		property: boolean = false,
	): INoteLink {
		const link = new NoteLink(this.app, targetNote, header, form);
		if (property) {
			link.enablePropertyLink();
		}
		this.addLinkInstance(link);
		return link;
	}

	public pre_process(): void {
		this.logger.debug("Pre-process before generating content");
		// This method can be overridden in subclasses for specific pre-processing
	}

	async post_process(s_note: string): Promise<string> {
		this.logger.debug("Post-process after generating content");
		// This method can be overridden in subclasses for specific post-processing
		return s_note;
	}

	// Generate string-form content
	public async toString(): Promise<string> {
		this.logger.debug("Generate string-form content");
		this.pre_process();
		let note: string = this.properties.toString();
		note += this.body.toString();
		return this.post_process(note);
	}

	private async getTfile(
		dir: boolean = false,
	): Promise<TAbstractFile | null> {
		const path = dir ? this.getPath() : this.getObPath(true); // 确保文件路径包含扩展名
		return this.app.vault.getAbstractFileByPath(path);
	}

	// Check if the note exists in the vault
	public async exist(dir: boolean = false): Promise<boolean> {
		const path = (await this.getTfile(dir)) as TAbstractFile;
		return Utils.fileExists(this.app, path, dir);
	}

	protected async checkBeforeSave(): Promise<void> {
		this.logger.debug("Execute a Checking-before-saving");

		// check whether the directory exists
		const dirExists = await this.exist(true);
		if (!dirExists) {
			await this.app.vault.createFolder(this.getPath());
			this.logger.warn(`Dir was created, ${this.getPath()}`);
		}

		// Check whether title is empty
		if (!this.getTitle() || this.getTitle().trim() === "") {
			let title: string | null = await this.integrations
				.getTemplater()
				.getPrompt("Typing title for the note");
			this.logger.debug(
				"The note title is empty, chaneging to user input: " + title,
			);
			if (title === null) {
				// @ts-ignore
				title = "Untitled Note";
			}
			// @ts-ignore
			this.setTitle(title);
		}

		// Checking whether title is duplicated
		const fileExists = await this.exist();
		if (fileExists) {
			const randomSuffix = Math.floor(Math.random() * 100) + 1;
			this.setTitle(`${this.getTitle()} ${randomSuffix}`);
			this.logger.warn(
				`Due to duplicated filename, file name changes to ${this.getTitle()}`,
			);
		}

		// Overwrite the value of type
		this.setType(this.noteType);
	}

	public async save(): Promise<TFile> {
		this.logger.info(`Start saving note to ${this.getObPath()}`);
		await this.checkBeforeSave();
		const s_note = await this.toString();
		try {
			const file = await this.app.vault.create(
				this.getObPath(true),
				s_note,
			);
			// Execute linking operations
			await this.linkingPages();
			this.logger.debug(`Note saved: ${this.getObPath(false)}`);
			return file;
		} catch (error) {
			this.logger.logError(
				`Save ${this.getTitle()} failed: ${error}`,
				error,
			);
			throw error;
		}
	}

	public async update(): Promise<TFile> {
		this.logger.info(`Start updating note at ${this.getObPath()}`);
		const updated_note = await this.toString();
		const file = (await this.getTfile()) as TFile;
		try {
			await this.app.vault.modify(file, updated_note);
		} catch (error) {
			this.logger.logError(
				`Update ${this.getTitle()} failed: ${error}`,
				error,
			);
			throw error;
		}
		try {
			this.logger.info(
				`Updating for linking phase for ${this.getTitle()}`,
			);
			await this.linkingPages();
		} catch (error) {
			this.logger.logError(
				`Update ${this.getTitle()} failed: ${error}`,
				error,
			);
			throw error;
		}
		return file;
	}

	/**
	 * Moves an existing note to a new folder.
	 *
	 * @param {App} app The current application instance.
	 * @param {TFile} file The file of the note to move.
	 * @param {string} newFolderPath The path of the destination folder.
	 */
	async move(newFolderPath: string): Promise<void> {
		// Ensure the destination folder path doesn't end with a slash
		if (newFolderPath.endsWith("/")) {
			newFolderPath = newFolderPath.slice(0, -1);
		}

		// Check if the destination is the same as the current folder
		if (this.getPath() === newFolderPath) {
			this.logger.warn(
				`The destination folder is the same as the current folder: ${newFolderPath}`,
			);
			new Notice(
				`The destination folder is the same as the current folder: ${newFolderPath}`,
			);
			return;
		}

		const file = await this.getTfile();
		// Check if the destination folder has the same name as the current file
		this.setPath(newFolderPath);
		const targetFileExist = await this.exist(false);
		if (targetFileExist) {
			this.logger.warn(
				`A file with the same name already exists in the destination folder: ${newFolderPath}`,
			);
			new Notice(
				`A file with the same name already exists in the destination folder: ${newFolderPath}`,
			);
			return;
		}
		try {
			// The renameFile method moves the file by changing its path
			if (file) {
				await this.app.fileManager.renameFile(
					file,
					this.getObPath(true),
				);
				this.logger.info(
					`Moving file '${file.name}' to '${this.getPath()}'`,
				);
			} else {
				this.logger.warn(`File not found: ${this.getObPath(true)}`);
				new Notice(`File not found: ${this.getObPath(true)}`);
			}
		} catch (error) {
			this.logger.logError(`Error moving file: ${error}`, error);
		}
	}

	protected async linkingPages(): Promise<void> {
		this.logger.info("Start linking pages");
		for (const link of this.linkedPages) {
			await link.link(this);
		}
	}
}

// Zettelkasten Relevant Class
export class ZettelkastenProperty extends Property {
	protected logger = Logger.createLogger("ZettelkastenProperty");
	protected _properties: IZettelkastenProperties;

	constructor() {
		super();
		this._properties = {
			title: new KeyValue("title", ""),
			type: new KeyValue("type", ""),
			url: new KeyValue("url", ""),
			create: new KeyValue("create", Utils.generateDate()),
			id: new KeyValue("id", Utils.generateZettelID()),
			tags: new KeyValue("tags", []),
			aliases: new KeyValue("aliases", []),
			sources: new KeyValue("sources", []),
			new: new KeyValue("new", true),
		};
	}

	public getUrl(): string {
		this.logger.debug("Get Property: url");
		return this.getPropertyValue("url");
	}

	public setUrl(url: string): void {
		this.logger.debug(`Set Property: url:${url}`);
		this.setPropertyValue("url", url);
	}

	public addSources(sourceNote: string | string[]): void {
		this.logger.debug(`Add Property: source_notes:${sourceNote}`);
		this.setPropertyValue("sources", sourceNote);
	}

	public getSources(): string[] {
		this.logger.debug("Get Property: source_notes");
		return this.getPropertyValue("sources");
	}

	public getId(): string {
		this.logger.debug("Get Property: id");
		return this.getPropertyValue("id");
	}

	public toString(): string {
		this.logger.debug("Generate string-form content");
		if (!this.getAliases().includes(this.getId())) {
			this.addAlias(this.getId());
		}
		let propString = "---\n";
		for (const key in this._properties) {
			propString += this._properties[key].toString();
		}
		propString += "---\n";
		return propString;
	}
}

// This default note is used for supplementing mandatory fields in the Zettelkasten system
export class BaseDefault extends BaseNote {
	protected properties: ZettelkastenProperty;

	constructor(app: App, noteType: NoteType, template?: BaseNote) {
		super(app, noteType);
		this.properties = this.defaultProperty();
		if (template) {
			this.updateByTemplate(template, true);
		}
	}

	defaultBody(): Body {
		let _body: Body = new Body();
		_body.newSection("**🔗Source**", 4);
		return _body;
	}

	defaultProperty(): ZettelkastenProperty {
		return new ZettelkastenProperty();
	}

	public setUrl(url: string): void {
		this.properties.setUrl(url);
	}

	public addSourceNote(sourceNote: string): void {
		if (!this.properties.getSources().includes(sourceNote)) {
			if (!sourceNote.startsWith('"')) {
				sourceNote = '"' + sourceNote; // Ensure the source note is quoted
			}
			if (!sourceNote.endsWith('"')) {
				sourceNote += '"'; // Ensure the source note ends with a quote
			}
			this.properties.addSources(sourceNote);
		}
	}
}
