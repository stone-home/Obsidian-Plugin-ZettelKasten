// main.ts - 最终整合版本
import { App, MarkdownView, Modal, Notice, Plugin, PluginSettingTab, Setting, TFile } from 'obsidian';
import { NoteType, ZettelkastenSettings, DEFAULT_SETTINGS } from './types';
import { NoteFactory } from './notes/note-factory';
import { BaseNote } from './notes/base-note';
import { TemplateManager, SerializableTemplate } from './template/template-manager';
import { TemplateManagementModal } from './template/template-management';
import { TemplateEditorModal } from './template/template-editor';
import { Logger } from './logger';

// 扩展设置接口
interface ExtendedZettelkastenSettings extends ZettelkastenSettings {
	templatePath: string;
	defaultTemplates: Record<NoteType, string>;
	autoApplyTemplate: boolean;
	debugMode: boolean;
}

// 扩展默认设置
const EXTENDED_DEFAULT_SETTINGS: ExtendedZettelkastenSettings = {
	...DEFAULT_SETTINGS,
	templatePath: '.zettelkasten/templates',
	defaultTemplates: {
		[NoteType.FLEETING]: '',
		[NoteType.LITERATURE]: '',
		[NoteType.ATOMIC]: '',
		[NoteType.PERMANENT]: '',
		[NoteType.UNKNOWN]: ''
	},
	autoApplyTemplate: true,
	debugMode: false
};

// 文件名输入Modal
class FileNameModal extends Modal {
	noteType: NoteType;
	templateManager: TemplateManager;
	onSubmit: (fileName: string | null, templateId?: string) => void;
	private selectedTemplateId: string = '';

	constructor(
		app: App,
		noteType: NoteType,
		templateManager: TemplateManager,
		onSubmit: (fileName: string | null, templateId?: string) => void
	) {
		super(app);
		this.noteType = noteType;
		this.templateManager = templateManager;
		this.onSubmit = onSubmit;
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.empty();

		contentEl.createEl("h2", { text: `创建 ${this.noteType.toUpperCase()} 笔记` });

		const form = contentEl.createEl("form");
		form.addEventListener("submit", (e) => {
			e.preventDefault();
			const fileName = (form.querySelector("input[name='filename']") as HTMLInputElement).value.trim();
			if (fileName) {
				this.onSubmit(fileName, this.selectedTemplateId || undefined);
				this.close();
			}
		});

		// 文件名输入
		const inputContainer = form.createDiv({ cls: "file-name-input-container" });
		inputContainer.createEl("label", { text: "文件名:", cls: "file-name-label" });

		const input = inputContainer.createEl("input", {
			type: "text",
			name: "filename",
			placeholder: `输入 ${this.noteType} 笔记的名称...`,
			cls: "file-name-input"
		});

		// 模板选择
		const templates = this.templateManager.getTemplatesForType(this.noteType);
		if (templates.length > 0) {
			const templateContainer = form.createDiv({ cls: "template-selection-container" });
			templateContainer.createEl("label", { text: "选择模板:", cls: "template-selection-label" });

			const templateSelect = templateContainer.createEl("select", { cls: "template-select" });
			templateSelect.createEl("option", { value: "", text: "默认模板" });

			templates.forEach(template => {
				const config = template.getConfig();
				templateSelect.createEl("option", {
					value: config.id,
					text: config.name
				});
			});

			templateSelect.addEventListener("change", (e) => {
				this.selectedTemplateId = (e.target as HTMLSelectElement).value;
			});
		}

		setTimeout(() => input.focus(), 100);

		const buttonContainer = form.createDiv({ cls: "modal-button-container" });

		const createButton = buttonContainer.createEl("button", {
			type: "submit",
			text: "创建",
			cls: "mod-cta"
		});

		const cancelButton = buttonContainer.createEl("button", {
			type: "button",
			text: "取消"
		});

		cancelButton.addEventListener("click", () => {
			this.onSubmit(null);
			this.close();
		});
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}
}

