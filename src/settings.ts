import { App, PluginSettingTab, Setting, TFile, Notice, debounce, TextComponent } from 'obsidian';
import ZettelkastenPlugin from './main';
import { INoteOption, NoteType} from './notes'; // Import NoteType and ConfigHelper
import { DEFAULT_SETTINGS } from './config'; //
import { IntegrationManager} from "./3rd";
import { Logger } from './logger'; // Import Logger for logging
import { NoteFactory } from './notes';



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

];

export class ZettelkastenSettingTab extends PluginSettingTab {
	plugin: ZettelkastenPlugin;
	private logger: Logger = Logger.createLogger('ZettelkastenSettingTab'); // Initialize logger for this class
	private activeSection: string; // State to keep track of the active section
	private integrationManager: IntegrationManager; // Placeholder for integration manager, adjust as needed
	private factory: NoteFactory; // Placeholder for note factory, adjust as needed

	constructor(app: App, plugin: ZettelkastenPlugin, factory: NoteFactory) {
		super(app, plugin);
		this.plugin = plugin;
		this.activeSection = SETTINGS_SECTIONS[0].id; // Set initial active section
		this.integrationManager = IntegrationManager.getInstance(app); // Initialize integration manager
		this.factory = factory; // Initialize note factory
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

		let templateDirPathTextComponent: TextComponent;
		new Setting(containerEl)
			.setName('Template Directory Path')
			.setDesc('Default folder path for storing templates used in note creation.')
			.addText(text => {
					text
						.setPlaceholder('e.g., templates')
						.setValue(this.plugin.settings.templateDirPath)
					templateDirPathTextComponent = text
				}
			)
			.addButton(button => button
				.setButtonText('Confirm')
				.onClick(async () => {
					const pathValue = templateDirPathTextComponent.getValue().trim();
					this.plugin.settings.templateDirPath = pathValue;
					await this.plugin.saveSettings();
					this.factory.updateSettings(this.plugin.settings);
					await this.factory.initializeDefaultTemplates();
					new Notice("Template directory path updated successfully.", 3000);
				})
			)
	}


	private renderNoteCreationSettings(containerEl: HTMLElement): void {
		containerEl.createEl('p', { text: 'Configure the available note types and their default properties when creating a new note.' });

		// Loop for existing note type settings
		this.plugin.settings.createNoteOptions.forEach((option: INoteOption, index: number) => {
			const noteTypeSetting = new Setting(containerEl)
				.setName(option.label)
			noteTypeSetting.nameEl.addClass('setting-new-note-record-name')

			// --- Enable/Disable Toggle ---
			noteTypeSetting.addToggle(toggle => toggle
				.setTooltip("Enable or disable this note type in the creation menu.")
				.setValue(option.enabled)
				.onChange(async (value) => {
					option.enabled = value;
					await this.plugin.saveSettings();
					this.display(); // Re-render to show/hide detailed settings
				}));
			// Only show detailed settings if the type is enabled
			if (option.enabled) {
				noteTypeSetting.addDropdown(dropdown => {
					Object.keys(NoteType).forEach(key => {
						// @ts-ignore
						dropdown.addOption(NoteType[key], key); // Use the enum key for both value and text
					});
					dropdown
						.setValue(option.type)
						.onChange(async (value) => {
							option.type = value as NoteType;
							option.label = value; // Update the label to match the selected type
							await this.plugin.saveSettings();
							this.display(); // Re-render to update the setting title
						});
				});

				// --- Emoji Text Input ---
				noteTypeSetting.addText(text => {
					text.inputEl.addClass('setting-new-note-record-emoji')
					text
						.setPlaceholder('Emoji')
						.setValue(option.emoji || '')
						.onChange(debounce(async (value) => {
							option.emoji = value;
							await this.plugin.saveSettings();
						}, 500))

				});

				// --- Template Path Text Input ---
				noteTypeSetting.addDropdown(dropdown => {
					const mapOfTemplates = this.factory.getTemplatesForType(option.type)
					if (mapOfTemplates) {
						for (const [key, value] of mapOfTemplates) {
							dropdown.addOption(key, key); // Add each template to the dropdown
						}
					}
					if (option.template != null) {
						dropdown
							.setValue(option.template)
							.onChange(async (value) => {
								option.type = value as NoteType;
								option.label = value; // Update the label to match the selected type
								await this.plugin.saveSettings();
								this.display(); // Re-render to update the setting title
							});
					}
				});

				// --- Folder Path Text Input ---
				noteTypeSetting.addText(text => {
					text.inputEl.addClass('setting-new-note-record-path')
					text
						.setPlaceholder('Creation Path (optional)')
						.setValue(option.path || '')
						.onChange(debounce(async (value) => {
							option.path = value;
							await this.plugin.saveSettings();
						}, 500))
				});
			}

			// --- Remove Button ---
			noteTypeSetting.addButton(button => button
				.setIcon('cross')
				.setTooltip('Remove this note type')
				.setWarning()
				.onClick(async () => {
					this.plugin.settings.createNoteOptions.splice(index, 1);
					await this.plugin.saveSettings();
					this.display(); // Re-render the list
				}));
		});

		new Setting(containerEl)
			.setName("Add New Record")
			.setDesc("Click the button to add a new record configuration.")
			.addButton(button => {
				button
					.setButtonText("Add")
					.setCta() // Prominent Call To Action style
					.onClick(async (evt) => {
						const noteTypeName = await this.integrationManager.getTemplater().getPrompt("Input New Note Type Name")
						if (!noteTypeName) {
							new Notice('Note type name cannot be empty.', 3000);
							return;
						}
						// Create a new INoteOption object with default values
						const newOption: INoteOption = {
							enabled: true,
							type: NoteType.FLEETING, // Default to Fleeting as a starting point
							label: noteTypeName,
							emoji: '🌱',
							path: '', // Leave empty for user to define
							template: 'default',
						};

						this.plugin.settings.createNoteOptions.push(newOption);
						await this.plugin.saveSettings();
						this.display(); // Re-render the settings to show the new entry
					});
			});

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
