import {
	App,
	Plugin,
	PluginSettingTab,
	Setting,
	Modal,
	Notice,
	TFile,
	TFolder
} from 'obsidian';
import { NoteFactory } from './notes/factory';
import { BaseNote } from './notes/note';
import { NoteType } from './types';
import { TemplateEditorModal } from './template/editor';
import { TemplateListModal } from './template/list';

interface TemplateMetadata {
	name: string;
	noteType: NoteType;
	description: string;
	filenameFormat: string; // e.g., "{{date}}-{{title}}"
	isDefault: boolean;
	createdAt: string;
	updatedAt: string;
}

interface ZettelkastenTemplateSettings {
	templateFolder: string;
	dateFormat: string;
	defaultNoteType: NoteType;
	templates: Record<string, TemplateMetadata>; // templateId -> metadata
}

const DEFAULT_SETTINGS: ZettelkastenTemplateSettings = {
	templateFolder: 'Templates',
	dateFormat: 'YYYY-MM-DD',
	defaultNoteType: NoteType.FLEETING,
	templates: {}
};

export default class ZettelkastenTemplatePlugin extends Plugin {
	settings: ZettelkastenTemplateSettings | undefined;
	noteFactory: NoteFactory | undefined;

	async onload() {
		await this.loadSettings();

		// Initialize note factory
		this.noteFactory = new NoteFactory(this.app);

		// Register commands
		this.addCommand({
			id: 'open-template-manager',
			name: 'Open Template Manager',
			callback: () => {
				new TemplateListModal(this.app, this).open();
			}
		});

		this.addCommand({
			id: 'create-note-from-template',
			name: 'Create Note from Template',
			callback: () => {
				this.showTemplateSelector();
			}
		});

		// Add ribbon icon
		this.addRibbonIcon('file-plus-2', 'Zettelkasten Templates', () => {
			new TemplateListModal(this.app, this).open();
		});

		// Add settings tab
		this.addSettingTab(new ZettelkastenTemplateSettingTab(this.app, this));

		// Load templates on startup
		await this.loadTemplates();
	}

	async loadTemplates() {
		const templateFolder = this.app.vault.getAbstractFileByPath(this.settings.templateFolder);

		if (!templateFolder || !(templateFolder instanceof TFolder)) {
			// Create template folder if it doesn't exist
			await this.app.vault.createFolder(this.settings.templateFolder);
			return;
		}

		// Load all markdown files in template folder
		const files = this.app.vault.getMarkdownFiles().filter(
			file => file.path.startsWith(this.settings.templateFolder)
		);

		for (const file of files) {
			try {
				const content = await this.app.vault.read(file);
				const metadata = this.extractTemplateMetadata(content);

				if (metadata) {
					const templateId = file.basename;
					this.settings.templates[templateId] = metadata;

					// Load template into factory
					const template = await this.noteFactory.loadFromFile(file.path);
					this.noteFactory.registerTemplate(metadata.noteType, templateId, template);

					if (metadata.isDefault) {
						this.noteFactory.setDefaultTemplate(metadata.noteType, templateId);
					}
				}
			} catch (error) {
				console.error(`Failed to load template ${file.path}:`, error);
			}
		}

		await this.saveSettings();
	}

	extractTemplateMetadata(content: string): TemplateMetadata | null {
		const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
		if (!frontmatterMatch) return null;

		const frontmatter = frontmatterMatch[1];
		const metadata: Partial<TemplateMetadata> = {};

		// Extract template-specific properties
		const nameMatch = frontmatter.match(/template-name:\s*(.+)/);
		if (nameMatch) metadata.name = nameMatch[1].trim();

		const typeMatch = frontmatter.match(/type:\s*(.+)/);
		if (typeMatch) {
			const typeValue = typeMatch[1].trim();
			metadata.noteType = Object.values(NoteType).find(v => v === typeValue) || NoteType.FLEETING;
		}

		const descMatch = frontmatter.match(/template-description:\s*(.+)/);
		if (descMatch) metadata.description = descMatch[1].trim();

		const filenameMatch = frontmatter.match(/filename-format:\s*(.+)/);
		if (filenameMatch) metadata.filenameFormat = filenameMatch[1].trim();

		const defaultMatch = frontmatter.match(/is-default:\s*(true|false)/);
		if (defaultMatch) metadata.isDefault = defaultMatch[1] === 'true';

		// Ensure required fields
		if (!metadata.name) return null;

		return {
			name: metadata.name,
			noteType: metadata.noteType || NoteType.FLEETING,
			description: metadata.description || '',
			filenameFormat: metadata.filenameFormat || '{{date}}-{{title}}',
			isDefault: metadata.isDefault || false,
			createdAt: metadata.createdAt || new Date().toISOString(),
			updatedAt: new Date().toISOString()
		};
	}

