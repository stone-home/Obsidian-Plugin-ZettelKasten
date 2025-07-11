import { App, PluginSettingTab, Setting, TFile, Notice } from 'obsidian';
import ZettelkastenPlugin from './main';
import { INoteOption, NoteTypeData, CreateNoteOptions, NoteType, ConfigHelper } from './notes'; // Import NoteType and ConfigHelper
import { DEFAULT_SETTINGS } from './config'; //
import { ZettelKastenModal } from './notes'; // Import ZettelKastenModal

// Define your sections for horizontal navigation
interface SettingsSection {
	id: string;
	name: string;
	icon: string; // Optional: for icons in navigation
}

const SETTINGS_SECTIONS: SettingsSection[] = [
	{ id: 'general', name: 'Basic', icon: 'gear' },
	{ id: 'paths', name: 'Paths', icon: 'folder' },
	{ id: 'note-creation', name: 'Note Creation', icon: 'file-plus' },
	// Add more sections/tabs as needed, matching names from your screenshot if applicable
	// e.g., { id: 'model', name: 'Model', icon: 'boxes' },
	// { id: 'qa', name: 'QA', icon: 'question-mark' },
	// { id: 'command', name: 'Command', icon: 'terminal' },
	// { id: 'plus', name: 'Plus', icon: 'plus-circle' },
	// { id: 'advanced', name: 'Advanced', icon: 'wrench' },
];

export class ZettelkastenSettingTab extends PluginSettingTab {
	plugin: ZettelkastenPlugin;
	private activeSection: string; // State to keep track of the active section

	constructor(app: App, plugin: ZettelkastenPlugin) {
		super(app, plugin);
		this.plugin = plugin;
		this.activeSection = SETTINGS_SECTIONS[0].id; // Set initial active section
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty(); // Clear existing content
		containerEl.addClass('zettelkasten-settings-container-modern'); // Add a main container class

		// Header (optional, if you want plugin name/version at the very top)
		containerEl.createEl('h1', { text: 'Zettelkasten Settings', cls: 'settings-title-modern' });

		// Create the horizontal tab navigation area
		this.createHorizontalNavigation(containerEl);

		// Create the content area for settings details
		const contentArea = containerEl.createDiv('settings-detail-area-modern');
		// Optional: Section title within the content area if desired
		// contentArea.createEl('h2', { text: SETTINGS_SECTIONS.find(s => s.id === this.activeSection)?.name || '', cls: 'settings-section-title-modern' });


		// Render content based on the active section
		switch (this.activeSection) {
			case 'general':
				this.renderGeneralSettings(contentArea);
				break;
			case 'paths':
				this.renderPathsSettings(contentArea);
				break;
			case 'note-creation':
				this.renderNoteCreationSettings(contentArea);
				break;
			// Add cases for other sections
			default:
				this.renderGeneralSettings(contentArea);
		}
	}

	private createHorizontalNavigation(parentEl: HTMLElement): void {
		const navContainer = parentEl.createDiv('settings-tab-nav-modern');
		SETTINGS_SECTIONS.forEach(section => {
			const sectionButton = navContainer.createEl('button', {
				cls: ['settings-tab-button-modern', this.activeSection === section.id ? 'is-active' : ''],
			});
			// Add icon if available (you might need to import `setIcon` from 'obsidian')
			// if (section.icon) {
			//     setIcon(sectionButton, section.icon);
			//     sectionButton.addClass('has-icon'); // Add class if button has icon
			// }
			sectionButton.createSpan({ text: section.name, cls: 'settings-tab-button-text-modern' });

			sectionButton.addEventListener('click', () => {
				this.activeSection = section.id;
				this.display(); // Re-render the settings page to show new section content
			});
		});
		// Add a line/border below the tabs if desired, mimicking the screenshot
		navContainer.createDiv('settings-tab-underline-modern');
	}

	// --- Section Content Rendering Methods (remain largely the same) ---

