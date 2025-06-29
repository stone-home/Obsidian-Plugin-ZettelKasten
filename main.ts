// main.ts - 基于官方示例改造的zettelkasten插件
import { App, Editor, MarkdownView, Modal, Notice, Plugin, PluginSettingTab, Setting } from 'obsidian';

// 笔记类型枚举
export enum NoteType {
	FLEETING = 'fleeting',
	LITERATURE = 'literature',
	PERMANENT = 'permanent',
	ATOMIC = 'atomic',
	UNKNOWN = 'unknown'
}

// 插件设置接口
interface ZettelkastenSettings {
	fleetingPath: string;
	literaturePath: string;
	permanentPath: string;
	atomicPath: string;
	useTemplater: boolean;
}

// 默认设置
const DEFAULT_SETTINGS: ZettelkastenSettings = {
	fleetingPath: '000-inbox/1-fleeting',
	literaturePath: '000-inbox/2-literature',
	permanentPath: '000-inbox/3-permanent',
	atomicPath: '000-inbox/4-atoms',
	useTemplater: true
}

// 文件名输入Modal
class FileNameModal extends Modal {
	noteType: NoteType;
	onSubmit: (fileName: string | null) => void;

	constructor(app: App, noteType: NoteType, onSubmit: (fileName: string | null) => void) {
		super(app);
		this.noteType = noteType;
		this.onSubmit = onSubmit;
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.empty();

		contentEl.createEl("h2", { text: `创建 ${this.noteType.toUpperCase()} 笔记` });

		const form = contentEl.createEl("form");
		form.addEventListener("submit", (e) => {
			e.preventDefault();
			const fileName = (form.querySelector("input") as HTMLInputElement).value.trim();
			if (fileName) {
				this.onSubmit(fileName);
				this.close();
			}
		});

		const inputContainer = form.createDiv({ cls: "file-name-input-container" });
		inputContainer.createEl("label", { text: "文件名:", cls: "file-name-label" });

		const input = inputContainer.createEl("input", {
			type: "text",
			placeholder: `输入 ${this.noteType} 笔记的名称...`,
			cls: "file-name-input"
		});

		// 自动聚焦
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
	currentNoteType: NoteType = NoteType.UNKNOWN;

	constructor(app: App, plugin: ZettelkastenWorkflow) {
		super(app);
		this.plugin = plugin;
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.empty();

		// 检测当前笔记类型
		this.detectCurrentNoteType();

		// 创建标题
		contentEl.createEl("h1", { text: "🧠 Zettelkasten 工作流向导" });

		// 显示当前笔记信息
		this.createCurrentNoteSection(contentEl);

		// 显示可用工作流
		this.createWorkflowOptions(contentEl);

		// 添加取消按钮
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

		// 如果有激活的笔记，显示升级选项
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
						this.executeWorkflow(workflow);
					});
				});
			}

			// 分隔线
			section.createEl("hr", { cls: "zettel-divider" });
		}

		// 创建新笔记选项（始终显示）
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
				this.executeWorkflow(workflow);
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
						type: 'upgrade'
					},
					{
						id: 'fleeting-to-atomic',
						label: '⚛️ 升级为 Atomic 笔记',
						type: 'upgrade'
					}
				);
				break;

			case NoteType.LITERATURE:
				workflows.push(
					{
						id: 'literature-to-atomic',
						label: '⚛️ 升级为 Atomic 笔记',
						type: 'upgrade'
					},
					{
						id: 'literature-to-permanent',
						label: '📝 升级为 Permanent 笔记',
						type: 'upgrade'
					}
				);
				break;

			case NoteType.ATOMIC:
				workflows.push(
					{
						id: 'atomic-merge',
						label: '🔗 与其他 Atomic 笔记合并',
						type: 'upgrade'
					},
					{
						id: 'atomic-to-permanent',
						label: '📝 升级为 Permanent 笔记',
						type: 'upgrade'
					}
				);
				break;

			case NoteType.PERMANENT:
				workflows.push(
					{
						id: 'permanent-blog',
						label: '📄 发布为 Blog',
						type: 'upgrade'
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
				type: 'create'
			},
			{
				id: 'create-literature',
				label: '📚 创建 Literature 笔记',
				type: 'create'
			},
			{
				id: 'create-atomic',
				label: '⚛️ 创建 Atomic 笔记',
				type: 'create'
			},
			{
				id: 'create-permanent',
				label: '📝 创建 Permanent 笔记',
				type: 'create'
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

	private getAvailableWorkflows() {
		const workflows = [];
		const activeFile = this.app.workspace.getActiveFile();

		// 如果有打开的笔记，只显示升级选项
		if (activeFile && this.currentNoteType !== NoteType.UNKNOWN) {
			switch (this.currentNoteType) {
				case NoteType.FLEETING:
					workflows.push(
						{
							id: 'fleeting-to-literature',
							label: '📚 升级为 Literature 笔记',
							description: '创建新的Literature笔记并建立关联'
						},
						{
							id: 'fleeting-to-atomic',
							label: '⚛️ 升级为 Atomic 笔记',
							description: '创建新的Atomic笔记并建立关联'
						}
					);
					break;

				case NoteType.LITERATURE:
					workflows.push(
						{
							id: 'literature-to-atomic',
							label: '⚛️ 升级为 Atomic 笔记',
							description: '创建新的Atomic笔记并建立关联'
						},
						{
							id: 'literature-to-permanent',
							label: '📝 升级为 Permanent 笔记',
							description: '创建新的Permanent笔记并建立关联'
						}
					);
					break;

				case NoteType.ATOMIC:
					workflows.push(
						{
							id: 'atomic-merge',
							label: '🔗 与其他 Atomic 笔记合并',
							description: '选择现有Atomic笔记进行合并'
						},
						{
							id: 'atomic-to-permanent',
							label: '📝 升级为 Permanent 笔记',
							description: '创建新的Permanent笔记并建立关联'
						}
					);
					break;

				case NoteType.PERMANENT:
					workflows.push(
						{
							id: 'permanent-blog',
							label: '📄 发布为 Blog',
							description: '将内容发布为博客文章'
						}
					);
					break;
			}
		} else {
			// 没有打开笔记或笔记类型未知时，只允许创建新笔记
			workflows.push(
				{
					id: 'create-fleeting',
					label: '🕒 创建 Fleeting 笔记',
					description: '创建新的临时笔记'
				},
				{
					id: 'create-literature',
					label: '📚 创建 Literature 笔记',
					description: '创建新的文献笔记'
				},
				{
					id: 'create-atomic',
					label: '⚛️ 创建 Atomic 笔记',
					description: '创建新的原子笔记'
				}
			);
		}

		return workflows;
	}

	private async executeWorkflow(workflow: any) {
		new Notice(`正在执行: ${workflow.label}`);

		try {
			if (this.plugin.settings.useTemplater) {
				await this.executeTemplaterWorkflow(workflow);
			} else {
				await this.executeBuiltinWorkflow(workflow);
			}
		} catch (error) {
			new Notice(`执行失败: ${error.message}`);
			console.error('工作流执行错误:', error);
		}

		this.close();
	}

	private async executeTemplaterWorkflow(workflow: any) {
		// 检查 Templater 插件是否可用
		const templaterPlugin = (this.app as any).plugins.getPlugin('templater-obsidian');

		if (!templaterPlugin) {
			new Notice('Templater 插件未安装或未启用');
			return;
		}

		try {
			switch (workflow.id) {
				case 'fleeting-to-literature':
					await this.convertFleetingToLiterature();
					break;
				case 'fleeting-to-atomic':
					await this.convertFleetingToAtomic();
					break;
				case 'literature-to-atomic':
					await this.convertLiteratureToAtomic();
					break;
				case 'literature-to-permanent':
					await this.convertLiteratureToPermanent();
					break;
				case 'atomic-merge':
					await this.mergeAtomicNotes();
					break;
				case 'atomic-to-permanent':
					await this.convertAtomicToPermanent();
					break;
				case 'permanent-blog':
					await this.convertPermanentToBlog();
					break;
				case 'create-fleeting':
					await this.createNewNote(NoteType.FLEETING);
					break;
				case 'create-literature':
					await this.createNewNote(NoteType.LITERATURE);
					break;
				case 'create-atomic':
					await this.createNewNote(NoteType.ATOMIC);
					break;
				case 'create-permanent':
					await this.createNewNote(NoteType.PERMANENT);
					break;
				default:
					new Notice('未知的工作流类型');
			}
		} catch (error) {
			new Notice(`Templater 执行失败: ${error.message}`);
			console.error('Templater 工作流错误:', error);
		}
	}

	private async executeBuiltinWorkflow(workflow: any) {
		// 内置工作流逻辑
		switch (workflow.id) {
			case 'create-fleeting':
			case 'create-literature':
			case 'create-atomic':
			case 'create-permanent':
				const noteType = workflow.id.split('-')[1] as NoteType;
				await this.createNewNote(noteType);
				break;
			default:
				new Notice('内置工作流暂不支持此操作，请启用 Templater');
		}
	}

	// 具体的转换方法 - 重构为创建新笔记并建立关联
	private async convertFleetingToLiterature() {
		await this.upgradeNoteToType(NoteType.LITERATURE, 'Fleeting → Literature');
	}

	private async convertFleetingToAtomic() {
		await this.upgradeNoteToType(NoteType.ATOMIC, 'Fleeting → Atomic');
	}

	private async convertLiteratureToAtomic() {
		await this.upgradeNoteToType(NoteType.ATOMIC, 'Literature → Atomic');
	}

	private async convertLiteratureToPermanent() {
		await this.upgradeNoteToType(NoteType.PERMANENT, 'Literature → Permanent');
	}

	private async convertAtomicToPermanent() {
		await this.upgradeNoteToType(NoteType.PERMANENT, 'Atomic → Permanent');
	}

	// 统一的升级方法：创建新笔记并建立关联
	private async upgradeNoteToType(targetType: NoteType, workflowName: string) {
		new Notice(`正在执行 ${workflowName}...`);

		const sourceFile = this.app.workspace.getActiveFile();
		if (!sourceFile) {
			new Notice('请先选择要升级的笔记');
			return;
		}

		try {
			// 1. 获取新笔记的名称
			const newFileName = await this.promptForFileName(targetType);
			if (!newFileName) return;

			// 2. 创建新笔记
			const newFile = await this.createUpgradedNote(targetType, newFileName, sourceFile);

			// 3. 在源笔记中添加derived_notes链接
			await this.addDerivedNoteLink(sourceFile, newFile.basename);

			// 4. 在新笔记中添加source_notes链接
			await this.addSourceNoteLink(newFile, sourceFile.basename);

			// 5. 打开新创建的笔记
			await this.app.workspace.getLeaf().openFile(newFile);

			new Notice(`✅ ${workflowName} 完成！已创建: ${newFileName}`);
		} catch (error) {
			new Notice(`❌ ${workflowName} 失败: ${error.message}`);
			console.error('升级笔记错误:', error);
		}
	}

	// 创建升级后的新笔记
	private async createUpgradedNote(targetType: NoteType, fileName: string, sourceFile: any) {
		const folderPath = this.plugin.getFolderPathForType(targetType);
		const filePath = `${folderPath}/${fileName}.md`;

		// 确保文件夹存在
		const folder = this.app.vault.getAbstractFileByPath(folderPath);
		if (!folder) {
			await this.app.vault.createFolder(folderPath);
		}

		// 生成包含源笔记信息的模板
		const content = this.generateUpgradeTemplate(targetType, fileName, sourceFile);

		return await this.app.vault.create(filePath, content);
	}

	// 生成升级模板，包含源笔记链接
	private generateUpgradeTemplate(targetType: NoteType, fileName: string, sourceFile: any): string {
		const timestamp = new Date().toISOString();
		const date = timestamp.split('T')[0];

		const frontmatter = `---
note_type: ${targetType}
created: ${date}
source_notes: ["[[${sourceFile.basename}]]"]
derived_notes: []
tags: []
---

# ${fileName}

## 📝 来源
- [[${sourceFile.basename}]]

## 🎯 升级说明
这是从 ${sourceFile.basename} 升级而来的 ${targetType} 笔记。

`;

		// 根据笔记类型添加特定内容
		switch (targetType) {
			case NoteType.LITERATURE:
				return frontmatter + `## 📚 文献摘录

## 💭 个人理解

## 🔗 相关链接

`;
			case NoteType.ATOMIC:
				return frontmatter + `## ⚛️ 核心概念

## 📋 详细说明

## 🔗 相关原子笔记

`;
			case NoteType.PERMANENT:
				return frontmatter + `## 📄 摘要

## 📖 详细内容

## 📚 参考来源

`;
			default:
				return frontmatter;
		}
	}

	// 在源笔记中添加derived_notes链接
	private async addDerivedNoteLink(sourceFile: any, newNoteName: string) {
		try {
			const content = await this.app.vault.read(sourceFile);
			const updatedContent = this.updateFrontmatterArray(
				content,
				'derived_notes',
				`[[${newNoteName}]]`
			);
			await this.app.vault.modify(sourceFile, updatedContent);
		} catch (error) {
			console.error('添加derived_notes链接失败:', error);
		}
	}

	// 在新笔记中添加source_notes链接
	private async addSourceNoteLink(newFile: any, sourceNoteName: string) {
		try {
			const content = await this.app.vault.read(newFile);
			const updatedContent = this.updateFrontmatterArray(
				content,
				'source_notes',
				`[[${sourceNoteName}]]`
			);
			await this.app.vault.modify(newFile, updatedContent);
		} catch (error) {
			console.error('添加source_notes链接失败:', error);
		}
	}

	// 更新frontmatter中的数组字段
	private updateFrontmatterArray(content: string, fieldName: string, newValue: string): string {
		const lines = content.split('\n');

		// 查找frontmatter区域
		const frontmatterStart = lines.findIndex(line => line.trim() === '---');
		const frontmatterEnd = lines.findIndex((line, index) =>
			index > frontmatterStart && line.trim() === '---'
		);

		if (frontmatterStart === -1 || frontmatterEnd === -1) {
			return content; // 没有frontmatter，返回原内容
		}

		const frontmatterLines = lines.slice(frontmatterStart + 1, frontmatterEnd);

		// 查找目标字段
		const fieldIndex = frontmatterLines.findIndex(line =>
			line.trim().startsWith(`${fieldName}:`)
		);

		if (fieldIndex !== -1) {
			// 字段存在，更新它
			const fieldLine = frontmatterLines[fieldIndex];

			if (fieldLine.includes('[]')) {
				// 空数组，直接替换
				frontmatterLines[fieldIndex] = `${fieldName}: ["${newValue}"]`;
			} else if (fieldLine.includes('[') && fieldLine.includes(']')) {
				// 已有内容的数组，添加新值
				const currentValue = fieldLine.substring(fieldLine.indexOf('['));
				const values = currentValue.slice(1, -1); // 移除[]

				if (values.trim() === '') {
					frontmatterLines[fieldIndex] = `${fieldName}: ["${newValue}"]`;
				} else {
					frontmatterLines[fieldIndex] = `${fieldName}: [${values}, "${newValue}"]`;
				}
			} else {
				// 不是数组格式，转换为数组
				frontmatterLines[fieldIndex] = `${fieldName}: ["${newValue}"]`;
			}
		} else {
			// 字段不存在，添加新字段
			frontmatterLines.push(`${fieldName}: ["${newValue}"]`);
		}

		// 重构内容
		const newLines = [
			...lines.slice(0, frontmatterStart + 1),
			...frontmatterLines,
			...lines.slice(frontmatterEnd)
		];

		return newLines.join('\n');
	}

	private async convertAtomicToPermanent() {
		await this.upgradeNoteToType(NoteType.PERMANENT, 'Atomic → Permanent');
	}

	private async mergeAtomicNotes() {
		new Notice('原子笔记合并功能开发中...');
		// TODO: 实现原子笔记合并逻辑
	}

	private async convertPermanentToBlog() {
		new Notice('博客发布功能开发中...');
		// TODO: 实现博客发布逻辑
	}

	private async createNewNote(noteType: NoteType) {
		const fileName = await this.promptForFileName(noteType);
		if (!fileName) return;

		const folderPath = this.plugin.getFolderPathForType(noteType);
		const filePath = `${folderPath}/${fileName}.md`;
		const content = this.plugin.getTemplateForType(noteType);

		try {
			// 确保文件夹存在
			const folder = this.app.vault.getAbstractFileByPath(folderPath);
			if (!folder) {
				await this.app.vault.createFolder(folderPath);
			}

			const file = await this.app.vault.create(filePath, content);
			await this.app.workspace.getLeaf().openFile(file);

			new Notice(`✅ ${noteType} 笔记已创建: ${fileName}`);
		} catch (error) {
			new Notice(`❌ 创建失败: ${error.message}`);
		}
	}

	private async promptForFileName(noteType: NoteType): Promise<string | null> {
		return new Promise((resolve) => {
			const modal = new FileNameModal(this.app, noteType, resolve);
			modal.open();
		});
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}
}

// 主插件类
export default class ZettelkastenWorkflow extends Plugin {
	settings: ZettelkastenSettings;

	async onload() {
		await this.loadSettings();

		// 添加侧边栏图标
		const ribbonIconEl = this.addRibbonIcon('workflow', 'Zettelkasten 工作流', (evt: MouseEvent) => {
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

		// 检测当前笔记类型的命令
		this.addCommand({
			id: 'detect-note-type',
			name: '检测当前笔记类型',
			checkCallback: (checking: boolean) => {
				const markdownView = this.app.workspace.getActiveViewOfType(MarkdownView);
				if (markdownView) {
					if (!checking) {
						this.detectAndShowNoteType();
					}
					return true;
				}
				return false;
			}
		});

		// 快速创建笔记的命令
		this.addCommand({
			id: 'quick-create-fleeting',
			name: '快速创建 Fleeting 笔记',
			callback: () => {
				this.quickCreateNote(NoteType.FLEETING);
			}
		});

		this.addCommand({
			id: 'quick-create-literature',
			name: '快速创建 Literature 笔记',
			callback: () => {
				this.quickCreateNote(NoteType.LITERATURE);
			}
		});

		this.addCommand({
			id: 'quick-create-atomic',
			name: '快速创建 Atomic 笔记',
			callback: () => {
				this.quickCreateNote(NoteType.ATOMIC);
			}
		});

		// 添加设置选项卡
		this.addSettingTab(new ZettelkastenSettingTab(this.app, this));

		console.log('Zettelkasten Workflow 插件已加载');
	}

	onunload() {
		console.log('Zettelkasten Workflow 插件已卸载');
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	private detectAndShowNoteType() {
		const activeFile = this.app.workspace.getActiveFile();
		if (!activeFile) {
			new Notice('未选择任何笔记');
			return;
		}

		const frontmatter = this.app.metadataCache.getFileCache(activeFile)?.frontmatter;
		const noteType = frontmatter?.note_type || 'unknown';

		new Notice(`当前笔记类型: ${noteType}`);
	}

	private async quickCreateNote(type: NoteType) {
		const fileName = `${type}-${Date.now()}`;
		const folderPath = this.getFolderPathForType(type);

		try {
			const filePath = `${folderPath}/${fileName}.md`;
			const content = this.getTemplateForType(type);

			const file = await this.app.vault.create(filePath, content);
			await this.app.workspace.getLeaf().openFile(file);

			new Notice(`${type} 笔记已创建`);
		} catch (error) {
			new Notice(`创建笔记失败: ${error.message}`);
		}
	}

	public getFolderPathForType(type: NoteType): string {
		switch (type) {
			case NoteType.FLEETING:
				return this.settings.fleetingPath;
			case NoteType.LITERATURE:
				return this.settings.literaturePath;
			case NoteType.PERMANENT:
				return this.settings.permanentPath;
			case NoteType.ATOMIC:
				return this.settings.atomicPath;
			default:
				return this.settings.fleetingPath;
		}
	}

	public getTemplateForType(type: NoteType): string {
		const baseTemplate = `---
note_type: ${type}
created: ${new Date().toISOString().split('T')[0]}
source_notes: []
derived_notes: []
tags: []
---

# ${type.charAt(0).toUpperCase() + type.slice(1)} Note

`;

		switch (type) {
			case NoteType.FLEETING:
				return baseTemplate + `## 💭 快速想法

## 📍 来源

## 🏷️ 标签

`;
			case NoteType.LITERATURE:
				return baseTemplate + `## 📝 原文摘录

## 💭 个人理解

## 🔗 相关链接

`;
			case NoteType.ATOMIC:
				return baseTemplate + `## ⚛️ 核心概念

## 📋 详细说明

## 🔗 相关原子笔记

`;
			case NoteType.PERMANENT:
				return baseTemplate + `## 📄 摘要

## 📖 详细内容

## 📚 参考来源

`;
			default:
				return baseTemplate;
		}
	}
}

// 设置选项卡
class ZettelkastenSettingTab extends PluginSettingTab {
	plugin: ZettelkastenWorkflow;

	constructor(app: App, plugin: ZettelkastenWorkflow) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;

		containerEl.empty();

		containerEl.createEl('h2', { text: 'Zettelkasten 工作流设置' });

		new Setting(containerEl)
			.setName('Fleeting 笔记路径')
			.setDesc('临时笔记的默认保存路径')
			.addText(text => text
				.setPlaceholder('000-inbox/1-fleeting')
				.setValue(this.plugin.settings.fleetingPath)
				.onChange(async (value) => {
					this.plugin.settings.fleetingPath = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Literature 笔记路径')
			.setDesc('文献笔记的默认保存路径')
			.addText(text => text
				.setPlaceholder('000-inbox/2-literature')
				.setValue(this.plugin.settings.literaturePath)
				.onChange(async (value) => {
					this.plugin.settings.literaturePath = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Permanent 笔记路径')
			.setDesc('永久笔记的默认保存路径')
			.addText(text => text
				.setPlaceholder('000-inbox/3-permanent')
				.setValue(this.plugin.settings.permanentPath)
				.onChange(async (value) => {
					this.plugin.settings.permanentPath = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Atomic 笔记路径')
			.setDesc('原子笔记的默认保存路径')
			.addText(text => text
				.setPlaceholder('000-inbox/4-atoms')
				.setValue(this.plugin.settings.atomicPath)
				.onChange(async (value) => {
					this.plugin.settings.atomicPath = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('使用 Templater')
			.setDesc('是否集成 Templater 插件进行模板管理')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.useTemplater)
				.onChange(async (value) => {
					this.plugin.settings.useTemplater = value;
					await this.plugin.saveSettings();
				}));
	}
}
