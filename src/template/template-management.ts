// src/template/template-management.ts - 最终整合版本
import { App, Modal, Notice, Setting } from 'obsidian';
import { TemplateManager, SerializableTemplate, ITemplateConfig } from './template-manager';
import { NoteType } from '../types';
import { TemplateEditorModal } from './template-editor';

export class TemplateManagementModal extends Modal {
	private templateManager: TemplateManager;
	private currentFilter: NoteType | 'all' = 'all';
	private templateListContainer: HTMLElement;

	constructor(app: App, templateManager: TemplateManager) {
		super(app);
		this.templateManager = templateManager;
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.empty();

		contentEl.createEl('h1', { text: '📝 模板管理' });

		this.createFilterSection(contentEl);
		this.createActionSection(contentEl);
		this.createTemplateList(contentEl);
	}

	private createFilterSection(contentEl: HTMLElement) {
		const filterSection = contentEl.createDiv({ cls: 'template-filter-section' });

		new Setting(filterSection)
			.setName('按类型筛选')
			.setDesc('筛选显示特定类型的模板')
			.addDropdown(dropdown => {
				dropdown.addOption('all', '全部');
				Object.values(NoteType).forEach(type => {
					if (type !== NoteType.UNKNOWN) {
						dropdown.addOption(type, type.toUpperCase());
					}
				});

				dropdown.setValue(this.currentFilter);
				dropdown.onChange((value) => {
					this.currentFilter = value as NoteType | 'all';
					this.refreshTemplateList();
				});
			});
	}

	private createActionSection(contentEl: HTMLElement) {
		const actionSection = contentEl.createDiv({ cls: 'template-action-section' });

		const buttonGroup = actionSection.createDiv({ cls: 'template-button-group' });

		// 创建新模板按钮
		const createButton = buttonGroup.createEl('button', {
			text: '+ 创建模板',
			cls: 'mod-cta'
		});
		createButton.addEventListener('click', () => {
			this.openTemplateEditor();
		});

		// 导入模板按钮
		const importButton = buttonGroup.createEl('button', {
			text: '📥 导入模板'
		});
		importButton.addEventListener('click', () => {
			this.importTemplate();
		});

		// 刷新按钮
		const refreshButton = buttonGroup.createEl('button', {
			text: '🔄 刷新'
		});
		refreshButton.addEventListener('click', async () => {
			await this.templateManager.loadTemplates();
			this.refreshTemplateList();
			new Notice('模板列表已刷新');
		});
	}

	private createTemplateList(contentEl: HTMLElement) {
		const listContainer = contentEl.createDiv({ cls: 'template-list-container' });
		this.templateListContainer = listContainer;
		this.refreshTemplateList();
	}

	private refreshTemplateList() {
		if (!this.templateListContainer) return;

		this.templateListContainer.empty();

		const templates = this.getFilteredTemplates();

		if (templates.length === 0) {
			this.templateListContainer.createEl('p', {
				text: '没有找到匹配的模板',
				cls: 'template-empty-message'
			});
			return;
		}

		templates.forEach(template => {
			this.createTemplateItem(this.templateListContainer, template);
		});
	}

	private getFilteredTemplates(): SerializableTemplate[] {
		const allTemplates = this.templateManager.getAllTemplates();

		if (this.currentFilter === 'all') {
			return allTemplates;
		}

		return allTemplates.filter(template =>
			template.getConfig().noteType === this.currentFilter
		);
	}

	private createTemplateItem(container: HTMLElement, template: SerializableTemplate) {
		const config = template.getConfig();
		const itemEl = container.createDiv({ cls: 'template-item' });

		// 模板信息区域
		const infoEl = itemEl.createDiv({ cls: 'template-info' });

		const headerEl = infoEl.createDiv({ cls: 'template-header' });
		headerEl.createEl('h3', { text: config.name, cls: 'template-name' });
		headerEl.createEl('span', {
			text: config.noteType.toUpperCase(),
			cls: `template-type template-type-${config.noteType}`
		});

		infoEl.createEl('p', { text: config.description, cls: 'template-description' });

		const metaEl = infoEl.createDiv({ cls: 'template-meta' });
		metaEl.createEl('span', { text: `作者: ${config.author || '未知'}` });
		metaEl.createEl('span', { text: `版本: ${config.version}` });

		// 显示自定义字段数量
		if (config.customFields && config.customFields.length > 0) {
			metaEl.createEl('span', { text: `自定义字段: ${config.customFields.length}` });
		}

		// 操作按钮区域
		const actionsEl = itemEl.createDiv({ cls: 'template-actions' });

		// 预览按钮
		const previewButton = actionsEl.createEl('button', {
			text: '👁️ 预览',
			cls: 'template-action-button'
		});
		previewButton.addEventListener('click', () => {
			this.previewTemplate(template);
		});

		// 编辑按钮
		const editButton = actionsEl.createEl('button', {
			text: '✏️ 编辑',
			cls: 'template-action-button'
		});
		editButton.addEventListener('click', () => {
			this.openTemplateEditor(config);
		});

		// 导出按钮
		const exportButton = actionsEl.createEl('button', {
			text: '📤 导出',
			cls: 'template-action-button'
		});
		exportButton.addEventListener('click', () => {
			this.templateManager.exportTemplate(config.id);
		});

		// 删除按钮
		const deleteButton = actionsEl.createEl('button', {
			text: '🗑️ 删除',
			cls: 'template-action-button template-delete-button'
		});
		deleteButton.addEventListener('click', () => {
			this.deleteTemplate(config);
		});
	}

