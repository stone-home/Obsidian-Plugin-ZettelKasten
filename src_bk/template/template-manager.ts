// src/template/template-manager.ts
import { App, TFile, TFolder, Notice } from 'obsidian';
import { NoteType } from '../types';
import { BaseNote, INoteTemplate, INoteProperties } from '../notes/base-note';
import { Logger } from '../logger';

// 模板配置接口
export interface ITemplateConfig {
	id: string;
	name: string;
	description: string;
	noteType: NoteType;
	version: string;
	author: string;
	frontmatterTemplate: string;
	bodyTemplate: string;
	defaultProperties?: Record<string, any>;
	customFields?: ICustomField[];
}

// 自定义字段配置
export interface ICustomField {
	name: string;
	type: 'string' | 'number' | 'boolean' | 'array' | 'date';
	required: boolean;
	defaultValue?: any;
	description?: string;
}

// 可序列化的模板类
export class SerializableTemplate implements INoteTemplate {
	private config: ITemplateConfig;

	constructor(config: ITemplateConfig) {
		this.config = config;
	}

	public generateFrontmatter(properties: INoteProperties): string {
		let template = this.config.frontmatterTemplate;

		// 替换模板变量
		template = this.replaceTemplateVariables(template, properties);

		return template;
	}

	public generateBody(properties: INoteProperties, customContent?: string): string {
		let template = this.config.bodyTemplate;

		// 替换模板变量
		template = this.replaceTemplateVariables(template, properties);

		if (customContent) {
			// 如果模板中有 {{custom_content}} 占位符，替换它
			if (template.includes('{{custom_content}}')) {
				template = template.replace('{{custom_content}}', customContent);
			} else {
				template += '\n\n' + customContent;
			}
		}

		return template;
	}

	public getDefaultProperties(): Partial<INoteProperties> {
		const defaults: Partial<INoteProperties> = {
			type: this.config.noteType
		};

		if (this.config.defaultProperties) {
			Object.assign(defaults, this.config.defaultProperties);
		}

		return defaults;
	}

	public getConfig(): ITemplateConfig {
		return this.config;
	}

	private replaceTemplateVariables(template: string, properties: INoteProperties): string {
		let result = template;

		// 替换基本属性
		Object.entries(properties).forEach(([key, value]) => {
			const placeholder = `{{${key}}}`;
			if (result.includes(placeholder)) {
				if (Array.isArray(value)) {
					result = result.replace(placeholder, `[${value.map(v => `"${v}"`).join(', ')}]`);
				} else {
					result = result.replace(placeholder, String(value || ''));
				}
			}
		});

		// 替换时间相关的占位符
		const now = new Date();
		result = result.replace('{{current_date}}', now.toISOString().split('T')[0]);
		result = result.replace('{{current_time}}', now.toISOString());
		result = result.replace('{{timestamp}}', now.getTime().toString());

		return result;
	}
}

// 模板管理器
export class TemplateManager {
	private app: App;
	private templates: Map<string, SerializableTemplate> = new Map();
	private templatesByType: Map<NoteType, SerializableTemplate[]> = new Map();
	private templateFolder: string = '.zettelkasten/templates';

	constructor(app: App) {
		this.app = app;
		this.initializeTemplateTypes();
	}

	private initializeTemplateTypes() {
		Object.values(NoteType).forEach(type => {
			if (type !== NoteType.UNKNOWN) {
				this.templatesByType.set(type, []);
			}
		});
	}

	// 加载所有模板
	public async loadTemplates(): Promise<void> {
		try {
			const templateFolder = this.app.vault.getAbstractFileByPath(this.templateFolder);
			if (!templateFolder || !(templateFolder instanceof TFolder)) {
				Logger.info('Template folder not found, creating...');
				await this.createDefaultTemplateFolder();
				return;
			}

			const templateFiles = templateFolder.children.filter(file =>
				file instanceof TFile && file.extension === 'json'
			) as TFile[];

			for (const file of templateFiles) {
				await this.loadTemplateFromFile(file);
			}

			Logger.info(`Loaded ${this.templates.size} templates`);
		} catch (error) {
			Logger.error('Failed to load templates:', error);
			new Notice('加载模板失败');
		}
	}

