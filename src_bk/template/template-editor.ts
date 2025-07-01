// src/template/improved-template-editor.ts
import { App, Modal, Notice, Setting } from 'obsidian';
import { TemplateManager, ITemplateConfig } from './template-manager';
import { NoteType } from '../types';

// 属性类型枚举
export enum PropertyType {
	STRING = 'string',
	NUMBER = 'number',
	BOOLEAN = 'boolean',
	ARRAY = 'array',
	DATE = 'date'
}

// 自定义属性接口
export interface ICustomProperty {
	key: string;
	type: PropertyType;
	defaultValue: any;
	required: boolean;
	description?: string;
}

// 基础属性（用户不能编辑）
const BASE_PROPERTIES: ICustomProperty[] = [
	{
		key: 'title',
		type: PropertyType.STRING,
		defaultValue: '{{title}}',
		required: true,
		description: '笔记标题'
	},
	{
		key: 'type',
		type: PropertyType.STRING,
		defaultValue: '{{type}}',
		required: true,
		description: '笔记类型'
	},
	{
		key: 'created',
		type: PropertyType.DATE,
		defaultValue: '{{created}}',
		required: true,
		description: '创建日期'
	},
	{
		key: 'id',
		type: PropertyType.STRING,
		defaultValue: '{{id}}',
		required: true,
		description: '唯一标识符'
	},
	{
		key: 'tags',
		type: PropertyType.ARRAY,
		defaultValue: '{{tags}}',
		required: true,
		description: '标签数组'
	},
	{
		key: 'source_notes',
		type: PropertyType.ARRAY,
		defaultValue: '{{source_notes}}',
		required: true,
		description: '来源笔记'
	},
	{
		key: 'derived_notes',
		type: PropertyType.ARRAY,
		defaultValue: '{{derived_notes}}',
		required: true,
		description: '衍生笔记'
	}
];

// 改进的模板配置接口
export interface IImprovedTemplateConfig {
	id: string;
	name: string;
	description: string;
	noteType: NoteType;
	version: string;
	author: string;
	customProperties: ICustomProperty[];
	bodyTemplate: string;
}

// 改进的模板编辑器
export class TemplateEditorModal extends Modal {
	private templateManager: TemplateManager;
	private config: IImprovedTemplateConfig;
	private isNew: boolean;
	private onSave: (config: IImprovedTemplateConfig) => void;
	private customProperties: ICustomProperty[] = [];

	constructor(
		app: App,
		templateManager: TemplateManager,
		config?: IImprovedTemplateConfig,
		onSave?: (config: IImprovedTemplateConfig) => void
	) {
		super(app);
		this.templateManager = templateManager;
		this.isNew = !config;
		this.config = config || this.createEmptyConfig();
		this.customProperties = [...(this.config.customProperties || [])];
		this.onSave = onSave || (() => {});
	}

	private createEmptyConfig(): IImprovedTemplateConfig {
		return {
			id: `template-${Date.now()}`,
			name: '',
			description: '',
			noteType: NoteType.FLEETING,
			version: '1.0.0',
			author: '',
			customProperties: [],
			bodyTemplate: `# {{title}}

## 内容

`
		};
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.empty();

		contentEl.createEl('h2', { text: this.isNew ? '创建新模板' : '编辑模板' });

		// 创建滚动容器
		const scrollContainer = contentEl.createDiv({ cls: 'template-editor-scroll' });

		this.createBasicInfoSection(scrollContainer);
		this.createPropertiesSection(scrollContainer);
		this.createBodySection(scrollContainer);
		this.createButtonSection(contentEl);
	}