	async createTemplate(metadata: TemplateMetadata, content: string = '') {
		const templatePath = `${this.settings.templateFolder}/${metadata.name}.md`;

		// Create template content with metadata
		const frontmatter = this.generateTemplateFrontmatter(metadata);
		const fullContent = `${frontmatter}\n${content}`;

		// Save template file
		await this.app.vault.create(templatePath, fullContent);

		// Update settings
		this.settings.templates[metadata.name] = metadata;
		await this.saveSettings();

		// Reload templates
		await this.loadTemplates();

		new Notice(`Template "${metadata.name}" created successfully`);
	}

	generateTemplateFrontmatter(metadata: TemplateMetadata): string {
		return `---
template-name: ${metadata.name}
type: ${metadata.noteType}
template-description: ${metadata.description}
filename-format: ${metadata.filenameFormat}
is-default: ${metadata.isDefault}
template: true
---`;
	}

	async updateTemplate(templateId: string, updates: Partial<TemplateMetadata>, content?: string) {
		const templatePath = `${this.settings.templateFolder}/${templateId}.md`;
		const file = this.app.vault.getAbstractFileByPath(templatePath);

		if (!file || !(file instanceof TFile)) {
			new Notice(`Template "${templateId}" not found`);
			return;
		}

		const currentMetadata = this.settings.templates[templateId];
		const updatedMetadata = { ...currentMetadata, ...updates, updatedAt: new Date().toISOString() };

		if (content !== undefined) {
			// Update entire file
			const frontmatter = this.generateTemplateFrontmatter(updatedMetadata);
			const fullContent = `${frontmatter}\n${content}`;
			await this.app.vault.modify(file, fullContent);
		} else {
			// Update only frontmatter
			const currentContent = await this.app.vault.read(file);
			const bodyMatch = currentContent.match(/^---\n[\s\S]*?\n---\n([\s\S]*)$/);
			const body = bodyMatch ? bodyMatch[1] : '';

			const frontmatter = this.generateTemplateFrontmatter(updatedMetadata);
			const fullContent = `${frontmatter}\n${body}`;
			await this.app.vault.modify(file, fullContent);
		}

		// Update settings
		this.settings.templates[templateId] = updatedMetadata;
		await this.saveSettings();

		// Reload templates
		await this.loadTemplates();

		new Notice(`Template "${templateId}" updated successfully`);
	}

	async deleteTemplate(templateId: string) {
		const templatePath = `${this.settings.templateFolder}/${templateId}.md`;
		const file = this.app.vault.getAbstractFileByPath(templatePath);

		if (!file || !(file instanceof TFile)) {
			new Notice(`Template "${templateId}" not found`);
			return;
		}

		// Delete file
		await this.app.vault.delete(file);

		// Update settings
		delete this.settings.templates[templateId];
		await this.saveSettings();

		// Reload templates
		await this.loadTemplates();

		new Notice(`Template "${templateId}" deleted successfully`);
	}

	async createNoteFromTemplate(templateId: string, customTitle?: string) {
		const metadata = this.settings.templates[templateId];
		if (!metadata) {
			new Notice(`Template "${templateId}" not found`);
			return;
		}

		try {
			// Create note from template
			const note = this.noteFactory.createFromTemplate(metadata.noteType, templateId);

			// Generate filename
			const filename = this.generateFilename(metadata.filenameFormat, customTitle || note.getTitle());
			note.setTitle(filename);

			// Save the note
			const file = await note.save();

			// Open the new note
			await this.app.workspace.getLeaf().openFile(file);

			new Notice(`Note created from template "${metadata.name}"`);
		} catch (error) {
			console.error('Failed to create note from template:', error);
			new Notice(`Failed to create note: ${error.message}`);
		}
	}

