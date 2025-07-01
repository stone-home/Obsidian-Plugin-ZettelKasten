// import { App, Modal, Setting, ToggleComponent, Notice, TFile } from 'obsidian';
// import ZettelkastenTemplatePlugin from '../main';
// import { NoteType } from '../types';
//
// interface TemplateSection {
// 	name: string;
// 	level: number;
// 	content: string;
// }
//
// export class TemplateEditorModal extends Modal {
// 	plugin: ZettelkastenTemplatePlugin;
// 	templateId?: string;
// 	metadata: any;
//
// 	// Form fields
// 	nameInput: HTMLInputElement | undefined;
// 	typeDropdown: HTMLSelectElement | undefined;
// 	descriptionInput: HTMLTextAreaElement | undefined;
// 	filenameFormatInput: HTMLInputElement | undefined;
// 	isDefaultToggle: ToggleComponent | undefined;
//
// 	// Content editor
// 	sections: TemplateSection[] = [];
// 	properties: Record<string, any> = {};
//
// 	constructor(app: App, plugin: ZettelkastenTemplatePlugin, templateId?: string, metadata?: any) {
// 		super(app);
// 		this.plugin = plugin;
// 		this.templateId = templateId;
// 		this.metadata = metadata || {
// 			name: '',
// 			noteType: NoteType.FLEETING,
// 			description: '',
// 			filenameFormat: '{{date}}-{{title}}',
// 			isDefault: false
// 		};
// 	}
//
// 	async onOpen() {
// 		const { contentEl } = this;
// 		contentEl.empty();
// 		contentEl.addClass('zettelkasten-template-editor');
//
// 		// Header
// 		contentEl.createEl('h2', {
// 			text: this.templateId ? `Edit Template: ${this.metadata.name}` : 'Create New Template'
// 		});
//
// 		// If editing, load the template content
// 		if (this.templateId) {
// 			await this.loadTemplateContent();
// 		}
//
// 		// Create form
// 		this.createMetadataSection(contentEl);
// 		this.createPropertiesSection(contentEl);
// 		this.createContentSection(contentEl);
// 		this.createActionsSection(contentEl);
// 	}
//
// 	async loadTemplateContent() {
// 		const templatePath = `${this.plugin.settings.templateFolder}/${this.templateId}.md`;
// 		const file = this.app.vault.getAbstractFileByPath(templatePath);
//
// 		if (file && file instanceof TFile) {
// 			const content = await this.app.vault.read(file);
//
// 			// Parse properties and sections
// 			const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
// 			if (frontmatterMatch) {
// 				const [, frontmatter, body] = frontmatterMatch;
//
// 				// Parse custom properties (excluding template metadata)
// 				const lines = frontmatter.split('\n');
// 				for (const line of lines) {
// 					const match = line.match(/^(.+?):\s*(.+)$/);
// 					if (match) {
// 						const [, key, value] = match;
// 						if (!['template-name', 'type', 'template-description', 'filename-format', 'is-default', 'template'].includes(key)) {
// 							this.properties[key] = value;
// 						}
// 					}
// 				}
//
// 				// Parse body sections
// 				this.sections = this.parseBodySections(body);
// 			}
// 		}
// 	}
//
// 	parseBodySections(body: string): TemplateSection[] {
// 		const sections: TemplateSection[] = [];
// 		const lines = body.split('\n');
//
// 		let currentSection: TemplateSection | null = null;
// 		let contentBuffer: string[] = [];
//
// 		for (const line of lines) {
// 			const headerMatch = line.match(/^(#+)\s+(.+)$/);
//
// 			if (headerMatch) {
// 				// Save previous section
// 				if (currentSection) {
// 					currentSection.content = contentBuffer.join('\n').trim();
// 					sections.push(currentSection);
// 					contentBuffer = [];
// 				}
//
// 				// Start new section
// 				currentSection = {
// 					name: headerMatch[2],
// 					level: headerMatch[1].length,
// 					content: ''
// 				};
// 			} else {
// 				contentBuffer.push(line);
// 			}
// 		}
//
// 		// Save last section
// 		if (currentSection) {
// 			currentSection.content = contentBuffer.join('\n').trim();
// 			sections.push(currentSection);
// 		} else if (contentBuffer.length > 0) {
// 			// No headers found, create default section
// 			sections.push({
// 				name: 'Content',
// 				level: 1,
// 				content: contentBuffer.join('\n').trim()
// 			});
// 		}
//
// 		return sections;
// 	}
//
// 	createMetadataSection(container: HTMLElement) {
// 		const section = container.createDiv('editor-section');
// 		section.createEl('h3', { text: 'Template Metadata' });
//
// 		// Name
// 		new Setting(section)
// 			.setName('Template Name')
// 			.setDesc('Unique name for this template')
// 			.addText(text => {
// 				this.nameInput = text.inputEl;
// 				text.setPlaceholder('Daily Note')
// 					.setValue(this.metadata.name)
// 					.onChange(value => this.metadata.name = value);
// 			});
//
// 		// Type
// 		new Setting(section)
// 			.setName('Note Type')
// 			.setDesc('Type of notes this template creates')
// 			.addDropdown(dropdown => {
// 				this.typeDropdown = dropdown.selectEl;
// 				Object.values(NoteType).forEach(type => {
// 					dropdown.addOption(type, type.toUpperCase());
// 				});
// 				dropdown.setValue(this.metadata.noteType)
// 					.onChange(value => this.metadata.noteType = value);
// 			});
//
// 		// Description
// 		new Setting(section)
// 			.setName('Description')
// 			.setDesc('Brief description of this template')
// 			.addTextArea(text => {
// 				this.descriptionInput = text.inputEl;
// 				text.setPlaceholder('Template for daily reflection notes')
// 					.setValue(this.metadata.description)
// 					.onChange(value => this.metadata.description = value);
// 				text.inputEl.rows = 2;
// 			});
//
// 		// Filename format
// 		new Setting(section)
// 			.setName('Filename Format')
// 			.setDesc('Format for generated filenames. Use {{date}}, {{time}}, {{title}}, {{timestamp}}')
// 			.addText(text => {
// 				this.filenameFormatInput = text.inputEl;
// 				text.setPlaceholder('{{date}}-{{title}}')
// 					.setValue(this.metadata.filenameFormat)
// 					.onChange(value => this.metadata.filenameFormat = value);
// 			});
//
// 		// Is Default
// 		new Setting(section)
// 			.setName('Set as Default')
// 			.setDesc('Use this template as default for its note type')
// 			.addToggle(toggle => {
// 				this.isDefaultToggle = toggle;
// 				toggle.setValue(this.metadata.isDefault)
// 					.onChange(value => this.metadata.isDefault = value);
// 			});
// 	}
//
// 	createPropertiesSection(container: HTMLElement) {
// 		const section = container.createDiv('editor-section');
// 		section.createEl('h3', { text: 'Note Properties' });
//
// 		const propertiesContainer = section.createDiv('properties-container');
//
// 		// Render existing properties
// 		Object.entries(this.properties).forEach(([key, value]) => {
// 			this.createPropertyField(propertiesContainer, key, value);
// 		});
//
// 		// Add new property button
// 		const addButton = section.createEl('button', {
// 			text: '+ Add Property',
// 			cls: 'mod-cta'
// 		});
// 		addButton.addEventListener('click', () => {
// 			this.createPropertyField(propertiesContainer, '', '');
// 		});
// 	}
//
// 	createPropertyField(container: HTMLElement, key: string, value: string) {
// 		const propertyRow = container.createDiv('property-row');
//
// 		// Key input
// 		const keyInput = propertyRow.createEl('input', {
// 			type: 'text',
// 			placeholder: 'Property name',
// 			value: key,
// 			cls: 'property-key'
// 		});
//
// 		// Value input
// 		const valueInput = propertyRow.createEl('input', {
// 			type: 'text',
// 			placeholder: 'Property value',
// 			value: value,
// 			cls: 'property-value'
// 		});
//
// 		// Delete button
// 		const deleteBtn = propertyRow.createEl('button', {
// 			text: '×',
// 			cls: 'property-delete'
// 		});
// 		deleteBtn.addEventListener('click', () => {
// 			propertyRow.remove();
// 		});
//
// 		// Update properties on change
// 		const updateProperty = () => {
// 			const newKey = keyInput.value.trim();
// 			if (newKey) {
// 				// Remove old key if it changed
// 				if (key && key !== newKey) {
// 					delete this.properties[key];
// 				}
// 				this.properties[newKey] = valueInput.value;
// 				key = newKey;
// 			}
// 		};
//
// 		keyInput.addEventListener('change', updateProperty);
// 		valueInput.addEventListener('change', updateProperty);
// 	}
//
// 	createContentSection(container: HTMLElement) {
// 		const section = container.createDiv('editor-section');
// 		section.createEl('h3', { text: 'Template Content' });
//
// 		const contentContainer = section.createDiv('content-container');
//
// 		// Render existing sections
// 		this.sections.forEach((section, index) => {
// 			this.createSectionEditor(contentContainer, section, index);
// 		});
//
// 		// Add new section button
// 		const addButton = section.createEl('button', {
// 			text: '+ Add Section',
// 			cls: 'mod-cta'
// 		});
// 		addButton.addEventListener('click', () => {
// 			const newSection: TemplateSection = {
// 				name: 'New Section',
// 				level: 2,
// 				content: ''
// 			};
// 			this.sections.push(newSection);
// 			this.createSectionEditor(contentContainer, newSection, this.sections.length - 1);
// 		});
// 	}
//
// 	createSectionEditor(container: HTMLElement, section: TemplateSection, index: number) {
// 		const sectionDiv = container.createDiv('section-editor');
//
// 		// Section header
// 		const header = sectionDiv.createDiv('section-header');
//
// 		// Heading level selector
// 		const levelSelect = header.createEl('select', { cls: 'heading-level' });
// 		for (let i = 1; i <= 6; i++) {
// 			const option = levelSelect.createEl('option', {
// 				value: i.toString(),
// 				text: '#'.repeat(i)
// 			});
// 			if (i === section.level) option.selected = true;
// 		}
// 		levelSelect.addEventListener('change', () => {
// 			section.level = parseInt(levelSelect.value);
// 		});
//
// 		// Section name
// 		const nameInput = header.createEl('input', {
// 			type: 'text',
// 			value: section.name,
// 			cls: 'section-name',
// 			placeholder: 'Section name'
// 		});
// 		nameInput.addEventListener('change', () => {
// 			section.name = nameInput.value;
// 		});
//
// 		// Delete button
// 		const deleteBtn = header.createEl('button', {
// 			text: '×',
// 			cls: 'section-delete'
// 		});
// 		deleteBtn.addEventListener('click', () => {
// 			this.sections.splice(index, 1);
// 			sectionDiv.remove();
// 		});
//
// 		// Content textarea
// 		const contentArea = sectionDiv.createEl('textarea', {
// 			cls: 'section-content',
// 			placeholder: 'Section content (supports Markdown)',
// 			value: section.content
// 		});
// 		contentArea.rows = 4;
// 		contentArea.addEventListener('change', () => {
// 			section.content = contentArea.value;
// 		});
// 	}
//
// 	createActionsSection(container: HTMLElement) {
// 		const actions = container.createDiv('editor-actions');
//
// 		// Cancel button
// 		const cancelBtn = actions.createEl('button', { text: 'Cancel' });
// 		cancelBtn.addEventListener('click', () => this.close());
//
// 		// Save button
// 		const saveBtn = actions.createEl('button', {
// 			text: this.templateId ? 'Update Template' : 'Create Template',
// 			cls: 'mod-cta'
// 		});
// 		saveBtn.addEventListener('click', () => this.save());
// 	}
//
// 	async save() {
// 		// Validate
// 		if (!this.metadata.name.trim()) {
// 			new Notice('Template name is required');
// 			return;
// 		}
//
// 		// Build template content
// 		const content = this.buildTemplateContent();
//
// 		try {
// 			if (this.templateId) {
// 				// Update existing template
// 				await this.plugin.updateTemplate(this.templateId, this.metadata, content);
// 			} else {
// 				// Create new template
// 				await this.plugin.createTemplate(this.metadata, content);
// 			}
// 			this.close();
// 		} catch (error) {
// 			// @ts-ignore
// 			new Notice(`Failed to save template: ${error.message}`);
// 		}
// 	}
//
// 	buildTemplateContent(): string {
// 		let content = '';
//
// 		// Add custom properties to frontmatter (excluding empty ones)
// 		const customProps = Object.entries(this.properties)
// 			.filter(([key, value]) => key.trim() && value.trim())
// 			.map(([key, value]) => `${key}: ${value}`)
// 			.join('\n');
//
// 		if (customProps) {
// 			content += customProps + '\n';
// 		}
//
// 		// Add sections
// 		this.sections.forEach(section => {
// 			if (section.name.trim()) {
// 				content += `\n${'#'.repeat(section.level)} ${section.name}\n\n`;
// 				if (section.content.trim()) {
// 					content += section.content + '\n';
// 				}
// 			}
// 		});
//
// 		return content.trim();
// 	}
//
// 	onClose() {
// 		const { contentEl } = this;
// 		contentEl.empty();
// 	}
// }
import { App, Modal, Setting, TextAreaComponent, ToggleComponent, Notice, TFile } from 'obsidian';
import ZettelkastenTemplatePlugin from '../main';
import { NoteType } from '../types';
import { BaseNote } from '../notes/note';