	// 从文件加载模板
	private async loadTemplateFromFile(file: TFile): Promise<void> {
		try {
			const content = await this.app.vault.read(file);
			const config: ITemplateConfig = JSON.parse(content);

			// 验证模板配置
			if (this.validateTemplateConfig(config)) {
				const template = new SerializableTemplate(config);
				this.registerTemplate(template);
			} else {
				Logger.warn(`Invalid template config in file: ${file.path}`);
			}
		} catch (error) {
			Logger.error(`Failed to load template from ${file.path}:`, error);
		}
	}

	// 验证模板配置
	private validateTemplateConfig(config: any): config is ITemplateConfig {
		return (
			typeof config.id === 'string' &&
			typeof config.name === 'string' &&
			typeof config.noteType === 'string' &&
			Object.values(NoteType).includes(config.noteType) &&
			typeof config.frontmatterTemplate === 'string' &&
			typeof config.bodyTemplate === 'string'
		);
	}

	// 注册模板
	public registerTemplate(template: SerializableTemplate): void {
		const config = template.getConfig();
		this.templates.set(config.id, template);

		const typeTemplates = this.templatesByType.get(config.noteType) || [];
		typeTemplates.push(template);
		this.templatesByType.set(config.noteType, typeTemplates);

		Logger.info(`Registered template: ${config.name} (${config.noteType})`);
	}

	// 获取指定类型的模板
	public getTemplatesForType(noteType: NoteType): SerializableTemplate[] {
		return this.templatesByType.get(noteType) || [];
	}

	// 获取特定模板
	public getTemplate(templateId: string): SerializableTemplate | undefined {
		return this.templates.get(templateId);
	}

	// 获取所有模板
	public getAllTemplates(): SerializableTemplate[] {
		return Array.from(this.templates.values());
	}

	// 保存模板到文件
	public async saveTemplate(config: ITemplateConfig): Promise<void> {
		try {
			// 确保模板文件夹存在
			await this.ensureTemplateFolderExists();

			const filePath = `${this.templateFolder}/${config.id}.json`;
			const content = JSON.stringify(config, null, 2);

			// 检查文件是否已存在
			const existingFile = this.app.vault.getAbstractFileByPath(filePath);
			if (existingFile instanceof TFile) {
				await this.app.vault.modify(existingFile, content);
				Logger.info(`Updated existing template: ${config.name}`);
			} else {
				await this.app.vault.create(filePath, content);
				Logger.info(`Created new template: ${config.name}`);
			}

			// 重新加载模板
			const template = new SerializableTemplate(config);
			this.registerTemplate(template);

			new Notice(`模板 "${config.name}" 已保存`);
		} catch (error) {
			Logger.error('Failed to save template:', error);
			new Notice('保存模板失败');
			throw error;
		}
	}

	// 删除模板
	public async deleteTemplate(templateId: string): Promise<void> {
		try {
			const template = this.templates.get(templateId);
			if (!template) {
				new Notice('模板不存在');
				return;
			}

			const config = template.getConfig();
			const filePath = `${this.templateFolder}/${templateId}.json`;
			const file = this.app.vault.getAbstractFileByPath(filePath);

			if (file instanceof TFile) {
				await this.app.vault.delete(file);
			}

			// 从内存中移除
			this.templates.delete(templateId);
			const typeTemplates = this.templatesByType.get(config.noteType);
			if (typeTemplates) {
				const index = typeTemplates.findIndex(t => t.getConfig().id === templateId);
				if (index !== -1) {
					typeTemplates.splice(index, 1);
				}
			}

			new Notice(`模板 "${config.name}" 已删除`);
			Logger.info(`Template deleted: ${config.name}`);
		} catch (error) {
			Logger.error('Failed to delete template:', error);
			new Notice('删除模板失败');
		}
	}

	// 创建默认模板文件夹和示例模板
	private async createDefaultTemplateFolder(): Promise<void> {
		try {
			// 检查文件夹是否已存在
			const existingFolder = this.app.vault.getAbstractFileByPath(this.templateFolder);
			if (!existingFolder) {
				await this.app.vault.createFolder(this.templateFolder);
				Logger.info(`Created template folder: ${this.templateFolder}`);
			}

			// 创建示例模板
			await this.createSampleTemplates();
		} catch (error) {
			// 如果文件夹已存在，只记录信息而不报错
			if (error.message && error.message.includes('already exists')) {
				Logger.info(`Template folder already exists: ${this.templateFolder}`);
				await this.createSampleTemplates();
			} else {
				Logger.error('Failed to create template folder:', error);
				throw error;
			}
		}
	}

