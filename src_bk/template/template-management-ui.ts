// src/template/template-management-modal.ts
import { App, Modal, Notice, Setting } from 'obsidian';
import { TemplateManager, SerializableTemplate, ITemplateConfig } from './template-manager';
import { NoteType } from '../types';


export class TemplateManagementModal extends Modal {
	private templateManager: TemplateManager;
	private currentFilter: NoteType | 'all' = 'all';

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

	private templateListContainer: HTMLElement;

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
				await this.templateManager.importTemplate(file);
				this.refreshTemplateList();
			}
		};

		input.click();
	}

	private async deleteTemplate(config: ITemplateConfig) {
		const confirmed = confirm(`确定要删除模板 "${config.name}" 吗？此操作不可恢复。`);
		if (confirmed) {
			await this.templateManager.deleteTemplate(config.id);
			this.refreshTemplateList();
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
		contentEl.createEl('h2', { text: `预览: ${config.name}` });

		// 模板信息
		const infoSection = contentEl.createDiv({ cls: 'template-preview-info' });
		infoSection.createEl('p', { text: `类型: ${config.noteType.toUpperCase()}` });
		infoSection.createEl('p', { text: `描述: ${config.description}` });

		// 生成示例数据
		const sampleProperties = this.generateSampleProperties(config.noteType);

		// 预览 Frontmatter
		const frontmatterSection = contentEl.createDiv({ cls: 'template-preview-section' });
		frontmatterSection.createEl('h3', { text: 'Frontmatter 预览' });
		const frontmatterPreview = frontmatterSection.createEl('pre', { cls: 'template-preview-content' });
		frontmatterPreview.textContent = this.template.generateFrontmatter(sampleProperties);

		// 预览 Body
		const bodySection = contentEl.createDiv({ cls: 'template-preview-section' });
		bodySection.createEl('h3', { text: 'Body 预览' });
		const bodyPreview = bodySection.createEl('pre', { cls: 'template-preview-content' });
		bodyPreview.textContent = this.template.generateBody(sampleProperties, '这里是自定义内容示例...');

		// 关闭按钮
		const buttonContainer = contentEl.createDiv({ cls: 'modal-button-container' });
		const closeButton = buttonContainer.createEl('button', { text: '关闭' });
		closeButton.addEventListener('click', () => this.close());
	}

	private generateSampleProperties(noteType: NoteType): any {
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
				return {
					...baseProperties,
					author: '示例作者',
					publication_year: 2024,
					journal: '示例期刊',
					doi: '10.1000/sample'
				};
			case NoteType.FLEETING:
				return {
					...baseProperties,
					urgency: 'medium',
					energy: 'high'
				};
			default:
				return baseProperties;
		}
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}
}

// 更新设置页面添加模板管理
export class TemplateSettingTab {
	private containerEl: HTMLElement;
	private templateManager: TemplateManager;
	private app: App;

	constructor(containerEl: HTMLElement, app: App, templateManager: TemplateManager) {
		this.containerEl = containerEl;
		this.app = app;
		this.templateManager = templateManager;
	}

	public display(): void {
		this.containerEl.empty();

		this.containerEl.createEl('h2', { text: '📝 模板管理' });
		this.containerEl.createEl('p', {
			text: '管理和自定义您的笔记模板。模板支持变量替换和自定义字段。',
			cls: 'setting-section-description'
		});

		// 模板统计
		this.createTemplateStats();

		// 模板管理按钮
		this.createManagementButtons();

		// 默认模板设置
		this.createDefaultTemplateSettings();

		// 模板路径设置
		this.createTemplatePathSetting();

		// 帮助信息
		this.createHelpSection();
	}