// 工作流向导Modal
export class ZettelWorkflowModal extends Modal {
	plugin: ZettelkastenWorkflow;
	templateManager: TemplateManager;
	noteFactory: NoteFactory;
	currentNoteType: NoteType = NoteType.UNKNOWN;

	constructor(app: App, plugin: ZettelkastenWorkflow) {
		super(app);
		this.plugin = plugin;
		this.templateManager = plugin.templateManager;
		this.noteFactory = plugin.noteFactory;
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.empty();

		this.detectCurrentNoteType();
		contentEl.createEl("h1", { text: "🧠 Zettelkasten 工作流向导" });
		this.createCurrentNoteSection(contentEl);
		this.createWorkflowOptions(contentEl);

		const buttonDiv = contentEl.createDiv({ cls: "modal-button-container" });
		const cancelButton = buttonDiv.createEl("button", { text: "取消" });
		cancelButton.addEventListener("click", () => {
			this.close();
		});
	}

	private detectCurrentNoteType() {
		const activeFile = this.app.workspace.getActiveFile();
		if (!activeFile) {
			this.currentNoteType = NoteType.UNKNOWN;
			return;
		}

		const frontmatter = this.app.metadataCache.getFileCache(activeFile)?.frontmatter;
		if (frontmatter?.note_type) {
			this.currentNoteType = frontmatter.note_type as NoteType;
		} else {
			this.currentNoteType = NoteType.UNKNOWN;
		}
	}

	private createCurrentNoteSection(contentEl: HTMLElement) {
		const section = contentEl.createDiv({ cls: "zettel-current-note-section" });
		section.createEl("h3", { text: "📝 当前笔记信息" });

		const activeFile = this.app.workspace.getActiveFile();
		if (activeFile) {
			section.createEl("p", { text: `文件名: ${activeFile.basename}` });
			section.createEl("p", { text: `类型: ${this.getNoteTypeDisplay(this.currentNoteType)}` });
		} else {
			section.createEl("p", {
				text: "⚠️ 未选择任何笔记",
				cls: "zettel-warning"
			});
		}
	}

	private createWorkflowOptions(contentEl: HTMLElement) {
		const section = contentEl.createDiv({ cls: "zettel-workflow-section" });

		const activeFile = this.app.workspace.getActiveFile();
		const hasActiveNote = activeFile && this.currentNoteType !== NoteType.UNKNOWN;

		// 升级选项
		if (hasActiveNote) {
			const upgradeSection = section.createDiv({ cls: "zettel-upgrade-section" });
			upgradeSection.createEl("h3", { text: "⬆️ 升级当前笔记" });
			upgradeSection.createEl("p", {
				text: "创建新笔记并建立关联关系",
				cls: "zettel-section-desc"
			});

			const upgradeWorkflows = this.getUpgradeWorkflows();
			if (upgradeWorkflows.length === 0) {
				upgradeSection.createEl("p", {
					text: "当前笔记类型没有可用的升级选项",
					cls: "zettel-info"
				});
			} else {
				upgradeWorkflows.forEach(workflow => {
					const button = upgradeSection.createEl("button", {
						text: workflow.label,
						cls: "zettel-workflow-button zettel-upgrade-button"
					});

					button.addEventListener("click", () => {
						this.executeUpgradeWorkflow(workflow);
					});
				});
			}

			section.createEl("hr", { cls: "zettel-divider" });
		}

		// 创建新笔记选项
		const createSection = section.createDiv({ cls: "zettel-create-section" });
		createSection.createEl("h3", { text: "✨ 创建新笔记" });
		createSection.createEl("p", {
			text: "创建独立的新笔记",
			cls: "zettel-section-desc"
		});

		const createWorkflows = this.getCreateWorkflows();
		createWorkflows.forEach(workflow => {
			const button = createSection.createEl("button", {
				text: workflow.label,
				cls: "zettel-workflow-button zettel-create-button"
			});

			button.addEventListener("click", () => {
				this.executeCreateWorkflow(workflow);
			});
		});
	}

