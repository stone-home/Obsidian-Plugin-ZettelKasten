// src/note/base-note.ts
import { App, TFile, TFolder } from 'obsidian';
import { NoteType } from '../types';
import { Logger } from '../logger';
import { Utils } from '../utils';

// Interface of a note properties
export interface INoteProperties {
	title: string;
	type: NoteType;
	url?: string;
	created: string;
	id: string;
	tags: string[];
	aliases: string[];
	source_notes: string[];
	new?: boolean;
	[key: string]: any; // 允许扩展属性
}

// interface for note templates
export interface INoteTemplate {
	generateFrontmatter(properties: INoteProperties): string;
	generateBody(properties: INoteProperties, customContent?: string): string;
	getDefaultProperties(): Partial<INoteProperties>;
}

// 笔记链接接口
export interface INoteLink {
	targetNote: string;
	header?: string;
	form?: 'list' | 'checklist';
	link(sourceNote: string): Promise<void>;
}

// 笔记体内容类
export class Body {
	private content: string = '';
	private sections: Map<string, string> = new Map();

	constructor(content: string = '') {
		this.content = content;
	}

	public setContent(content: string): void {
		this.content = content;
	}

	public addSection(name: string, content: string): void {
		this.sections.set(name, content);
	}

	public getSection(name: string): string | undefined {
		return this.sections.get(name);
	}

	public toString(): string {
		let body = this.content;

		// 添加章节内容
		for (const [name, content] of this.sections) {
			body += `\n## ${name}\n\n${content}\n`;
		}

		return body;
	}
}

// 笔记链接实现类
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
		// 实现链接逻辑，在目标笔记中添加反向链接
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
		// 简单实现：在文档末尾添加链接
		// 实际应该根据具体需求和模板来确定添加位置
		return content + '\n\n' + linkText;
	}
}

// 基础笔记类
export abstract class BaseNote {
	protected app: App;
	protected properties: INoteProperties;
	protected body: Body;
	protected linkedPages: INoteLink[] = [];
	protected savePath: string = '000-inbox';
	protected subPage: boolean = false;
	protected template?: INoteTemplate;

	constructor(app: App, template?: INoteTemplate) {
		this.app = app;
		this.template = template;
		this.body = new Body();

		// 初始化默认属性
		this.properties = {
			title: '',
			type: NoteType.UNKNOWN,
			created: Utils.generateDate(),
			id: Utils.generateZettelID(),
			tags: [],
			aliases: [],
			source_notes: [],
			derived_notes: [],
			new: true,
			...this.getDefaultProperties(),
			...(template?.getDefaultProperties() || {})
		};
	}

	// 抽象方法，子类必须实现
	protected abstract getDefaultProperties(): Partial<INoteProperties>;
	protected abstract getDefaultNoteType(): NoteType;

	// 基础属性操作方法
	public getTitle(): string {
		return this.properties.title;
	}

	public setTitle(title: string): void {
		this.properties.title = title;
		Logger.info(`Set Note title: ${title}`);
	}

	public getType(): NoteType {
		return this.properties.type;
	}

	public setType(type: NoteType): void {
		this.properties.type = type;
		Logger.info(`Set Note type: ${type}`);
	}

	public setPath(obDirPath: string): void {
		this.savePath = obDirPath;
		Logger.info(`The save path is changed to ${this.savePath}`);
	}

	public setUrl(url: string): void {
		this.properties.url = url;
		Logger.info(`Set Note url: ${url}`);
	}

	public addTag(tag: string | string[]): void {
		const tags = Array.isArray(tag) ? tag : [tag];
		this.properties.tags.push(...tags);
		Logger.info(`Add tags: ${tags.join(', ')}`);
	}

	public addAlias(alias: string | string[]): void {
		const aliases = Array.isArray(alias) ? alias : [alias];
		this.properties.aliases.push(...aliases);
		Logger.info(`Add aliases: ${aliases.join(', ')}`);
	}

	public addSourceNote(sourceNote: string): void {
		if (!this.properties.source_notes.includes(sourceNote)) {
			this.properties.source_notes.push(sourceNote);
		}
	}

	public addDerivedNote(derivedNote: string): void {
		if (!this.properties.derived_notes.includes(derivedNote)) {
			this.properties.derived_notes.push(derivedNote);
		}
	}

	public setProperty(key: string, value: any): void {
		this.properties[key] = value;
		Logger.info(`Set property ${key}: ${value}`);
	}

	public getProperty(key: string): any {
		return this.properties[key];
	}

	// 子页面模式
	public enableSubpage(): void {
		this.subPage = true;
		Logger.debug("Subpage mode is enabled");
	}

	public disableSubpage(): void {
		this.subPage = false;
		Logger.debug("Subpage mode is disabled");
	}

	// 路径相关方法
	public getDirPath(): string {
		return this.savePath;
	}

	public getObPath(extension: boolean = false): string {
		let obPath = `${this.savePath}/${this.getTitle()}`;
		if (extension) {
			obPath += ".md";
		}
		return obPath;
	}