	private createBasicInfoSection(container: HTMLElement) {
		const section = container.createDiv({ cls: 'template-editor-section' });
		section.createEl('h3', { text: '📋 基本信息' });

		// ID
		const idContainer = section.createDiv({ cls: 'template-field' });
		idContainer.createEl('label', { text: 'ID:' });
		const idInput = idContainer.createEl('input', {
			type: 'text',
			value: this.config.id,
			attr: { readonly: !this.isNew }
		});
		if (this.isNew) {
			idInput.addEventListener('input', (e) => {
				this.config.id = (e.target as HTMLInputElement).value;
			});
		}

		// 名称
		new Setting(section)
			.setName('模板名称')
			.setDesc('给模板起一个描述性的名称')
			.addText(text => text
				.setValue(this.config.name)
				.onChange((value) => {
					this.config.name = value;
				}));

		// 描述
		new Setting(section)
			.setName('模板描述')
			.setDesc('描述这个模板的用途和特点')
			.addTextArea(textArea => textArea
				.setValue(this.config.description)
				.onChange((value) => {
					this.config.description = value;
				}));

		// 笔记类型
		new Setting(section)
			.setName('笔记类型')
			.setDesc('选择这个模板适用的笔记类型')
			.addDropdown(dropdown => {
				Object.values(NoteType).forEach(type => {
					if (type !== NoteType.UNKNOWN) {
						dropdown.addOption(type, type.toUpperCase());
					}
				});
				dropdown.setValue(this.config.noteType);
				dropdown.onChange((value) => {
					this.config.noteType = value as NoteType;
				});
			});

		// 作者
		new Setting(section)
			.setName('作者')
			.setDesc('模板创建者')
			.addText(text => text
				.setValue(this.config.author)
				.setPlaceholder('输入作者名称')
				.onChange((value) => {
					this.config.author = value;
				}));
	}

	private createPropertiesSection(container: HTMLElement) {
		const section = container.createDiv({ cls: 'template-editor-section' });
		const header = section.createDiv({ cls: 'section-header' });
		header.createEl('h3', { text: '🔧 Frontmatter 属性' });

		// 显示基础属性（不可编辑）
		const baseSection = section.createDiv({ cls: 'base-properties-section' });
		baseSection.createEl('h4', { text: '基础属性（固定，不可编辑）' });

		const basePropsContainer = baseSection.createDiv({ cls: 'base-properties-container' });
		BASE_PROPERTIES.forEach(prop => {
			this.createBasePropertyDisplay(basePropsContainer, prop);
		});

		// 自定义属性部分
		const customSection = section.createDiv({ cls: 'custom-properties-section' });
		const customHeader = customSection.createDiv({ cls: 'custom-properties-header' });
		customHeader.createEl('h4', { text: '自定义属性' });

		const addButton = customHeader.createEl('button', {
			text: '+ 添加属性',
			cls: 'add-property-button'
		});
		addButton.addEventListener('click', () => {
			this.addCustomProperty();
		});

		this.customPropertiesContainer = customSection.createDiv({ cls: 'custom-properties-container' });
		this.refreshCustomProperties();
	}

	private customPropertiesContainer: HTMLElement;

	private createBasePropertyDisplay(container: HTMLElement, prop: ICustomProperty) {
		const propEl = container.createDiv({ cls: 'base-property-item' });

		const keyEl = propEl.createDiv({ cls: 'property-key' });
		keyEl.createEl('span', { text: prop.key, cls: 'key-name' });
		keyEl.createEl('span', { text: prop.type, cls: 'key-type' });

		const valueEl = propEl.createDiv({ cls: 'property-value' });
		valueEl.createEl('code', { text: prop.defaultValue });

		if (prop.description) {
			propEl.createDiv({ text: prop.description, cls: 'property-description' });
		}
	}

	private createCustomPropertyItem(container: HTMLElement, prop: ICustomProperty, index: number) {
		const propEl = container.createDiv({ cls: 'custom-property-item-inline' });

		// 属性键名
		const keyInput = propEl.createEl('input', {
			type: 'text',
			value: prop.key,
			placeholder: '属性名',
			cls: 'property-key-input'
		});
		keyInput.addEventListener('input', (e) => {
			this.customProperties[index].key = (e.target as HTMLInputElement).value;
		});

		// 属性类型选择
		const typeSelect = propEl.createEl('select', { cls: 'property-type-select' });
		Object.values(PropertyType).forEach(type => {
			const option = typeSelect.createEl('option', {
				value: type,
				text: this.getPropertyTypeLabel(type)
			});
			if (type === prop.type) {
				option.selected = true;
			}
		});
		typeSelect.addEventListener('change', (e) => {
			const newType = (e.target as HTMLSelectElement).value as PropertyType;
			this.customProperties[index].type = newType;
			this.customProperties[index].defaultValue = this.getDefaultValueForType(newType);
			this.refreshCustomProperties(); // 重新渲染以更新默认值输入
		});

		// 默认值输入
		const valueInputContainer = propEl.createDiv({ cls: 'property-value-container' });
		this.createInlineValueInput(valueInputContainer, prop, index);

		// 删除按钮
		const deleteButton = propEl.createEl('button', {
			text: '🗑️',
			cls: 'delete-property-button-inline',
			attr: { title: '删除属性' }
		});
		deleteButton.addEventListener('click', () => {
			this.removeCustomProperty(index);
		});
	}