	private getUpgradeWorkflows() {
		const workflows = [];

		switch (this.currentNoteType) {
			case NoteType.FLEETING:
				workflows.push(
					{
						id: 'fleeting-to-literature',
						label: '📚 升级为 Literature 笔记',
						targetType: NoteType.LITERATURE
					},
					{
						id: 'fleeting-to-atomic',
						label: '⚛️ 升级为 Atomic 笔记',
						targetType: NoteType.ATOMIC
					}
				);
				break;

			case NoteType.LITERATURE:
				workflows.push(
					{
						id: 'literature-to-atomic',
						label: '⚛️ 升级为 Atomic 笔记',
						targetType: NoteType.ATOMIC
					},
					{
						id: 'literature-to-permanent',
						label: '📝 升级为 Permanent 笔记',
						targetType: NoteType.PERMANENT
					}
				);
				break;

			case NoteType.ATOMIC:
				workflows.push(
					{
						id: 'atomic-to-permanent',
						label: '📝 升级为 Permanent 笔记',
						targetType: NoteType.PERMANENT
					}
				);
				break;
		}

		return workflows;
	}

	private getCreateWorkflows() {
		return [
			{
				id: 'create-fleeting',
				label: '🕒 创建 Fleeting 笔记',
				noteType: NoteType.FLEETING
			},
			{
				id: 'create-literature',
				label: '📚 创建 Literature 笔记',
				noteType: NoteType.LITERATURE
			},
			{
				id: 'create-atomic',
				label: '⚛️ 创建 Atomic 笔记',
				noteType: NoteType.ATOMIC
			},
			{
				id: 'create-permanent',
				label: '📝 创建 Permanent 笔记',
				noteType: NoteType.PERMANENT
			}
		];
	}

	private getNoteTypeDisplay(type: NoteType): string {
		const typeMap = {
			[NoteType.FLEETING]: '🕒 Fleeting (临时笔记)',
			[NoteType.LITERATURE]: '📚 Literature (文献笔记)',
			[NoteType.PERMANENT]: '📝 Permanent (永久笔记)',
			[NoteType.ATOMIC]: '⚛️ Atomic (原子笔记)',
			[NoteType.UNKNOWN]: '❓ 未知类型'
		};
		return typeMap[type];
	}

	private async executeCreateWorkflow(workflow: any) {
		const noteType = workflow.noteType;
		await this.createNewNoteWithTemplate(noteType);
		this.close();
	}

	private async executeUpgradeWorkflow(workflow: any) {
		const sourceFile = this.app.workspace.getActiveFile();
		if (!sourceFile) {
			new Notice('请先选择要升级的笔记');
			return;
		}

		const targetType = workflow.targetType;
		await this.upgradeNoteToType(targetType, sourceFile);
		this.close();
	}

	private async createNewNoteWithTemplate(noteType: NoteType) {
		const result = await this.promptForFileNameAndTemplate(noteType);
		if (!result.fileName) return;

		try {
			const note = this.noteFactory.createNote(noteType, result.fileName);

			const folderPath = this.plugin.getFolderPathForType(noteType);
			note.setPath(folderPath);

			const file = await note.save();
			if (this.plugin.settings.autoOpenNewNote) {
				await this.app.workspace.getLeaf().openFile(file);
			}

			new Notice(`✅ ${noteType} 笔记已创建: ${result.fileName}`);
		} catch (error) {
			new Notice(`❌ 创建失败: ${error.message}`);
			Logger.error('创建笔记错误:', error);
		}
	}

	private async upgradeNoteToType(targetType: NoteType, sourceFile: TFile) {
		const result = await this.promptForFileNameAndTemplate(targetType);
		if (!result.fileName) return;

		try {
			const newNote = this.noteFactory.createNote(targetType, result.fileName);

			const folderPath = this.plugin.getFolderPathForType(targetType);
			newNote.setPath(folderPath);
			newNote.addSourceNote(sourceFile.basename);

			const newFile = await newNote.save();
			await this.addDerivedNoteLink(sourceFile, newFile.basename);

			if (this.plugin.settings.autoOpenNewNote) {
				await this.app.workspace.getLeaf().openFile(newFile);
			}

			new Notice(`✅ 升级完成！已创建: ${result.fileName}`);
		} catch (error) {
			new Notice(`❌ 升级失败: ${error.message}`);
			Logger.error('升级笔记错误:', error);
		}
	}