interface TemplateSection {
	name: string;
	level: number;
	content: string;
}

interface PropertyDefinition {
	value: any;
	type: 'string' | 'number' | 'boolean' | 'date' | 'list';
}

export class TemplateEditorModal extends Modal {
	plugin: ZettelkastenTemplatePlugin;
	templateId?: string;
	metadata: any;

	// Form fields
	nameInput: HTMLInputElement;
	typeDropdown: HTMLSelectElement;
	descriptionInput: HTMLTextAreaElement;
	filenameFormatInput: HTMLInputElement;
	isDefaultToggle: ToggleComponent;

	// Content editor
	sections: TemplateSection[] = [];
	properties: Record<string, PropertyDefinition> = {};

	constructor(app: App, plugin: ZettelkastenTemplatePlugin, templateId?: string, metadata?: any) {
		super(app);
		this.plugin = plugin;
		this.templateId = templateId;
		this.metadata = metadata || {
			name: '',
			noteType: NoteType.FLEETING,
			description: '',
			filenameFormat: '{{date}}-{{title}}',
			isDefault: false
		};
	}

	async onOpen() {
		const { contentEl } = this;
		contentEl.empty();
		contentEl.addClass('zettelkasten-template-editor');

		// Header
		contentEl.createEl('h2', {
			text: this.templateId ? `Edit Template: ${this.metadata.name}` : 'Create New Template'
		});

		// If editing, load the template content
		if (this.templateId) {
			await this.loadTemplateContent();
		}

		// Create form
		this.createMetadataSection(contentEl);
		this.createPropertiesSection(contentEl);
		this.createContentSection(contentEl);
		this.createActionsSection(contentEl);
	}