	private createTemplateStats() {
		const statsSection = this.containerEl.createDiv({ cls: 'template-stats-section' });
		statsSection.createEl('h3', { text: '📊 模板统计' });

		const statsGrid = statsSection.createDiv({ cls: 'template-stats-grid' });

		Object.values(NoteType).forEach(type => {
			if (type !== NoteType.UNKNOWN) {
				const templates = this.templateManager.getTemplatesForType(type);
				const statItem = statsGrid.createDiv({ cls: 'template-stat-item' });
				statItem.createEl('div', { text: type.toUpperCase(), cls: 'stat-label' });
				statItem.createEl('div', { text: templates.length.toString(), cls: 'stat-value' });
			}
		});
	}

	private createManagementButtons() {
		const buttonSection = this.containerEl.createDiv({ cls: 'template-management-buttons' });

		new Setting(buttonSection)
			.setName('模板管理')
			.setDesc('打开模板管理界面，创建、编辑和删除模板')
			.addButton(button => button
				.setButtonText('打开模板管理器')
				.setCta()
				.onClick(() => {
					const modal = new TemplateManagementModal(this.app, this.templateManager);
					modal.open();
				}));

		new Setting(buttonSection)
			.setName('重新加载模板')
			.setDesc('从文件系统重新加载所有模板')
			.addButton(button => button
				.setButtonText('重新加载')
				.onClick(async () => {
					await this.templateManager.loadTemplates();
					this.display(); // 刷新页面
					new Notice('模板已重新加载');
				}));
	}

	private createDefaultTemplateSettings() {
		const defaultSection = this.containerEl.createDiv({ cls: 'template-default-section' });
		defaultSection.createEl('h3', { text: '🎯 默认模板设置' });

		Object.values(NoteType).forEach(type => {
			if (type !== NoteType.UNKNOWN) {
				const templates = this.templateManager.getTemplatesForType(type);

				new Setting(defaultSection)
					.setName(`${type.toUpperCase()} 默认模板`)
					.setDesc(`选择 ${type} 类型笔记的默认模板`)
					.addDropdown(dropdown => {
						dropdown.addOption('', '使用内置模板');
						templates.forEach(template => {
							const config = template.getConfig();
							dropdown.addOption(config.id, config.name);
						});

						// TODO: 从设置中获取当前值
						dropdown.onChange((value) => {
							// TODO: 保存到设置
						});
					});
			}
		});
	}

	private createTemplatePathSetting() {
		new Setting(this.containerEl)
			.setName('模板存储路径')
			.setDesc('模板文件的存储位置（相对于 vault 根目录）')
			.addText(text => text
				.setPlaceholder('.zettelkasten/templates')
				.setValue('.zettelkasten/templates') // TODO: 从设置获取
				.onChange((value) => {
					// TODO: 更新模板管理器的路径
				}));
	}

	private createHelpSection() {
		const helpSection = this.containerEl.createDiv({ cls: 'template-help-section' });
		helpSection.createEl('h3', { text: '❓ 使用说明' });

		const helpContent = helpSection.createDiv({ cls: 'template-help-content' });

		helpContent.createEl('h4', { text: '模板变量' });
		const variableList = helpContent.createEl('ul');
		const variables = [
			'{{title}} - 笔记标题',
			'{{type}} - 笔记类型',
			'{{created}} - 创建日期',
			'{{id}} - 唯一标识符',
			'{{tags}} - 标签数组',
			'{{current_date}} - 当前日期',
			'{{current_time}} - 当前时间戳',
			'{{custom_content}} - 自定义内容插入点'
		];
		variables.forEach(variable => {
			variableList.createEl('li', { text: variable });
		});

		helpContent.createEl('h4', { text: '模板文件格式' });
		helpContent.createEl('p', {
			text: '模板以 JSON 格式存储，包含 frontmatter 模板和 body 模板。可以通过模板管理器创建和编辑，也可以手动编写 JSON 文件。'
		});

		helpContent.createEl('h4', { text: '导入/导出' });
		helpContent.createEl('p', {
			text: '支持导入和导出模板文件，便于在不同设备间同步模板或分享给其他用户。'
		});
	}
}
