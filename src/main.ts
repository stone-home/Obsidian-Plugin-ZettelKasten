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
import { Utils } from './utils';

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
	templateFolder: '.obsidian/plugins/zettelkasten-templates/templates',
	dateFormat: 'YYYY-MM-DD',
	defaultNoteType: NoteType.FLEETING,
	templates: {}
};

export default class ZettelkastenTemplatePlugin extends Plugin {
	settings: ZettelkastenTemplateSettings;
	noteFactory: NoteFactory;

	async onload() {
		await this.loadSettings();

		// Initialize note factory
		this.noteFactory = new NoteFactory(this.app);

		// Register note classes - 需要为每种类型注册一个基础类
		// 由于我们只使用 BaseNote，为每种类型都注册它
		Object.values(NoteType).forEach(noteType => {
			if (noteType !== NoteType.UNKNOWN) {  // 跳过 UNKNOWN 类型
				this.noteFactory.registerNoteClass(noteType, BaseNote);
			}
		});

		// Ensure template folder exists
		await this.ensureTemplateFolder();

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

	async ensureTemplateFolder() {
		const folder = this.app.vault.getAbstractFileByPath(this.settings.templateFolder);
		if (!folder) {
			try {
				await this.app.vault.createFolder(this.settings.templateFolder);
			} catch (error) {
				console.error('Failed to create template folder:', error);
			}
		}
	}

	async loadTemplates() {
		const templateFolder = this.app.vault.getAbstractFileByPath(this.settings.templateFolder);

		if (!templateFolder || !(templateFolder instanceof TFolder)) {
			console.log('Template folder not found:', this.settings.templateFolder);
			return;
		}

		// Clear existing templates in factory
		this.settings.templates = {};

		// Load all markdown files in template folder
		const files = this.app.vault.getMarkdownFiles().filter(
			file => file.path.startsWith(this.settings.templateFolder)
		);

		console.log(`Found ${files.length} files in template folder`);

		for (const file of files) {
			try {
				const content = await this.app.vault.read(file);
				const metadata = this.extractTemplateMetadata(content);

				if (metadata) {
					const templateId = file.basename;
					this.settings.templates[templateId] = metadata;

					console.log(`Loaded template: ${templateId}`, metadata);

					// Load template into factory
					const template = await this.noteFactory.loadFromFile(file.path);
					this.noteFactory.registerTemplate(metadata.noteType, templateId, template);

					if (metadata.isDefault) {
						this.noteFactory.setDefaultTemplate(metadata.noteType, templateId);
					}
				} else {
					console.log(`File ${file.name} is not a valid template`);
				}
			} catch (error) {
				console.error(`Failed to load template ${file.path}:`, error);
			}
		}

		console.log('Templates loaded:', Object.keys(this.settings.templates).length);
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

		const createdMatch = frontmatter.match(/created-at:\s*(.+)/);
		if (createdMatch) metadata.createdAt = createdMatch[1].trim();

		const updatedMatch = frontmatter.match(/updated-at:\s*(.+)/);
		if (updatedMatch) metadata.updatedAt = updatedMatch[1].trim();

		// Ensure required fields
		if (!metadata.name) return null;

		return {
			name: metadata.name,
			noteType: metadata.noteType || NoteType.FLEETING,
			description: metadata.description || '',
			filenameFormat: metadata.filenameFormat || '{{date}}-{{title}}',
			isDefault: metadata.isDefault || false,
			createdAt: metadata.createdAt || new Date().toISOString(),
			updatedAt: metadata.updatedAt || new Date().toISOString()
		};
	}

	async createTemplate(metadata: TemplateMetadata, customProperties: Record<string, any> = {}, sections: any[] = []) {
		const templateId = Utils.sanitizeFilename(metadata.name);
		const templatePath = `${this.settings.templateFolder}/${templateId}.md`;

		// Build complete frontmatter including base properties
		const frontmatter = this.generateCompleteFrontmatter(metadata, customProperties);

		// Build body content
		let bodyContent = '';
		if (sections.length === 0) {
			// Add default section
			bodyContent = '# Content\n\n';
		} else {
			sections.forEach(section => {
				bodyContent += `${'#'.repeat(section.level)} ${section.name}\n\n`;
				if (section.content) {
					bodyContent += `${section.content}\n\n`;
				}
			});
		}

		const fullContent = `${frontmatter}\n${bodyContent}`;

		// Save template file
		await this.app.vault.create(templatePath, fullContent);

		// Update settings
		this.settings.templates[templateId] = metadata;
		await this.saveSettings();

		// Reload templates to update factory
		await this.loadTemplates();

		new Notice(`Template "${metadata.name}" created successfully`);
		return templateId;
	}

	generateCompleteFrontmatter(metadata: TemplateMetadata, customProperties: Record<string, any> = {}): string {
		const now = Utils.generateDate();

		// Start with template metadata
		let frontmatter = '---\n';

		// Template metadata (always at top)
		frontmatter += `template-name: ${metadata.name}\n`;
		frontmatter += `template-description: ${metadata.description}\n`;
		frontmatter += `filename-format: ${metadata.filenameFormat}\n`;
		frontmatter += `is-default: ${metadata.isDefault}\n`;
		frontmatter += `created-at: ${metadata.createdAt}\n`;
		frontmatter += `updated-at: ${metadata.updatedAt}\n`;
		frontmatter += `template: true\n`;
		frontmatter += '\n';

		// Base note properties
		frontmatter += `# Base Note Properties\n`;
		frontmatter += `title: \n`;
		frontmatter += `type: ${metadata.noteType}\n`;
		frontmatter += `url: \n`;
		frontmatter += `create: ${now}\n`;
		frontmatter += `id: {{zettel-id}}\n`;
		frontmatter += `tags:\n`;
		frontmatter += `aliases:\n`;
		frontmatter += `source_notes:\n`;

		// Custom properties
		if (Object.keys(customProperties).length > 0) {
			frontmatter += '\n# Custom Properties\n';
			for (const [key, prop] of Object.entries(customProperties)) {
				const value = prop.value;
				const type = prop.type;

				if (type === 'list' || Array.isArray(value)) {
					frontmatter += `${key}:\n`;
					if (Array.isArray(value) && value.length > 0) {
						value.forEach(item => {
							frontmatter += `  - ${item}\n`;
						});
					}
				} else {
					frontmatter += `${key}: ${value || ''}\n`;
				}
			}
		}

		frontmatter += '---';
		return frontmatter;
	}

	async updateTemplate(templateId: string, updates: Partial<TemplateMetadata>, customProperties?: Record<string, any>, sections?: any[]) {
		const templatePath = `${this.settings.templateFolder}/${templateId}.md`;
		const file = this.app.vault.getAbstractFileByPath(templatePath);

		if (!file || !(file instanceof TFile)) {
			new Notice(`Template "${templateId}" not found`);
			return;
		}

		const currentMetadata = this.settings.templates[templateId];
		const updatedMetadata = { ...currentMetadata, ...updates, updatedAt: new Date().toISOString() };

		// Generate new content
		const frontmatter = this.generateCompleteFrontmatter(updatedMetadata, customProperties || {});

		let bodyContent = '';
		if (sections && sections.length > 0) {
			sections.forEach(section => {
				bodyContent += `${'#'.repeat(section.level)} ${section.name}\n\n`;
				if (section.content) {
					bodyContent += `${section.content}\n\n`;
				}
			});
		} else {
			// Keep existing body if no sections provided
			const currentContent = await this.app.vault.read(file);
			const bodyMatch = currentContent.match(/^---\n[\s\S]*?\n---\n([\s\S]*)$/);
			bodyContent = bodyMatch ? bodyMatch[1] : '';
		}

		const fullContent = `${frontmatter}\n${bodyContent}`;
		await this.app.vault.modify(file, fullContent);

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

			// Replace template variables
			note.setProperty('id', Utils.generateZettelID());
			note.setProperty('create', Utils.generateDate());

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
					name.createSpan({ text: ' ★', cls: 'template-default' });
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
				.setPlaceholder('.obsidian/plugins/zettelkasten-templates/templates')
				.setValue(this.plugin.settings.templateFolder)
				.onChange(async (value) => {
					this.plugin.settings.templateFolder = value;
					await this.plugin.saveSettings();
					await this.plugin.ensureTemplateFolder();
					await this.plugin.loadTemplates();
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
				.setCta()
				.onClick(() => {
					new TemplateListModal(this.app, this.plugin).open();
				}));
	}
}