	private openTemplateEditor(config?: ITemplateConfig) {
		const editor = new TemplateEditorModal(
			this.app,
			this.templateManager,
			config,
			() => {
				this.refreshTemplateList();
			}
		);
		editor.open();
	}

	private previewTemplate(template: SerializableTemplate) {
		const preview = new TemplatePreviewModal(this.app, template);
		preview.open();
	}

	private importTemplate() {
		const input = document.createElement('input');
		input.type = 'file';
		input.accept = '.json';

		input.onchange = async (e) => {
			const file = (e.target as HTMLInputElement).files?.[0];
			if (file) {
				try {
					await this.templateManager.importTemplate(file);
					this.refreshTemplateList();
					new Notice('模板导入成功！');
				} catch (error) {
					new Notice('模板导入失败: ' + error.message);
				}
			}
		};

		input.click();
	}

	private async deleteTemplate(config: ITemplateConfig) {
		const confirmed = confirm(`确定要删除模板 "${config.name}" 吗？此操作不可恢复。`);
		if (confirmed) {
			try {
				await this.templateManager.deleteTemplate(config.id);
				this.refreshTemplateList();
				new Notice(`模板 "${config.name}" 已删除`);
			} catch (error) {
				new Notice('删除模板失败: ' + error.message);
			}
		}
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}
}

// 模板预览Modal
export class TemplatePreviewModal extends Modal {
	private template: SerializableTemplate;

	constructor(app: App, template: SerializableTemplate) {
		super(app);
		this.template = template;
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.empty();

		const config = this.template.getConfig();
		contentEl.createEl('h2', { text: `📋 预览: ${config.name}` });

		// 模板信息
		const infoSection = contentEl.createDiv({ cls: 'template-preview-info' });
		infoSection.createEl('p', { text: `类型: ${config.noteType.toUpperCase()}` });
		infoSection.createEl('p', { text: `描述: ${config.description}` });
		infoSection.createEl('p', { text: `作者: ${config.author || '未知'}` });

		if (config.customFields && config.customFields.length > 0) {
			infoSection.createEl('p', { text: `自定义字段: ${config.customFields.length} 个` });
		}

		// 生成示例数据
		const sampleProperties = this.generateSampleProperties(config.noteType, config.customFields);

		// 预览 Frontmatter
		const frontmatterSection = contentEl.createDiv({ cls: 'template-preview-section' });
		frontmatterSection.createEl('h3', { text: '📋 Frontmatter 预览' });
		const frontmatterPreview = frontmatterSection.createEl('pre', { cls: 'template-preview-content' });
		frontmatterPreview.textContent = this.template.generateFrontmatter(sampleProperties);

		// 预览 Body
		const bodySection = contentEl.createDiv({ cls: 'template-preview-section' });
		bodySection.createEl('h3', { text: '📝 Body 预览' });
		const bodyPreview = bodySection.createEl('pre', { cls: 'template-preview-content' });
		bodyPreview.textContent = this.template.generateBody(sampleProperties, '这里是自定义内容示例...');

		// 关闭按钮
		const buttonContainer = contentEl.createDiv({ cls: 'modal-button-container' });
		const closeButton = buttonContainer.createEl('button', { text: '关闭' });
		closeButton.addEventListener('click', () => this.close());
	}

	private generateSampleProperties(noteType: NoteType, customFields?: any[]): any {
		const baseProperties = {
			title: '示例笔记标题',
			type: noteType,
			created: '2024-01-01',
			id: 'sample-id-123',
			tags: ['示例', '标签'],
			source_notes: [],
			derived_notes: [],
			aliases: []
		};

		// 根据笔记类型添加特定属性
		switch (noteType) {
			case NoteType.LITERATURE:
				Object.assign(baseProperties, {
					author: '示例作者',
					publication_year: 2024,
					journal: '示例期刊',
					doi: '10.1000/sample'
				});
				break;
			case NoteType.FLEETING:
				Object.assign(baseProperties, {
					urgency: 'medium',
					energy: 'high'
				});
				break;
		}

		// 添加自定义字段的示例值
		if (customFields) {
			customFields.forEach(field => {
				if (field.key) {
					baseProperties[field.key] = this.getSampleValueForField(field);
				}
			});
		}

		return baseProperties;
	}

	private getSampleValueForField(field: any): any {
		switch (field.type) {
			case 'string':
				return field.key === 'author' ? '示例作者' : '示例文本';
			case 'number':
				return 42;
			case 'boolean':
				return true;
			case 'array':
				return ['示例1', '示例2'];
			case 'date':
				return '2024-01-01';
			default:
				return field.defaultValue || '示例值';
		}
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}
}