	// 内容操作方法
	public setBody(content: string): void {
		this.body.setContent(content);
	}

	public addBodySection(name: string, content: string): void {
		this.body.addSection(name, content);
	}

	// 链接相关方法
	public addLinkInstance(link: INoteLink): void {
		this.linkedPages.push(link);
	}

	public addLinkedPage(targetNote: string, header?: string, form?: 'list' | 'checklist'): INoteLink {
		const link = new NoteLink(this.app, targetNote, header, form);
		this.addLinkInstance(link);
		return link;
	}

	// 生成笔记内容
	public toString(): string {
		Logger.info("Generate string-form content");

		if (this.template) {
			// 使用模板生成内容
			const frontmatter = this.template.generateFrontmatter(this.properties);
			const body = this.template.generateBody(this.properties, this.body.toString());
			return frontmatter + '\n' + body;
		} else {
			// 使用默认格式
			return this.generateDefaultContent();
		}
	}

	private generateDefaultContent(): string {
		// 生成 frontmatter
		let content = '---\n';
		for (const [key, value] of Object.entries(this.properties)) {
			if (Array.isArray(value)) {
				content += `${key}: [${value.map(v => `"${v}"`).join(', ')}]\n`;
			} else {
				content += `${key}: ${value}\n`;
			}
		}
		content += '---\n\n';

		// 添加标题
		content += `# ${this.getTitle()}\n\n`;

		// 添加正文
		content += this.body.toString();

		return content;
	}

	// 文件操作方法
	public async exist(dir: boolean = false): Promise<boolean> {
		const path = dir ? this.getDirPath() : this.getObPath();
		const file = this.app.vault.getAbstractFileByPath(path);
		return file !== null;
	}

	protected async checkBeforeSave(): Promise<void> {
		Logger.debug("Execute a Checking-before-saving");

		// 检查目录是否存在
		const dirExists = await this.exist(true);
		if (!dirExists) {
			await this.app.vault.createFolder(this.getDirPath());
			Logger.warn(`Dir was created, ${this.getDirPath()}`);
		}

		// 检查文件名冲突
		const fileExists = await this.exist();
		if (fileExists) {
			const randomSuffix = Math.floor(Math.random() * 100) + 1;
			this.setTitle(`${this.getTitle()} ${randomSuffix}`);
			Logger.warn(`Due to duplicated filename, file name changes to ${this.getTitle()}`);
		}
	}

	public async save(): Promise<TFile> {
		Logger.info(`Start saving note to ${this.getObPath()}`);

		await this.checkBeforeSave();

		const filePath = this.getObPath(true);
		const content = this.toString();

		const file = await this.app.vault.create(filePath, content);

		// 执行链接操作
		await this.linkingPages();

		Logger.info(`Note saved: ${this.getObPath(false)}`);
		return file;
	}

	protected async linkingPages(): Promise<void> {
		Logger.info("Start linking pages");
		for (const link of this.linkedPages) {
			await link.link(this.getTitle());
		}
		Logger.info("Linking pages finished");
	}
}

// 默认模板实现
export class DefaultNoteTemplate implements INoteTemplate {
	private noteType: NoteType;

	constructor(noteType: NoteType) {
		this.noteType = noteType;
	}

	public generateFrontmatter(properties: INoteProperties): string {
		let frontmatter = '---\n';

		for (const [key, value] of Object.entries(properties)) {
			if (key === 'new' && !value) continue; // 跳过 new: false

			if (Array.isArray(value)) {
				if (value.length === 0) {
					frontmatter += `${key}: []\n`;
				} else {
					frontmatter += `${key}: [${value.map(v => `"${v}"`).join(', ')}]\n`;
				}
			} else {
				frontmatter += `${key}: ${value}\n`;
			}
		}

		frontmatter += '---';
		return frontmatter;
	}

	public generateBody(properties: INoteProperties, customContent?: string): string {
		let body = `\n# ${properties.title}\n\n`;

		if (customContent) {
			body += customContent;
		} else {
			body += this.getDefaultBodyTemplate();
		}

		return body;
	}

	public getDefaultProperties(): Partial<INoteProperties> {
		return {
			type: this.noteType
		};
	}

	private getDefaultBodyTemplate(): string {
		switch (this.noteType) {
			case NoteType.FLEETING:
				return `## 💭 快速想法\n\n## 📍 来源\n\n## 🏷️ 标签\n\n`;
			case NoteType.LITERATURE:
				return `## 📝 原文摘录\n\n## 💭 个人理解\n\n## 🔗 相关链接\n\n`;
			case NoteType.ATOMIC:
				return `## ⚛️ 核心概念\n\n## 📋 详细说明\n\n## 🔗 相关原子笔记\n\n`;
			case NoteType.PERMANENT:
				return `## 📄 摘要\n\n## 📖 详细内容\n\n## 📚 参考来源\n\n`;
			default:
				return `## 内容\n\n`;
		}
	}
}