	private createInlineValueInput(container: HTMLElement, prop: ICustomProperty, index: number) {
		container.empty(); // 清空容器以便重新创建输入

		switch (prop.type) {
			case PropertyType.STRING:
			case PropertyType.DATE:
				const stringInput = container.createEl('input', {
					type: 'text',
					value: String(prop.defaultValue),
					placeholder: prop.type === PropertyType.DATE ? 'YYYY-MM-DD' : '默认值',
					cls: 'property-value-input'
				});
				stringInput.addEventListener('input', (e) => {
					this.customProperties[index].defaultValue = (e.target as HTMLInputElement).value;
				});
				break;

			case PropertyType.NUMBER:
				const numberInput = container.createEl('input', {
					type: 'number',
					value: String(prop.defaultValue),
					placeholder: '数字',
					cls: 'property-value-input'
				});
				numberInput.addEventListener('input', (e) => {
					this.customProperties[index].defaultValue = Number((e.target as HTMLInputElement).value);
				});
				break;

			case PropertyType.BOOLEAN:
				const boolSelect = container.createEl('select', { cls: 'property-value-input' });
				boolSelect.createEl('option', { value: 'true', text: 'true' });
				boolSelect.createEl('option', { value: 'false', text: 'false' });
				boolSelect.value = String(prop.defaultValue);
				boolSelect.addEventListener('change', (e) => {
					this.customProperties[index].defaultValue = (e.target as HTMLSelectElement).value === 'true';
				});
				break;

			case PropertyType.ARRAY:
				const arrayInput = container.createEl('input', {
					type: 'text',
					value: Array.isArray(prop.defaultValue) ? prop.defaultValue.join(', ') : String(prop.defaultValue),
					placeholder: '用逗号分隔',
					cls: 'property-value-input'
				});
				arrayInput.addEventListener('input', (e) => {
					const value = (e.target as HTMLInputElement).value;
					if (value.startsWith('{{') && value.endsWith('}}')) {
						this.customProperties[index].defaultValue = value;
					} else {
						this.customProperties[index].defaultValue = value.split(',').map(v => v.trim()).filter(v => v);
					}
				});
				break;
		}
	}

	private getPropertyTypeLabel(type: PropertyType): string {
		const labels = {
			[PropertyType.STRING]: '文本',
			[PropertyType.NUMBER]: '数字',
			[PropertyType.BOOLEAN]: '布尔值',
			[PropertyType.ARRAY]: '数组',
			[PropertyType.DATE]: '日期'
		};
		return labels[type];
	}

	private getDefaultValueForType(type: PropertyType): any {
		switch (type) {
			case PropertyType.STRING:
				return '';
			case PropertyType.NUMBER:
				return 0;
			case PropertyType.BOOLEAN:
				return false;
			case PropertyType.ARRAY:
				return [];
			case PropertyType.DATE:
				return '{{current_date}}';
		}
	}

	private addCustomProperty() {
		this.customProperties.push({
			key: '',
			type: PropertyType.STRING,
			defaultValue: '',
			required: false,
			description: ''
		});
		this.refreshCustomProperties();
	}

	private removeCustomProperty(index: number) {
		this.customProperties.splice(index, 1);
		this.refreshCustomProperties();
	}

	private refreshCustomProperties() {
		if (!this.customPropertiesContainer) return;

		this.customPropertiesContainer.empty();

		if (this.customProperties.length === 0) {
			this.customPropertiesContainer.createEl('p', {
				text: '暂无自定义属性，点击上方"添加属性"按钮开始添加',
				cls: 'no-custom-properties'
			});
			return;
		}

		this.customProperties.forEach((prop, index) => {
			this.createCustomPropertyItem(this.customPropertiesContainer, prop, index);
		});
	}