	private async promptForFileNameAndTemplate(noteType: NoteType): Promise<{fileName: string | null, templateId?: string}> {
		return new Promise((resolve) => {
			const modal = new FileNameModal(
				this.app,
				noteType,
				this.templateManager,
				(fileName, templateId) => {
					resolve({ fileName, templateId });
				}
			);
			modal.open();
		});
	}

	private async addDerivedNoteLink(sourceFile: TFile, newNoteName: string) {
		try {
			const content = await this.app.vault.read(sourceFile);
			const updatedContent = this.updateFrontmatterArray(
				content,
				'derived_notes',
				`[[${newNoteName}]]`
			);
			await this.app.vault.modify(sourceFile, updatedContent);
		} catch (error) {
			Logger.error('添加derived_notes链接失败:', error);
		}
	}

	private updateFrontmatterArray(content: string, fieldName: string, newValue: string): string {
		const lines = content.split('\n');
		const frontmatterStart = lines.findIndex(line => line.trim() === '---');
		const frontmatterEnd = lines.findIndex((line, index) =>
			index > frontmatterStart && line.trim() === '---'
		);

		if (frontmatterStart === -1 || frontmatterEnd === -1) {
			return content;
		}

		const frontmatterLines = lines.slice(frontmatterStart + 1, frontmatterEnd);
		const fieldIndex = frontmatterLines.findIndex(line =>
			line.trim().startsWith(`${fieldName}:`)
		);

		if (fieldIndex !== -1) {
			const fieldLine = frontmatterLines[fieldIndex];
			if (fieldLine.includes('[]')) {
				frontmatterLines[fieldIndex] = `${fieldName}: ["${newValue}"]`;
			} else if (fieldLine.includes('[') && fieldLine.includes(']')) {
				const currentValue = fieldLine.substring(fieldLine.indexOf('['));
				const values = currentValue.slice(1, -1);
				if (values.trim() === '') {
					frontmatterLines[fieldIndex] = `${fieldName}: ["${newValue}"]`;
				} else {
					frontmatterLines[fieldIndex] = `${fieldName}: [${values}, "${newValue}"]`;
				}
			} else {
				frontmatterLines[fieldIndex] = `${fieldName}: ["${newValue}"]`;
			}
		} else {
			frontmatterLines.push(`${fieldName}: ["${newValue}"]`);
		}

		const newLines = [
			...lines.slice(0, frontmatterStart + 1),
			...frontmatterLines,
			...lines.slice(frontmatterEnd)
		];

		return newLines.join('\n');
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}
}

// 主插件类
export default class ZettelkastenWorkflow extends Plugin {
	settings: ExtendedZettelkastenSettings;
	templateManager: TemplateManager;
	noteFactory: NoteFactory;

	async onload() {
		await this.loadSettings();

		Logger.setDebugMode(this.settings.debugMode);

		this.templateManager = new TemplateManager(this.app);
		this.noteFactory = new NoteFactory(this.app);

		await this.templateManager.loadTemplates();

		// 添加侧边栏图标
		const ribbonIconEl = this.addRibbonIcon('workflow', 'Zettelkasten 工作流', () => {
			new ZettelWorkflowModal(this.app, this).open();
		});
		ribbonIconEl.addClass('zettelkasten-ribbon-class');

		// 添加状态栏
		const statusBarItemEl = this.addStatusBarItem();
		statusBarItemEl.setText('Zettelkasten Ready');

		// 添加命令
		this.addCommand({
			id: 'open-zettel-workflow',
			name: '打开 Zettelkasten 工作流向导',
			callback: () => {
				new ZettelWorkflowModal(this.app, this).open();
			}
		});

		this.addCommand({
			id: 'open-template-manager',
			name: '打开模板管理器',
			callback: () => {
				new TemplateManagementModal(this.app, this.templateManager).open();
			}
		});

		this.addCommand({
			id: 'create-new-template',
			name: '创建新模板',
			callback: () => {
				new TemplateEditorModal(this.app, this.templateManager).open();
			}
		});

		// 快速创建笔记的命令
		Object.values(NoteType).forEach(noteType => {
			if (noteType !== NoteType.UNKNOWN) {
				this.addCommand({
					id: `quick-create-${noteType}`,
					name: `快速创建 ${noteType.toUpperCase()} 笔记`,
					callback: () => {
						this.quickCreateNoteWithTemplate(noteType);
					}
				});
			}
		});

		// 添加设置选项卡
		this.addSettingTab(new ZettelkastenSettingTab(this.app, this));

		// 注册模板文件监听器
		this.registerEvent(
			this.app.vault.on('create', (file) => {
				if (file.path.startsWith(this.settings.templatePath) && file.extension === 'json') {
					this.templateManager.loadTemplates();
				}
			})
		);

		this.registerEvent(
			this.app.vault.on('modify', (file) => {
				if (file.path.startsWith(this.settings.templatePath) && file.extension === 'json') {
					this.templateManager.loadTemplates();
				}
			})
		);

		Logger.info('Zettelkasten Workflow 插件已加载');
	}

