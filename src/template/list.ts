
import { App, Modal, ButtonComponent } from 'obsidian';
import ZettelkastenTemplatePlugin from '../main';
import { TemplateEditorModal } from './editor';
import { NoteType } from '../types';

export class TemplateListModal extends Modal {
	plugin: ZettelkastenTemplatePlugin;
	activeFilter: NoteType | 'all' = 'all';

	constructor(app: App, plugin: ZettelkastenTemplatePlugin) {
		super(app);
		this.plugin = plugin;
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.empty();
		contentEl.addClass('zettelkasten-template-list');

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

		// Template grid
		const gridContainer = contentEl.createDiv('template-grid-container');
		this.renderTemplateGrid(gridContainer);
	}

	createFilterTabs(container: HTMLElement) {
		const tabs = container.createDiv('filter-tabs');

		// All templates tab
		const allTab = tabs.createDiv('filter-tab');
		allTab.setText('All');
		allTab.addClass(this.activeFilter === 'all' ? 'active' : '');
		allTab.addEventListener('click', () => {
			this.activeFilter = 'all';
			this.onOpen(); // Refresh view
		});

		// Type-specific tabs
		Object.values(NoteType).forEach(type => {
			const tab = tabs.createDiv('filter-tab');
			tab.setText(type.toUpperCase());
			tab.addClass(this.activeFilter === type ? 'active' : '');
			tab.addEventListener('click', () => {
				this.activeFilter = type;
				this.onOpen(); // Refresh view
			});
		});
	}

	renderTemplateGrid(container: HTMLElement) {
		const templates = Object.entries(this.plugin.settings.templates);

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
			badge.addClass(`type-${metadata.noteType}`);

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