	private createBodySection(container: HTMLElement) {
		const section = container.createDiv({ cls: 'template-editor-section' });
		section.createEl('h3', { text: '📝 笔记正文模板' });

		const desc = section.createDiv({ cls: 'body-section-description' });
		desc.createEl('p', { text: '使用 Markdown 语法编写笔记正文模板。可以使用变量占位符如 {{title}}, {{current_date}} 等。' });

		// 变量提示
		const variablesHelp = section.createDiv({ cls: 'variables-help' });
		variablesHelp.createEl('h4', { text: '可用变量:' });
		const variablesList = variablesHelp.createEl('div', { cls: 'variables-list' });

		const commonVars = [
			'{{title}} - 笔记标题',
			'{{type}} - 笔记类型',
			'{{current_date}} - 当前日期',
			'{{current_time}} - 当前时间',
			'{{id}} - 唯一ID'
		];

		commonVars.forEach(variable => {
			variablesList.createEl('code', { text: variable, cls: 'variable-item' });
		});

		// 正文编辑器
		const bodyContainer = section.createDiv({ cls: 'body-editor-container' });
		const bodyTextarea = bodyContainer.createEl('textarea', {
			cls: 'body-template-editor',
			placeholder: '在这里编写笔记正文模板...\n\n例如：\n# {{title}}\n\n## 概述\n\n## 详细内容\n\n## 相关链接\n\n'
		});
		bodyTextarea.value = this.config.bodyTemplate;
		bodyTextarea.addEventListener('input', (e) => {
			this.config.bodyTemplate = (e.target as HTMLTextAreaElement).value;
		});

		// 预览按钮
		const previewContainer = section.createDiv({ cls: 'preview-container' });
		const previewButton = previewContainer.createEl('button', {
			text: '👁️ 预览模板',
			cls: 'preview-button'
		});
		previewButton.addEventListener('click', () => {
			this.showPreview();
		});
	}

	private createButtonSection(container: HTMLElement) {
		const buttonContainer = container.createDiv({ cls: 'modal-button-container' });

		const saveButton = buttonContainer.createEl('button', {
			text: '💾 保存模板',
			cls: 'mod-cta'
		});
		saveButton.addEventListener('click', async () => {
			await this.saveTemplate();
		});

		const cancelButton = buttonContainer.createEl('button', {
			text: '取消'
		});
		cancelButton.addEventListener('click', () => {
			this.close();
		});
	}

	private showPreview() {
		// 生成预览配置
		const previewConfig = this.generatePreviewConfig();

		// 创建预览模态
		const preview = new TemplatePreviewModal(this.app, previewConfig);
		preview.open();
	}

	private generatePreviewConfig(): any {
		// 生成示例属性值
		const sampleProperties: any = {
			title: '示例笔记标题',
			type: this.config.noteType,
			created: '2024-01-01',
			id: 'sample-id-123',
			tags: ['示例', '标签'],
			source_notes: [],
			derived_notes: [],
			current_date: new Date().toISOString().split('T')[0],
			current_time: new Date().toISOString()
		};

		// 添加自定义属性的示例值
		this.customProperties.forEach(prop => {
			if (prop.key) {
				sampleProperties[prop.key] = this.getSampleValueForProperty(prop);
			}
		});

		return {
			name: this.config.name,
			description: this.config.description,
			noteType: this.config.noteType,
			frontmatter: this.generateFrontmatterPreview(sampleProperties),
			body: this.replaceVariables(this.config.bodyTemplate, sampleProperties)
		};
	}

	private getSampleValueForProperty(prop: ICustomProperty): any {
		switch (prop.type) {
			case PropertyType.STRING:
				return prop.key === 'author' ? '示例作者' : '示例文本';
			case PropertyType.NUMBER:
				return 42;
			case PropertyType.BOOLEAN:
				return true;
			case PropertyType.ARRAY:
				return ['示例1', '示例2'];
			case PropertyType.DATE:
				return '2024-01-01';
			default:
				return prop.defaultValue;
		}
	}

	private generateFrontmatterPreview(properties: any): string {
		let frontmatter = '---\n';

		// 添加基础属性
		BASE_PROPERTIES.forEach(prop => {
			const value = properties[prop.key];
			frontmatter += this.formatPropertyForYAML(prop.key, value, prop.type);
		});

		// 添加自定义属性
		this.customProperties.forEach(prop => {
			if (prop.key) {
				const value = properties[prop.key];
				frontmatter += this.formatPropertyForYAML(prop.key, value, prop.type);
			}
		});

		frontmatter += '---';
		return frontmatter;
	}

	private formatPropertyForYAML(key: string, value: any, type: PropertyType): string {
		switch (type) {
			case PropertyType.ARRAY:
				if (Array.isArray(value)) {
					if (value.length === 0) {
						return `${key}: []\n`;
					}
					return `${key}: [${value.map(v => `"${v}"`).join(', ')}]\n`;
				}
				return `${key}: ${value}\n`;
			case PropertyType.STRING:
			case PropertyType.DATE:
				return `${key}: "${value}"\n`;
			case PropertyType.BOOLEAN:
			case PropertyType.NUMBER:
				return `${key}: ${value}\n`;
			default:
				return `${key}: ${value}\n`;
		}
	}