	generateFilename(format: string, title: string): string {
		const date = window.moment().format(this.settings.dateFormat);
		const time = window.moment().format('HHmmss');

		return format
			.replace('{{date}}', date)
			.replace('{{time}}', time)
			.replace('{{title}}', title)
			.replace('{{timestamp}}', Date.now().toString());
	}

	showTemplateSelector() {
		const templates = Object.entries(this.settings.templates);

		if (templates.length === 0) {
			new Notice('No templates available. Create one first!');
			new TemplateListModal(this.app, this).open();
			return;
		}

		// Create a modal to select template
		new TemplateSelectorModal(this.app, this, templates).open();
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}

class TemplateSelectorModal extends Modal {
	plugin: ZettelkastenTemplatePlugin;
	templates: [string, TemplateMetadata][];

	constructor(app: App, plugin: ZettelkastenTemplatePlugin, templates: [string, TemplateMetadata][]) {
		super(app);
		this.plugin = plugin;
		this.templates = templates;
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.empty();

		contentEl.createEl('h2', { text: 'Select a Template' });

		// Group templates by type
		const templatesByType = new Map<NoteType, [string, TemplateMetadata][]>();

		for (const [id, metadata] of this.templates) {
			if (!templatesByType.has(metadata.noteType)) {
				templatesByType.set(metadata.noteType, []);
			}
			templatesByType.get(metadata.noteType)!.push([id, metadata]);
		}

		// Create sections for each type
		for (const [type, templates] of templatesByType) {
			const section = contentEl.createDiv('template-type-section');
			section.createEl('h3', { text: type.toUpperCase() });

			for (const [id, metadata] of templates) {
				const item = section.createDiv('template-item');
				item.addClass('clickable');

				const name = item.createEl('div', { text: metadata.name, cls: 'template-name' });
				if (metadata.isDefault) {
					name.createSpan({ text: ' (default)', cls: 'template-default' });
				}

				if (metadata.description) {
					item.createEl('small', { text: metadata.description, cls: 'template-description' });
				}

				item.addEventListener('click', () => {
					this.plugin.createNoteFromTemplate(id);
					this.close();
				});
			}
		}
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}
}

class ZettelkastenTemplateSettingTab extends PluginSettingTab {
	plugin: ZettelkastenTemplatePlugin;

	constructor(app: App, plugin: ZettelkastenTemplatePlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		containerEl.createEl('h2', { text: 'Zettelkasten Template Settings' });

		new Setting(containerEl)
			.setName('Template folder')
			.setDesc('Folder where templates are stored')
			.addText(text => text
				.setPlaceholder('Templates')
				.setValue(this.plugin.settings.templateFolder)
				.onChange(async (value) => {
					this.plugin.settings.templateFolder = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Date format')
			.setDesc('Format for dates in filenames (moment.js format)')
			.addText(text => text
				.setPlaceholder('YYYY-MM-DD')
				.setValue(this.plugin.settings.dateFormat)
				.onChange(async (value) => {
					this.plugin.settings.dateFormat = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Default note type')
			.setDesc('Default type for new notes')
			.addDropdown(dropdown => {
				Object.values(NoteType).forEach(type => {
					dropdown.addOption(type, type.toUpperCase());
				});
				dropdown
					.setValue(this.plugin.settings.defaultNoteType)
					.onChange(async (value) => {
						this.plugin.settings.defaultNoteType = value as NoteType;
						await this.plugin.saveSettings();
					});
			});

		new Setting(containerEl)
			.setName('Manage Templates')
			.setDesc('Open the template manager')
			.addButton(button => button
				.setButtonText('Open Template Manager')
				.onClick(() => {
					new TemplateListModal(this.app, this.plugin).open();
				}));
	}
}
