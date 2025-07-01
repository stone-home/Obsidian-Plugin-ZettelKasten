import { App, Modal, Setting, ButtonComponent } from 'obsidian';
import ZettelkastenTemplatePlugin from '../main';
import { TemplateEditorModal } from './editor';
import { NoteType } from '../types';


export class TemplateListModal extends Modal {
	plugin: ZettelkastenTemplatePlugin;
	activeFilter: NoteType | 'all' = 'all';
	gridContainer: HTMLElement | null = null;

	constructor(app: App, plugin: ZettelkastenTemplatePlugin) {
		super(app);
		this.plugin = plugin;
	}

	async onOpen() {
		const { contentEl } = this;
		contentEl.empty();
		contentEl.addClass('zettelkasten-template-list');

		// Reload templates to ensure we have the latest
		await this.plugin.loadTemplates();

		// Header
		const header = contentEl.createDiv('template-list-header');
		header.createEl('h2', { text: 'Template Manager' });

		// Create new template button
		new ButtonComponent(header.createDiv('header-actions'))
			.setButtonText('+ New Template')
			.setCta()
			.onClick(() => {
				new TemplateEditorModal(this.app, this.plugin).open();
				this.close();
			});

		// Filter tabs
		const filterContainer = contentEl.createDiv('template-filters');
		this.createFilterTabs(filterContainer);

		// Template grid - 保存引用
		this.gridContainer = contentEl.createDiv('template-grid-container');
		this.renderTemplateGrid(this.gridContainer);
	}

	createFilterTabs(container: HTMLElement) {
		const tabs = container.createDiv('filter-tabs');

		// All templates tab
		const allTab = tabs.createDiv('filter-tab');
		allTab.setText('All');
		if (this.activeFilter === 'all') {
			allTab.addClass('active');
		}
		allTab.addEventListener('click', () => {
			if (this.activeFilter !== 'all') {
				// 更新状态
				this.activeFilter = 'all';
				// 更新UI
				tabs.querySelectorAll('.filter-tab').forEach(t => t.classList.remove('active'));
				allTab.classList.add('active');
				// 刷新内容
				if (this.gridContainer) {
					this.gridContainer.empty();
					this.renderTemplateGrid(this.gridContainer);
				}
			}
		});

		// Type-specific tabs
		Object.values(NoteType).forEach(type => {
			// 确保 type 有值且不是 UNKNOWN
			if (!type || type === NoteType.UNKNOWN || typeof type !== 'string' || type.trim() === '') {
				return;
			}

			const tab = tabs.createDiv('filter-tab');
			tab.setText(type.toUpperCase());
			if (this.activeFilter === type) {
				tab.addClass('active');
			}

			tab.addEventListener('click', () => {
				if (this.activeFilter !== type) {
					// 更新状态
					this.activeFilter = type;
					// 更新UI
					tabs.querySelectorAll('.filter-tab').forEach(t => t.classList.remove('active'));
					tab.classList.add('active');
					// 刷新内容
					if (this.gridContainer) {
						this.gridContainer.empty();
						this.renderTemplateGrid(this.gridContainer);
					}
				}
			});
		});
	}

	renderTemplateGrid(container: HTMLElement) {
		const templates = Object.entries(this.plugin.settings.templates);

		console.log('Rendering templates:', templates.length);

		// Filter templates
		const filteredTemplates = this.activeFilter === 'all'
			? templates
			: templates.filter(([_, metadata]) => metadata.noteType === this.activeFilter);

		if (filteredTemplates.length === 0) {
			container.createDiv('empty-state').setText(
				this.activeFilter === 'all'
					? 'No templates yet. Click "New Template" to create one.'
					: `No ${this.activeFilter} templates yet.`
			);
			return;
		}

		const grid = container.createDiv('template-grid');

		filteredTemplates.forEach(([templateId, metadata]) => {
			const card = grid.createDiv('template-card');

			// Card header
			const cardHeader = card.createDiv('card-header');

			// Template name and type badge
			const titleRow = cardHeader.createDiv('title-row');
			titleRow.createEl('h3', { text: metadata.name });

			const badge = titleRow.createDiv('type-badge');
			badge.setText(metadata.noteType.toUpperCase());
			badge.addClass(`type-${metadata.noteType.toLowerCase()}`);  // 确保类名是小写

			if (metadata.isDefault) {
				titleRow.createDiv('default-indicator').setText('★ Default');
			}

			// Description
			if (metadata.description) {
				card.createDiv('card-description').setText(metadata.description);
			}

			// Filename format
			card.createDiv('filename-format').setText(`📁 ${metadata.filenameFormat}`);

			// Timestamps
			const timestamps = card.createDiv('timestamps');
			timestamps.createSpan({
				text: `Created: ${new Date(metadata.createdAt).toLocaleDateString()}`
			});
			timestamps.createSpan({
				text: `Updated: ${new Date(metadata.updatedAt).toLocaleDateString()}`
			});

			// Card actions
			const actions = card.createDiv('card-actions');

			new ButtonComponent(actions)
				.setButtonText('Use')
				.setCta()
				.onClick(() => {
					this.plugin.createNoteFromTemplate(templateId);
					this.close();
				});

			new ButtonComponent(actions)
				.setButtonText('Edit')
				.onClick(() => {
					new TemplateEditorModal(this.app, this.plugin, templateId, metadata).open();
					this.close();
				});

			new ButtonComponent(actions)
				.setButtonText('Delete')
				.setWarning()
				.onClick(async () => {
					if (confirm(`Are you sure you want to delete the template "${metadata.name}"?`)) {
						await this.plugin.deleteTemplate(templateId);
						this.onOpen(); // Refresh view
					}
				});
		});
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}
}