	async loadTemplateContent() {
		const templatePath = `${this.plugin.settings.templateFolder}/${this.templateId}.md`;
		const file = this.app.vault.getAbstractFileByPath(templatePath);

		if (file && file instanceof TFile) {
			const content = await this.app.vault.read(file);

			// Parse properties and sections
			const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
			if (frontmatterMatch) {
				const [, frontmatter, body] = frontmatterMatch;

				// Parse custom properties (excluding template metadata and base properties)
				const lines = frontmatter.split('\n');
				let inCustomProperties = false;
				let currentKey: string | null = null;
				let currentValue: any[] = [];

				for (const line of lines) {
					if (line.includes('# Custom Properties')) {
						inCustomProperties = true;
						continue;
					}

					if (!inCustomProperties) continue;

					// Check if it's an array item
					if (line.trim().startsWith('- ') && currentKey) {
						currentValue.push(line.trim().substring(2));
						continue;
					}

					// Check if it's a key-value pair
					const match = line.match(/^(.+?):\s*(.*)$/);
					if (match) {
						// Save previous property if exists
						if (currentKey && currentValue.length > 0) {
							this.properties[currentKey] = {
								value: currentValue,
								type: 'list'
							};
							currentValue = [];
						}

						const [, key, value] = match;
						currentKey = key.trim();

						if (value.trim()) {
							// Single value property
							this.properties[currentKey] = {
								value: value.trim(),
								type: this.detectPropertyType(value.trim())
							};
							currentKey = null;
						}
					}
				}

				// Save last array property if exists
				if (currentKey && currentValue.length > 0) {
					this.properties[currentKey] = {
						value: currentValue,
						type: 'list'
					};
				}

				// Parse body sections
				this.sections = this.parseBodySections(body);
			}
		}
	}