	private renderGeneralSettings(containerEl: HTMLElement): void {
		// No longer need to create h3 here, header is handled by settings-section-title-modern or global title
		// containerEl.createEl('h3', { text: 'General Settings' });

		new Setting(containerEl)
			.setName('Auto Open New Note')
			.setDesc('Automatically open a newly created note in the editor.')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.autoOpenNewNote)
				.onChange(async (value) => {
					this.plugin.settings.autoOpenNewNote = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Show Upgrade Notifications')
			.setDesc('Display notifications when a note can be upgraded.')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.showUpgradeNotifications)
				.onChange(async (value) => {
					this.plugin.settings.showUpgradeNotifications = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Use Templater')
			.setDesc('Enable integration with the Templater plugin for advanced template features.')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.useTemplater)
				.onChange(async (value) => {
					this.plugin.settings.useTemplater = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Maximum Recent Notes')
			.setDesc('The maximum number of recent notes to display in certain interfaces.')
			.addText(text => text
				.setPlaceholder('e.g., 10')
				.setValue(this.plugin.settings.maxRecentNotes.toString())
				.onChange(async (value) => {
					const num = parseInt(value);
					if (!isNaN(num) && num >= 0) {
						this.plugin.settings.maxRecentNotes = num;
						await this.plugin.saveSettings();
					} else {
						new Notice('Invalid input: Please enter a non-negative number.', 3000);
					}
				}));

		new Setting(containerEl)
			.setName('Enable Auto-Linking')
			.setDesc('Automatically create backlinks when upgrading or relating notes.')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.enableAutoLinking)
				.onChange(async (value) => {
					this.plugin.settings.enableAutoLinking = value;
					await this.plugin.saveSettings();
				}));
	}

	private renderPathsSettings(containerEl: HTMLElement): void {
		// No longer need to create h3 here
		// containerEl.createEl('h3', { text: 'Note Paths' });

		new Setting(containerEl)
			.setName('Fleeting Note Path')
			.setDesc('Default folder path for Fleeting notes.')
			.addText(text => text
				.setPlaceholder('e.g., 000-inbox/1-fleeting')
				.setValue(this.plugin.settings.fleetingPath)
				.onChange(async (value) => {
					this.plugin.settings.fleetingPath = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Literature Note Path')
			.setDesc('Default folder path for Literature notes.')
			.addText(text => text
				.setPlaceholder('e.g., 000-inbox/2-literature')
				.setValue(this.plugin.settings.literaturePath)
				.onChange(async (value) => {
					this.plugin.settings.literaturePath = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Permanent Note Path')
			.setDesc('Default folder path for Permanent notes.')
			.addText(text => text
				.setPlaceholder('e.g., 000-inbox/3-permanent')
				.setValue(this.plugin.settings.permanentPath)
				.onChange(async (value) => {
					this.plugin.settings.permanentPath = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Atomic Note Path')
			.setDesc('Default folder path for Atomic notes.')
			.addText(text => text
				.setPlaceholder('e.g., 000-inbox/4-atoms')
				.setValue(this.plugin.settings.atomicPath)
				.onChange(async (value) => {
					this.plugin.settings.atomicPath = value;
					await this.plugin.saveSettings();
				}));
	}

	private renderNoteCreationSettings(containerEl: HTMLElement): void {
		containerEl.createEl('p', { text: 'Configure the available note types and their default properties when creating a new note.' });

		// Loop for existing note type settings
		this.plugin.settings.createNoteOptions.forEach((option: INoteOption, index: number) => {
			const noteTypeSetting = new Setting(containerEl)
				.setName(`${option.label} Note Type`)
				.setDesc(`Enable or disable the "${option.label}" note type in the creation dashboard.`);

			noteTypeSetting.addToggle(toggle => toggle
				.setValue(option.enabled)
				.onChange(async (value) => {
					option.enabled = value;
					await this.plugin.saveSettings();
					this.display(); // Re-render to reflect changes if an option is disabled/enabled
				}));

			if (option.enabled) { // Only show detailed settings if the type is enabled
				noteTypeSetting.addText(text => text
					.setPlaceholder('Label')
					.setValue(option.label)
					.onChange(async (value) => {
						option.label = value;
						await this.plugin.saveSettings();
					}));
				noteTypeSetting.addText(text => text
					.setPlaceholder('Emoji')
					.setValue(option.emoji || '')
					.onChange(async (value) => {
						option.emoji = value;
						await this.plugin.saveSettings();
					}));
				noteTypeSetting.addText(text => text
					.setPlaceholder('Template Name (e.g., "default")')
					.setValue(option.template || 'default')
					.onChange(async (value) => {
						option.template = value;
						await this.plugin.saveSettings();
					}));
				noteTypeSetting.addText(text => text
					.setPlaceholder('Custom Path (optional, overrides global path)')
					.setValue(option.path || '')
					.onChange(async (value) => {
						option.path = value;
						await this.plugin.saveSettings();
					}));
			}
		});

		// Existing reset button
		new Setting(containerEl)
			.addButton(button => button
				.setButtonText('Reset Note Types to Default')
				.setWarning()
				.onClick(async () => {
					this.plugin.settings.createNoteOptions = DEFAULT_SETTINGS.createNoteOptions.map(option => ({ ...option }));
					await this.plugin.saveSettings();
					this.display(); // Re-render to show reset state
				}));
	}
}