	onunload() {
		Logger.info('Zettelkasten Workflow 插件已卸载');
	}

	async loadSettings() {
		this.settings = Object.assign({}, EXTENDED_DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	private async quickCreateNoteWithTemplate(type: NoteType) {
		try {
			const timestamp = new Date().toISOString().replace(/[-:.]/g, '').slice(0, 15);
			const fileName = `${type}-${timestamp}`;

			const note = this.noteFactory.createNote(type, fileName);
			const folderPath = this.getFolderPathForType(type);
			note.setPath(folderPath);

			const file = await note.save();

			if (this.settings.autoOpenNewNote) {
				await this.app.workspace.getLeaf().openFile(file);
			}

			new Notice(`✅ ${type} 笔记已创建: ${fileName}`);
		} catch (error) {
			new Notice(`❌ 创建笔记失败: ${error.message}`);
			Logger.error('快速创建笔记错误:', error);
		}
	}

	public getFolderPathForType(type: NoteType): string {
		switch (type) {
			case NoteType.FLEETING:
				return this.settings.literaturePath;
			case NoteType.PERMANENT:
				return this.settings.permanentPath;
			case NoteType.ATOMIC:
				return this.settings.atomicPath;
			default:
				return this.settings.fleetingPath;
		}
	}
}

// 设置选项卡
class ZettelkastenSettingTab extends PluginSettingTab {
	plugin: ZettelkastenWorkflow;
	private activeTab: string = 'basic';

	constructor(app: App, plugin: ZettelkastenWorkflow) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		containerEl.createEl('h1', { text: 'Zettelkasten 工作流设置' });

		this.createTabNavigation(containerEl);

		const contentEl = containerEl.createDiv({ cls: 'zettel-settings-content' });

		switch (this.activeTab) {
			case 'basic':
				this.displayBasicSettings(contentEl);
				break;
			case 'paths':
				this.displayPathSettings(contentEl);
				break;
			case 'templates':
				this.displayTemplateSettings(contentEl);
				break;
			case 'advanced':
				this.displayAdvancedSettings(contentEl);
				break;
		}
	}

	private createTabNavigation(containerEl: HTMLElement) {
		const tabNavEl = containerEl.createDiv({ cls: 'zettel-tab-navigation' });

		const tabs = [
			{ id: 'basic', name: '🔧 基础设置', desc: '核心功能配置' },
			{ id: 'paths', name: '📁 路径设置', desc: '笔记保存路径' },
			{ id: 'templates', name: '📝 模板设置', desc: '模板管理和配置' },
			{ id: 'advanced', name: '⚙️ 高级设置', desc: '高级功能选项' }
		];

		tabs.forEach(tab => {
			const tabEl = tabNavEl.createDiv({
				cls: `zettel-tab ${this.activeTab === tab.id ? 'active' : ''}`
			});

			const tabButton = tabEl.createEl('button', {
				text: tab.name,
				cls: 'zettel-tab-button'
			});

			tabButton.createEl('div', {
				text: tab.desc,
				cls: 'zettel-tab-desc'
			});

			tabButton.addEventListener('click', () => {
				this.activeTab = tab.id;
				this.display();
			});
		});
	}

	private displayBasicSettings(contentEl: HTMLElement) {
		contentEl.createEl('h2', { text: '🔧 基础设置' });

		new Setting(contentEl)
			.setName('自动打开新笔记')
			.setDesc('创建新笔记后自动在编辑器中打开')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.autoOpenNewNote)
				.onChange(async (value) => {
					this.plugin.settings.autoOpenNewNote = value;
					await this.plugin.saveSettings();
				}));