	detectPropertyType(value: string): PropertyDefinition['type'] {
		if (value === 'true' || value === 'false') return 'boolean';
		if (!isNaN(Number(value))) return 'number';
		if (value.match(/^\d{4}-\d{2}-\d{2}$/)) return 'date';
		return 'string';
	}

	parseBodySections(body: string): TemplateSection[] {
		const sections: TemplateSection[] = [];
		const lines = body.split('\n');

		let currentSection: TemplateSection | null = null;
		let contentBuffer: string[] = [];

		for (const line of lines) {
			const headerMatch = line.match(/^(#+)\s+(.+)$/);

			if (headerMatch) {
				// Save previous section
				if (currentSection) {
					currentSection.content = contentBuffer.join('\n').trim();
					sections.push(currentSection);
					contentBuffer = [];
				}

				// Start new section
				currentSection = {
					name: headerMatch[2],
					level: headerMatch[1].length,
					content: ''
				};
			} else {
				contentBuffer.push(line);
			}
		}

		// Save last section
		if (currentSection) {
			currentSection.content = contentBuffer.join('\n').trim();
			sections.push(currentSection);
		} else if (contentBuffer.length > 0) {
			// No headers found, create default section
			sections.push({
				name: 'Content',
				level: 1,
				content: contentBuffer.join('\n').trim()
			});
		}

		return sections;
	}

	createMetadataSection(container: HTMLElement) {
		const section = container.createDiv('editor-section');
		section.createEl('h3', { text: 'Template Metadata' });

		// Name
		new Setting(section)
			.setName('Template Name')
			.setDesc('Unique name for this template')
			.addText(text => {
				this.nameInput = text.inputEl;
				text.setPlaceholder('Daily Note')
					.setValue(this.metadata.name)
					.onChange(value => this.metadata.name = value);
			});

		// Type
		new Setting(section)
			.setName('Note Type')
			.setDesc('Type of notes this template creates')
			.addDropdown(dropdown => {
				this.typeDropdown = dropdown.selectEl;
				Object.values(NoteType).forEach(type => {
					dropdown.addOption(type, type.toUpperCase());
				});
				dropdown.setValue(this.metadata.noteType)
					.onChange(value => this.metadata.noteType = value);
			});

		// Description
		new Setting(section)
			.setName('Description')
			.setDesc('Brief description of this template')
			.addTextArea(text => {
				this.descriptionInput = text.inputEl;
				text.setPlaceholder('Template for daily reflection notes')
					.setValue(this.metadata.description)
					.onChange(value => this.metadata.description = value);
				text.inputEl.rows = 2;
			});

		// Filename format
		new Setting(section)
			.setName('Filename Format')
			.setDesc('Format for generated filenames. Use {{date}}, {{time}}, {{title}}, {{timestamp}}')
			.addText(text => {
				this.filenameFormatInput = text.inputEl;
				text.setPlaceholder('{{date}}-{{title}}')
					.setValue(this.metadata.filenameFormat)
					.onChange(value => this.metadata.filenameFormat = value);
			});

		// Is Default
		new Setting(section)
			.setName('Set as Default')
			.setDesc('Use this template as default for its note type')
			.addToggle(toggle => {
				this.isDefaultToggle = toggle;
				toggle.setValue(this.metadata.isDefault)
					.onChange(value => this.metadata.isDefault = value);
			});
	}

	createPropertiesSection(container: HTMLElement) {
		const section = container.createDiv('editor-section');
		section.createEl('h3', { text: 'Custom Properties' });
		section.createEl('p', {
			text: 'Add custom properties to your template. Base properties (id, title, type, etc.) are included automatically.',
			cls: 'setting-item-description'
		});

		const propertiesContainer = section.createDiv('properties-container');

		// Render existing properties
		Object.entries(this.properties).forEach(([key, prop]) => {
			this.createPropertyField(propertiesContainer, key, prop);
		});

		// Add new property button
		const addButton = section.createEl('button', {
			text: '+ Add Property',
			cls: 'mod-cta'
		});
		addButton.addEventListener('click', () => {
			const newProp: PropertyDefinition = { value: '', type: 'string' };
			this.createPropertyField(propertiesContainer, '', newProp);
		});
	}

	createPropertyField(container: HTMLElement, key: string, prop: PropertyDefinition) {
		const propertyRow = container.createDiv('property-row');

		// Key input
		const keyInput = propertyRow.createEl('input', {
			type: 'text',
			placeholder: 'Property name',
			value: key,
			cls: 'property-key'
		});

		// Type selector
		const typeSelect = propertyRow.createEl('select', { cls: 'property-type' });
		['string', 'number', 'boolean', 'date', 'list'].forEach(type => {
			const option = typeSelect.createEl('option', {
				value: type,
				text: type.charAt(0).toUpperCase() + type.slice(1)
			});
			if (type === prop.type) option.selected = true;
		});

		// Value input container
		const valueContainer = propertyRow.createDiv('property-value-container');
		this.updateValueInput(valueContainer, prop, typeSelect.value as PropertyDefinition['type']);

		// Type change handler
		typeSelect.addEventListener('change', () => {
			prop.type = typeSelect.value as PropertyDefinition['type'];
			this.updateValueInput(valueContainer, prop, prop.type);
		});

		// Delete button
		const deleteBtn = propertyRow.createEl('button', {
			text: '×',
			cls: 'property-delete'
		});
		deleteBtn.addEventListener('click', () => {
			propertyRow.remove();
			if (key) delete this.properties[key];
		});

		// Update properties on change
		const updateProperty = () => {
			const newKey = keyInput.value.trim();
			if (newKey) {
				// Remove old key if it changed
				if (key && key !== newKey) {
					delete this.properties[key];
				}
				this.properties[newKey] = prop;
				key = newKey;
			}
		};

		keyInput.addEventListener('change', updateProperty);
	}

	updateValueInput(container: HTMLElement, prop: PropertyDefinition, type: PropertyDefinition['type']) {
		container.empty();

		switch (type) {
			case 'boolean':
				const checkbox = container.createEl('input', {
					type: 'checkbox',
					cls: 'property-value'
				});
				checkbox.checked = prop.value === true || prop.value === 'true';
				checkbox.addEventListener('change', () => {
					prop.value = checkbox.checked;
				});
				break;

			case 'number':
				const numberInput = container.createEl('input', {
					type: 'number',
					cls: 'property-value',
					value: prop.value || '0'
				});
				numberInput.addEventListener('change', () => {
					prop.value = numberInput.value;
				});
				break;

			case 'date':
				const dateInput = container.createEl('input', {
					type: 'date',
					cls: 'property-value',
					value: prop.value || ''
				});
				dateInput.addEventListener('change', () => {
					prop.value = dateInput.value;
				});
				break;

			case 'list':
				const listContainer = container.createDiv('list-value-container');
				const values = Array.isArray(prop.value) ? prop.value : (prop.value ? [prop.value] : []);

				values.forEach((value, index) => {
					this.createListItem(listContainer, value, values, index);
				});

				const addItemBtn = listContainer.createEl('button', {
					text: '+ Add item',
					cls: 'add-list-item'
				});
				addItemBtn.addEventListener('click', () => {
					values.push('');
					prop.value = values;
					this.createListItem(listContainer, '', values, values.length - 1);
				});
				break;

			case 'string':
			default:
				const textInput = container.createEl('input', {
					type: 'text',
					cls: 'property-value',
					placeholder: 'Property value',
					value: prop.value || ''
				});
				textInput.addEventListener('change', () => {
					prop.value = textInput.value;
				});
				break;
		}
	}

	createListItem(container: HTMLElement, value: string, values: string[], index: number) {
		const itemRow = container.createDiv('list-item-row');

		const itemInput = itemRow.createEl('input', {
			type: 'text',
			value: value,
			placeholder: 'List item',
			cls: 'list-item-input'
		});

		itemInput.addEventListener('change', () => {
			values[index] = itemInput.value;
		});

		const deleteBtn = itemRow.createEl('button', {
			text: '×',
			cls: 'list-item-delete'
		});
		deleteBtn.addEventListener('click', () => {
			values.splice(index, 1);
			itemRow.remove();
		});
	}

	createContentSection(container: HTMLElement) {
		const section = container.createDiv('editor-section');
		section.createEl('h3', { text: 'Template Content' });

		const contentContainer = section.createDiv('content-container');

		// If no sections exist, add a default one
		if (this.sections.length === 0) {
			this.sections.push({
				name: 'Content',
				level: 1,
				content: ''
			});
		}

		// Render existing sections
		this.sections.forEach((section, index) => {
			this.createSectionEditor(contentContainer, section, index);
		});

		// Add new section button
		const addButton = section.createEl('button', {
			text: '+ Add Section',
			cls: 'mod-cta'
		});
		addButton.addEventListener('click', () => {
			const newSection: TemplateSection = {
				name: 'New Section',
				level: 1,  // Default to # instead of ##
				content: ''
			};
			this.sections.push(newSection);
			this.createSectionEditor(contentContainer, newSection, this.sections.length - 1);
		});
	}

	createSectionEditor(container: HTMLElement, section: TemplateSection, index: number) {
		const sectionDiv = container.createDiv('section-editor');

		// Section header
		const header = sectionDiv.createDiv('section-header');

		// Heading level selector
		const levelSelect = header.createEl('select', { cls: 'heading-level' });
		for (let i = 1; i <= 6; i++) {
			const option = levelSelect.createEl('option', {
				value: i.toString(),
				text: '#'.repeat(i)
			});
			if (i === section.level) option.selected = true;
		}
		levelSelect.addEventListener('change', () => {
			section.level = parseInt(levelSelect.value);
		});

		// Section name
		const nameInput = header.createEl('input', {
			type: 'text',
			value: section.name,
			cls: 'section-name',
			placeholder: 'Section name'
		});
		nameInput.addEventListener('change', () => {
			section.name = nameInput.value;
		});

		// Delete button
		const deleteBtn = header.createEl('button', {
			text: '×',
			cls: 'section-delete'
		});
		deleteBtn.addEventListener('click', () => {
			this.sections.splice(index, 1);
			sectionDiv.remove();
		});

		// Content textarea
		const contentArea = sectionDiv.createEl('textarea', {
			cls: 'section-content',
			placeholder: 'Section content (supports Markdown)',
			value: section.content
		});
		contentArea.rows = 4;
		contentArea.addEventListener('change', () => {
			section.content = contentArea.value;
		});
	}

	createActionsSection(container: HTMLElement) {
		const actions = container.createDiv('editor-actions');

		// Cancel button
		const cancelBtn = actions.createEl('button', { text: 'Cancel' });
		cancelBtn.addEventListener('click', () => this.close());

		// Save button
		const saveBtn = actions.createEl('button', {
			text: this.templateId ? 'Update Template' : 'Create Template',
			cls: 'mod-cta'
		});
		saveBtn.addEventListener('click', () => this.save());
	}

	async save() {
		// Validate
		if (!this.metadata.name.trim()) {
			new Notice('Template name is required');
			return;
		}

		try {
			if (this.templateId) {
				// Update existing template
				await this.plugin.updateTemplate(this.templateId, this.metadata, this.properties, this.sections);
			} else {
				// Create new template
				await this.plugin.createTemplate(this.metadata, this.properties, this.sections);
			}
			this.close();
		} catch (error) {
			new Notice(`Failed to save template: ${error.message}`);
		}
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}
}
