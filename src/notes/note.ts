import {App, TFile, TFolder} from "obsidian";
import {Logger} from '../logger';
import {Utils} from "../utils";
import { IntegrationManager} from "../3rd";
import {INoteLink, IKeyValue, IProperties, IZettelkastenProperties} from "./types";
import {NoteType} from "./config";

export class KeyValue<T> implements IKeyValue<T>{
	private key: string;
	private value: T;

	constructor(key: string, value: T) {
		this.key = key;
		this.value = value;
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
			if (this.value.length === 0){
				output = `${this.key}: []\n`; // Return empty array format
			} else {
				const formattedArray = this.value.map(item => `  - ${item}`).join('\n');
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
	protected logger = Logger.createLogger('Property');
	private static readonly protectedKeys: string[] = ['id', 'create'];

	constructor() {
		this._properties = {
			"title": new KeyValue("title", ""),
			"type": new KeyValue("type", ""),
			"tags": new KeyValue("tags", []),
			"aliases": new KeyValue("aliases", []),
		};
	}

	public update(updates: Partial<IProperties>, force: boolean = false): void {
		this.logger.info(`Starting property update...`);

		for (const key in updates) {
			// Check if the key exists in the provided updates object
			if (Object.prototype.hasOwnProperty.call(updates, key)) {

				if (Property.protectedKeys.includes(key) && !force) {
					this.logger.warn(`Attempted to update protected property '${key}' without 'force=true'. Skipping.`);
					continue;
				}

				const incomingKeyValue = updates[key];
				if (incomingKeyValue) {
					const valueToSet = incomingKeyValue.getValue();
					this.setPropertyValue(key, valueToSet, false);
				}
			}
		}
		this.logger.info(`Property update finished.`);
	}

	public getProperties(): IProperties {
		this.logger.debug("Get all properties");
		return this._properties;
	}

	public add(key: string, value: any = ""): void {
		this.logger.info(`property ${key}:${value} is added`);
		this.setPropertyValue(key, value);
	}

	public remove(key: string): void {
		if (this._properties.hasOwnProperty(key)) {
			delete this._properties[key];
			this.logger.info(`property ${key} is removed`);
		} else {
			this.logger.warn(`Attempted to remove non-existing property: ${key}`);
		}
	}

	public getPropertyValue<T = any>(key: string): T {
		this.logger.debug(`property ${key}:${this._properties[key]?.getValue()} is returned`);
		return this._properties[key]?.getValue();
	}

	public setPropertyValue(key: string, value: any, cleanup: boolean = false): void {
		if (!this._properties.hasOwnProperty(key)) {
			this._properties[key] = new KeyValue(key, value);
			this.logger.info(`property ${key}:${value} is added`);
		} else {
			const currentValue = this._properties[key].getValue();
			if (Array.isArray(currentValue)) {
				if (cleanup) {
					this.logger.info(`property ${key} is cleaned up`);
					currentValue.length = 0;
				}
				const valuesToAdd = Array.isArray(value) ? value : [value];
				currentValue.push(...valuesToAdd);
			} else {
				this._properties[key].setValue(value);
			}
			this.logger.info(`property ${key}:${value} is changed`);
		}
	}

	// For all getter/setter methods, we add precise return types and parameter types
	public getTitle(): string {
		this.logger.debug("Get Property: title");
		return this.getPropertyValue("title");
	}

	public setTitle(title: string): void {
		this.logger.info(`Set Property: title:${title}`);
		this.setPropertyValue("title", title);
	}

	public getType(): string {
		this.logger.debug("Get Property: type");
		return this.getPropertyValue("type");
	}

	public setType(type: string): void {
		this.logger.info(`Set Property: type:${type}`);
		this.setPropertyValue("type", type);
	}

	public getTags(): string[] {
		this.logger.debug("Get Property: tags");
		return this.getPropertyValue("tags");
	}

	public addTag(tag: string | string[]): void {
		this.logger.info(`Add Property: tags:${tag}`);
		this.setPropertyValue("tags", tag);
	}

	public getAliases(): string[] {
		this.logger.debug("Get Property: aliases");
		return this.getPropertyValue("aliases");
	}

	public addAlias(alias: string | string[]): void {
		this.logger.info(`Add Property: aliases:${alias}`);
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

class BodySection {
	public head_level: number = 1;
	public content: Array<string> = [];

	constructor(head_level: number = 1) {
		this.head_level = head_level;
	}

	public addContent(content: string): void {
		this.content.push(content);
	}
}

export class Body {
	private sections: Map<string, BodySection> = new Map();

	public newSection(name: string, head_level: number): void {
		this.sections.set(name, new BodySection(head_level));
	}

	public addContent(content: string, sectionName: string = "default", head_level: number = 1): void {
		if (!this.sections.has(sectionName)) {
			this.newSection(sectionName, head_level);
		}
		this.sections.get(sectionName)!.addContent(content);
	}

	/* * Update the body with another Body instance.
	 * This method merges this body's content into the provided Body instance.
	 * Then, whole provided Body instance will be assigned to this body.
	 * If a section with the same name and head level exists, it appends the content.
	 * If not, it creates a new section with the given name and head level.
	 * @param body The Body instance to update from.
	 */
	public update(body: Body): void {
		for (const [name, content] of this.sections) {
			if (body.sections.has(name) && body.sections.get(name)?.head_level == content.head_level) {
				for (const text of content.content) {
					body.sections.get(name)!.addContent(text);
				}
			} else {
				body.newSection(name, content.head_level);
				for (const text of content.content) {
					body.sections.get(name)!.addContent(text);
				}
			}
		}
		this.sections = body.sections;
	}

	public toString(): string {
		let body: string = "";
		for (const [name, content] of this.sections) {
			if (content) {
				body += `${'#'.repeat(content.head_level)} ${name}\n`;
				body += content.content.join('\n') + '\n';
			}
		}

		return body;
	}
}



export class NoteLink implements INoteLink {
	public targetNote: string;
	public header?: string;
	public form?: 'list' | 'checklist';
	private app: App;

	constructor(app: App, targetNote: string, header?: string, form?: 'list' | 'checklist') {
		this.app = app;
		this.targetNote = targetNote;
		this.header = header;
		this.form = form;
	}

	public async link(sourceNote: string): Promise<void> {
		// implementing the linking logic, adding a backlink in the target note
		const targetFile = this.app.vault.getAbstractFileByPath(`${this.targetNote}.md`);
		if (targetFile instanceof TFile) {
			const content = await this.app.vault.read(targetFile);
			const linkText = this.formatLink(sourceNote);
			const updatedContent = this.addLinkToContent(content, linkText);
			await this.app.vault.modify(targetFile, updatedContent);
		}
	}

	private formatLink(sourceNote: string): string {
		const link = `[[${sourceNote}]]`;

		switch (this.form) {
			case 'list':
				return `- ${link}`;
			case 'checklist':
				return `- [ ] ${link}`;
			default:
				return link;
		}
	}

	private addLinkToContent(content: string, linkText: string): string {
		// Insert the link at the end of the content
		return content + '\n\n' + linkText;
	}
}


// Base class for notes, providing common properties and methods
export abstract class BaseNote {
	protected app: App;
	protected properties: Property;
	protected body: Body;
	protected linkedPages: INoteLink[] = [];
	protected savePath: string = '000-inbox';
	protected subPage: boolean = false;
	protected template?: BaseNote;
	protected noteType: NoteType;
	private logger = Logger.createLogger('BaseNote');
	private integrations: IntegrationManager;

	abstract defaultProperty(): Property;
	abstract defaultBody(): Body;

	constructor(app: App, noteType: NoteType, template?: BaseNote) {
		this.app = app;
		this.noteType = noteType;
		this.properties = this.defaultProperty();
		this.body = this.defaultBody()
		this.integrations = IntegrationManager.getInstance(this.app)
		if (template) {
			this.updateByTemplate(template, true);
		}
	}

	public updateByTemplate(template: BaseNote, keepNoteOrder: boolean = true): void {
		if (keepNoteOrder) {
			template.getProperties().update(this.properties.getProperties(), true);
			template.getBody().update(this.getBody())

			this.properties = template.getProperties();
			this.body = template.getBody();
		} else {
			this.properties.update(template.getProperties().getProperties())
			this.body.update(this.getBody())
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

	// 基础属性操作方法
	public getTitle(): string {
		return this.properties.getTitle();
	}

	public setTitle(title: string): void {
		this.properties.setTitle(title);
	}

	public getType(): NoteType{
		let note_key = Utils.getKeyByValue(NoteType, this.properties.getType());
		if (!note_key) {
			this.logger.warn(`Note type ${this.properties.getType()} is not recognized, defaulting to UNKNOWN`);
			note_key = 'FLEETING';
		}
		return NoteType[note_key];
	}

	public setType(n_type: NoteType): void {
		this.properties.setType(n_type.valueOf());
	}

	public setPath(obDirPath: string): void {
		this.logger.info(`The save path is changed to ${this.savePath}`);
		this.savePath = obDirPath;
	}

	public getPath(): string {
		return this.savePath;
	}


	public addTag(tag: string | string[]): void {
		const tags = Array.isArray(tag) ? tag : [tag];
		this.properties.addTag(tags);
	}

	public addAlias(alias: string | string[]): void {
		const aliases = Array.isArray(alias) ? alias : [alias];
		this.properties.addAlias(alias);
	}

	public setProperty(key: string, value: any): void {
		this.properties.setPropertyValue(key, value);
	}

	public getProperty(key: string): any {
		return this.properties.getPropertyValue(key)
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

	public addBodyContent(content: string, section_name: string, head_level: number): void {
		this.body.addContent(content, section_name, head_level);
	}

	public addLinkInstance(link: INoteLink): void {
		this.linkedPages.push(link);
	}

	public addLinkedPage(targetNote: string, header?: string, form?: 'list' | 'checklist'): INoteLink {
		const link = new NoteLink(this.app, targetNote, header, form);
		this.addLinkInstance(link);
		return link;
	}

	public pre_process(): void {
		this.logger.info("Pre-process before generating content");
		// This method can be overridden in subclasses for specific pre-processing
	}

	async post_process(s_note: string): Promise<string> {
		this.logger.info("Post-process after generating content");
		// This method can be overridden in subclasses for specific post-processing
		return s_note;
	}

	// Generate string-form content
	public async toString(): Promise<string> {
		this.logger.info("Generate string-form content");
		this.pre_process();
		let note: string = this.properties.toString();
		note += this.body.toString();
		return this.post_process(note)
	}

	// Check if the note exists in the vault
	public async exist(dir: boolean = false): Promise<boolean> {
		try {
			const path = dir ? this.getPath() : this.getObPath(true); // 确保文件路径包含扩展名
			const file = this.app.vault.getAbstractFileByPath(path);

			if (dir) {
				return file instanceof TFolder; // 确保检查的是文件夹
			} else {
				return file instanceof TFile;   // 确保检查的是文件
			}
		} catch (error) {
			this.logger.error(`Error checking existence: ${error}`);
			return false;
		}
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
			let title: string| null = await this.integrations.getTemplater().getPrompt("Typing title for the note")
			this.logger.info("The note title is empty, chaneging to user input: " + title);
			if (title === null){
				// @ts-ignore
				title = "Untitled Note";
			}
			// @ts-ignore
			this.setTitle(title)
		}

		// Checking whether title is duplicated
		const fileExists = await this.exist();
		if (fileExists) {
			const randomSuffix = Math.floor(Math.random() * 100) + 1;
			this.setTitle(`${this.getTitle()} ${randomSuffix}`);
			this.logger.warn(`Due to duplicated filename, file name changes to ${this.getTitle()}`);
		}

		// Overwrite the value of type
		this.setType(this.noteType)
	}

	public async save(): Promise<TFile> {
		await this.checkBeforeSave();
		this.logger.info(`Start saving note to ${this.getObPath()}`);
		const s_note = await this.toString();
		const file = await this.app.vault.create(this.getObPath(true), s_note);

		// Execute linking operations
		await this.linkingPages();

		this.logger.info(`Note saved: ${this.getObPath(false)}`);
		return file;
	}

	protected async linkingPages(): Promise<void> {
		this.logger.info("Start linking pages");
		for (const link of this.linkedPages) {
			await link.link(this.getTitle());
		}
		this.logger.info("Linking pages finished");
	}

}


// Zettelkasten Relevant Class
export class ZettelkastenProperty extends Property {
	protected logger = Logger.createLogger('ZettelkastenProperty');
	protected _properties: IZettelkastenProperties;

	constructor() {
		super();
		this._properties = {
			"title": new KeyValue("title", ""),
			"type": new KeyValue("type", ""),
			"url": new KeyValue("url", ""),
			"create": new KeyValue("create", Utils.generateDate()),
			"id": new KeyValue("id", Utils.generateZettelID()),
			"tags": new KeyValue("tags", []),
			"aliases": new KeyValue("aliases", []),
			"sources": new KeyValue("sources", []),
			"new": new KeyValue("new", true),
		}
	}

	public getUrl(): string {
		this.logger.debug("Get Property: url");
		return this.getPropertyValue("url");
	}

	public setUrl(url: string): void {
		this.logger.info(`Set Property: url:${url}`);
		this.setPropertyValue("url", url);
	}

	public addSources(sourceNote: string| string[]): void {
		this.logger.info(`Add Property: source_notes:${sourceNote}`);
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
		this.addAlias(this.getId());
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
		super(app, noteType, template);
		this.properties = this.defaultProperty()
	}

	defaultBody(): Body {
		let _body: Body = new Body();
		_body.newSection("**🔗Source**", 4)
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