	private replaceVariables(template: string, properties: any): string {
		let result = template;
		Object.entries(properties).forEach(([key, value]) => {
			const placeholder = `{{${key}}}`;
			result = result.replace(new RegExp(placeholder, 'g'), String(value));
		});
		return result;
	}

	private async saveTemplate() {
		// 验证
		if (!this.config.name.trim()) {
			new Notice('请输入模板名称');
			return;
		}

		// 验证自定义属性
		for (const prop of this.customProperties) {
			if (!prop.key.trim()) {
				new Notice('所有自定义属性都必须有属性名');
				return;
			}
		}

		try {
			// 更新配置
			this.config.customProperties = this.customProperties;

			// 转换为旧格式以保持兼容性
			const legacyConfig = this.convertToLegacyFormat(this.config);

			// 保存
			await this.templateManager.saveTemplate(legacyConfig);
			this.onSave(this.config);
			this.close();
			new Notice(`模板 "${this.config.name}" 保存成功！`);
		} catch (error) {
			new Notice('保存模板失败');
			console.error('Failed to save template:', error);
		}
	}

	private convertToLegacyFormat(config: IImprovedTemplateConfig): ITemplateConfig {
		// 生成 frontmatter 模板
		let frontmatterTemplate = '---\n';

		// 基础属性
		BASE_PROPERTIES.forEach(prop => {
			frontmatterTemplate += this.formatPropertyForTemplate(prop.key, prop.defaultValue, prop.type);
		});

		// 自定义属性
		config.customProperties.forEach(prop => {
			if (prop.key) {
				frontmatterTemplate += this.formatPropertyForTemplate(prop.key, prop.defaultValue, prop.type);
			}
		});

		frontmatterTemplate += '---';

		return {
			id: config.id,
			name: config.name,
			description: config.description,
			noteType: config.noteType,
			version: config.version,
			author: config.author,
			frontmatterTemplate,
			bodyTemplate: config.bodyTemplate,
			customFields: config.customProperties
		};
	}

	private formatPropertyForTemplate(key: string, value: any, type: PropertyType): string {
		if (typeof value === 'string' && value.startsWith('{{') && value.endsWith('}}')) {
			// 变量不需要引号
			return `${key}: ${value}\n`;
		}

		switch (type) {
			case PropertyType.ARRAY:
				if (Array.isArray(value)) {
					if (value.length === 0) {
						return `${key}: []\n`;
					}
					return `${key}: [${value.map(v => `"${v}"`).join(', ')}]\n`;
				}
				return `${key}: ${value}\n`;
			case PropertyType.STRING:
			case PropertyType.DATE:
				return `${key}: "${value}"\n`;
			case PropertyType.BOOLEAN:
			case PropertyType.NUMBER:
				return `${key}: ${value}\n`;
			default:
				return `${key}: ${value}\n`;
		}
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}
}

// 简化的预览模态
class TemplatePreviewModal extends Modal {
	private config: any;

	constructor(app: App, config: any) {
		super(app);
		this.config = config;
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.empty();

		contentEl.createEl('h2', { text: `📋 模板预览: ${this.config.name}` });

		// 模板信息
		const infoSection = contentEl.createDiv({ cls: 'template-preview-info' });
		infoSection.createEl('p', { text: `类型: ${this.config.noteType.toUpperCase()}` });
		infoSection.createEl('p', { text: `描述: ${this.config.description}` });

		// Frontmatter 预览
		const frontmatterSection = contentEl.createDiv({ cls: 'template-preview-section' });
		frontmatterSection.createEl('h3', { text: 'Frontmatter' });
		const frontmatterPre = frontmatterSection.createEl('pre', { cls: 'template-preview-content' });
		frontmatterPre.textContent = this.config.frontmatter;

		// Body 预览
		const bodySection = contentEl.createDiv({ cls: 'template-preview-section' });
		bodySection.createEl('h3', { text: 'Body' });
		const bodyPre = bodySection.createEl('pre', { cls: 'template-preview-content' });
		bodyPre.textContent = this.config.body;

		// 关闭按钮
		const buttonContainer = contentEl.createDiv({ cls: 'modal-button-container' });
		const closeButton = buttonContainer.createEl('button', { text: '关闭' });
		closeButton.addEventListener('click', () => this.close());
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}
}