		new Setting(contentEl)
			.setName('显示升级通知')
			.setDesc('笔记升级完成后显示成功通知')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.showUpgradeNotifications)
				.onChange(async (value) => {
					this.plugin.settings.showUpgradeNotifications = value;
					await this.plugin.saveSettings();
				}));

		new Setting(contentEl)
			.setName('启用自动链接')
			.setDesc('自动检测并创建相关笔记之间的链接')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.enableAutoLinking)
				.onChange(async (value) => {
					this.plugin.settings.enableAutoLinking = value;
					await this.plugin.saveSettings();
				}));

		new Setting(contentEl)
			.setName('自动应用模板')
			.setDesc('创建新笔记时自动应用对应的默认模板')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.autoApplyTemplate)
				.onChange(async (value) => {
					this.plugin.settings.autoApplyTemplate = value;
					await this.plugin.saveSettings();
				}));

		new Setting(contentEl)
			.setName('调试模式')
			.setDesc('启用详细的调试日志输出（在开发者控制台中查看）')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.debugMode)
				.onChange(async (value) => {
					this.plugin.settings.debugMode = value;
					Logger.setDebugMode(value);
					await this.plugin.saveSettings();
				}));
	}

	private displayPathSettings(contentEl: HTMLElement) {
		contentEl.createEl('h2', { text: '📁 路径设置' });

		new Setting(contentEl)
			.setName('🕒 Fleeting 笔记路径')
			.setDesc('临时笔记的默认保存路径')
			.addText(text => text
				.setPlaceholder('例如: 000-inbox/1-fleeting')
				.setValue(this.plugin.settings.fleetingPath)
				.onChange(async (value) => {
					this.plugin.settings.fleetingPath = value;
					await this.plugin.saveSettings();
				}));

		new Setting(contentEl)
			.setName('📚 Literature 笔记路径')
			.setDesc('文献笔记的默认保存路径')
			.addText(text => text
				.setPlaceholder('例如: 000-inbox/2-literature')
				.setValue(this.plugin.settings.literaturePath)
				.onChange(async (value) => {
					this.plugin.settings.literaturePath = value;
					await this.plugin.saveSettings();
				}));

		new Setting(contentEl)
			.setName('📝 Permanent 笔记路径')
			.setDesc('永久笔记的默认保存路径')
			.addText(text => text
				.setPlaceholder('例如: 000-inbox/3-permanent')
				.setValue(this.plugin.settings.permanentPath)
				.onChange(async (value) => {
					this.plugin.settings.permanentPath = value;
					await this.plugin.saveSettings();
				}));

		new Setting(contentEl)
			.setName('⚛️ Atomic 笔记路径')
			.setDesc('原子笔记的默认保存路径')
			.addText(text => text
				.setPlaceholder('例如: 000-inbox/4-atoms')
				.setValue(this.plugin.settings.atomicPath)
				.onChange(async (value) => {
					this.plugin.settings.atomicPath = value;
					await this.plugin.saveSettings();
				}));

		new Setting(contentEl)
			.setName('重置为默认路径')
			.setDesc('将所有路径重置为插件默认值')
			.addButton(button => button
				.setButtonText('重置路径')
				.setCta()
				.onClick(async () => {
					this.plugin.settings.fleetingPath = EXTENDED_DEFAULT_SETTINGS.fleetingPath;
					this.plugin.settings.literaturePath = EXTENDED_DEFAULT_SETTINGS.literaturePath;
					this.plugin.settings.permanentPath = EXTENDED_DEFAULT_SETTINGS.permanentPath;
					this.plugin.settings.atomicPath = EXTENDED_DEFAULT_SETTINGS.atomicPath;
					await this.plugin.saveSettings();
					this.display();
				}));
	}

	private displayTemplateSettings(contentEl: HTMLElement) {
		contentEl.createEl('h2', { text: '📝 模板设置' });

		new Setting(contentEl)
			.setName('模板存储路径')
			.setDesc('模板文件的存储位置（相对于 vault 根目录）')
			.addText(text => text
				.setPlaceholder('.zettelkasten/templates')
				.setValue(this.plugin.settings.templatePath)
				.onChange(async (value) => {
					this.plugin.settings.templatePath = value;
					await this.plugin.saveSettings();
				}));

		new Setting(contentEl)
			.setName('模板管理器')
			.setDesc('打开模板管理界面，创建、编辑和删除模板')
			.addButton(button => button
				.setButtonText('打开模板管理器')
				.setCta()
				.onClick(() => {
					new TemplateManagementModal(this.app, this.plugin.templateManager).open();
				}));

		contentEl.createEl('h3', { text: '默认模板设置' });
		Object.values(NoteType).forEach(type => {
			if (type !== NoteType.UNKNOWN) {
				const templates = this.plugin.templateManager.getTemplatesForType(type);

				new Setting(contentEl)
					.setName(`${type.toUpperCase()} 默认模板`)
					.setDesc(`选择 ${type} 类型笔记的默认模板`)
					.addDropdown(dropdown => {
						dropdown.addOption('', '使用内置模板');
						templates.forEach(template => {
							const config = template.getConfig();
							dropdown.addOption(config.id, config.name);
						});

						dropdown.setValue(this.plugin.settings.defaultTemplates[type] || '');
						dropdown.onChange(async (value) => {
							this.plugin.settings.defaultTemplates[type] = value;
							await this.plugin.saveSettings();
						});
					});
			}
		});

		contentEl.createEl('h3', { text: '模板统计' });
		const statsContainer = contentEl.createDiv({ cls: 'template-stats-container' });
		Object.values(NoteType).forEach(type => {
			if (type !== NoteType.UNKNOWN) {
				const templates = this.plugin.templateManager.getTemplatesForType(type);
				const statEl = statsContainer.createDiv({ cls: 'template-stat' });
				statEl.createEl('span', { text: `${type.toUpperCase()}: ` });
				statEl.createEl('strong', { text: templates.length.toString() });
			}
		});
	}

	private displayAdvancedSettings(contentEl: HTMLElement) {
		contentEl.createEl('h2', { text: '⚙️ 高级设置' });

		new Setting(contentEl)
			.setName('最大最近笔记数量')
			.setDesc('在快速访问列表中显示的最近笔记数量')
			.addSlider(slider => slider
				.setLimits(5, 50, 5)
				.setValue(this.plugin.settings.maxRecentNotes)
				.setDynamicTooltip()
				.onChange(async (value) => {
					this.plugin.settings.maxRecentNotes = value;
					await this.plugin.saveSettings();
				}));

		new Setting(contentEl)
			.setName('🔄 重置所有设置')
			.setDesc('将所有设置重置为默认值（需要重启插件）')
			.addButton(button => button
				.setButtonText('重置所有设置')
				.setWarning()
				.onClick(async () => {
					const confirmed = confirm(
						'确定要重置所有设置吗？这将清除所有自定义配置并需要重启插件。'
					);
					if (confirmed) {
						this.plugin.settings = { ...EXTENDED_DEFAULT_SETTINGS };
						await this.plugin.saveSettings();
						new Notice('设置已重置，请重新加载插件以生效。');
					}
				}));

		contentEl.createEl('h3', { text: '调试信息' });
		const debugContainer = contentEl.createDiv({ cls: 'debug-info-container' });
		debugContainer.createEl('p', { text: `模板数量: ${this.plugin.templateManager.getAllTemplates().length}` });
		debugContainer.createEl('p', { text: `模板路径: ${this.plugin.settings.templatePath}` });
	}
}