	private async ensureTemplateFolderExists(): Promise<void> {
		try {
			const folder = this.app.vault.getAbstractFileByPath(this.templateFolder);
			if (!folder) {
				await this.app.vault.createFolder(this.templateFolder);
				Logger.info(`Created template folder: ${this.templateFolder}`);
			}
		} catch (error) {
			if (error.message && error.message.includes('already exists')) {
				Logger.debug(`Template folder already exists: ${this.templateFolder}`);
			} else {
				Logger.error('Failed to ensure template folder exists:', error);
				throw error;
			}
		}
	}

	// 创建示例模板
	private async createSampleTemplates(): Promise<void> {
		const sampleTemplates: ITemplateConfig[] = [
			{
				id: 'fleeting-simple',
				name: '简单临时笔记',
				description: '简洁的临时笔记模板',
				noteType: NoteType.FLEETING,
				version: '1.0.0',
				author: 'System',
				frontmatterTemplate: `---
title: {{title}}
type: {{type}}
created: {{created}}
id: {{id}}
tags: {{tags}}
urgency: medium
energy: high
---`,
				bodyTemplate: `# 💭 {{title}}

## 核心想法


## 来源


## 下一步行动

`,
				defaultProperties: {
					tags: ['fleeting', 'quick']
				}
			},
			{
				id: 'literature-academic',
				name: '学术文献笔记',
				description: '适用于学术论文和书籍的文献笔记模板',
				noteType: NoteType.LITERATURE,
				version: '1.0.0',
				author: 'System',
				frontmatterTemplate: `---
title: {{title}}
type: {{type}}
created: {{created}}
id: {{id}}
author: ""
publication_year: 
journal: ""
doi: ""
tags: {{tags}}
source_notes: {{source_notes}}
derived_notes: {{derived_notes}}
---`,
				bodyTemplate: `# 📚 {{title}}

## 📖 基本信息
- **作者**: 
- **发表年份**: 
- **期刊/出版社**: 
- **DOI**: 

## 📝 主要内容

### 核心观点


### 研究方法


### 主要发现


## 💭 个人思考

### 优点


### 不足


### 启发


## 🔗 相关文献

`,
				defaultProperties: {
					tags: ['literature', 'academic']
				}
			}
		];

		for (const template of sampleTemplates) {
			const filePath = `${this.templateFolder}/${template.id}.json`;

			// 检查文件是否已存在
			const existingFile = this.app.vault.getAbstractFileByPath(filePath);
			if (existingFile) {
				Logger.debug(`Template file already exists: ${filePath}`);
				// 如果文件存在，加载它而不是覆盖
				if (existingFile instanceof TFile) {
					await this.loadTemplateFromFile(existingFile);
				}
				continue;
			}

			try {
				const content = JSON.stringify(template, null, 2);
				await this.app.vault.create(filePath, content);

				const serializableTemplate = new SerializableTemplate(template);
				this.registerTemplate(serializableTemplate);

				Logger.info(`Created sample template: ${template.name}`);
			} catch (error) {
				if (error.message && error.message.includes('already exists')) {
					Logger.debug(`Template file already exists: ${filePath}`);
					// 尝试加载现有文件
					const file = this.app.vault.getAbstractFileByPath(filePath);
					if (file instanceof TFile) {
						await this.loadTemplateFromFile(file);
					}
				} else {
					Logger.error(`Failed to create sample template ${template.name}:`, error);
				}
			}
		}
	}

	// 导入模板（从外部文件）
	public async importTemplate(file: File): Promise<void> {
		try {
			const content = await file.text();
			const config: ITemplateConfig = JSON.parse(content);

			if (this.validateTemplateConfig(config)) {
				await this.saveTemplate(config);
				new Notice(`模板 "${config.name}" 导入成功`);
			} else {
				new Notice('模板文件格式无效');
			}
		} catch (error) {
			Logger.error('Failed to import template:', error);
			new Notice('导入模板失败');
		}
	}

	// 导出模板
	public async exportTemplate(templateId: string): Promise<void> {
		const template = this.templates.get(templateId);
		if (!template) {
			new Notice('模板不存在');
			return;
		}

		const config = template.getConfig();
		const content = JSON.stringify(config, null, 2);
		const blob = new Blob([content], { type: 'application/json' });
		const url = URL.createObjectURL(blob);

		const link = document.createElement('a');
		link.href = url;
		link.download = `${config.id}.json`;
		link.click();

		URL.revokeObjectURL(url);
		new Notice(`模板 "${config.name}" 已导出`);
	}
}
