// script-picker-modal.ts - Modal for selecting and executing scripts
import { App, Modal, Setting, DropdownComponent } from 'obsidian';
import { DataviewJSManager } from "../manager";
import { IDataviewScript } from "../types";

export class DataViewScriptPickerModal extends Modal {
	private jsManager: DataviewJSManager;
	private onExecute: (scriptId: string, params: Record<string, any>) => void;
	private selectedScript: IDataviewScript | null = null;
	private parameters: Record<string, any> = {};
	private parametersContainer: HTMLElement | undefined;

	constructor(
		app: App,
		jsManager: DataviewJSManager,
		onExecute: (scriptId: string, params: Record<string, any>) => void
	) {
		super(app);
		this.jsManager = jsManager;
		this.onExecute = onExecute;
	}

	onOpen(): void {
		const { contentEl } = this;
		contentEl.empty();

		contentEl.createEl('h2', { text: 'Execute Dataview Script' });

		// Script selection dropdown
		const scripts = this.jsManager.getScripts();
		const scriptOptions: Record<string, string> = {};
		scripts.forEach(script => {
			scriptOptions[script.id] = `${script.name} (${script.category || 'general'})`;
		});

		new Setting(contentEl)
			.setName('Select Script')
			.setDesc('Choose a dataview script to execute')
			.addDropdown(dropdown => {
				dropdown.addOptions(scriptOptions);
				dropdown.onChange(value => {
					this.selectedScript = this.jsManager.getScript(value) || null;
					this.refreshParameterInputs();
				});

				// Select first script by default
				if (scripts.length > 0) {
					dropdown.setValue(scripts[0].id);
					this.selectedScript = scripts[0];
					this.refreshParameterInputs();
				}
			});

		// Parameters container
		const parametersEl = contentEl.createDiv({ cls: 'script-parameters' });
		this.parametersContainer = parametersEl;

		// Execute button
		new Setting(contentEl)
			.addButton(btn => {
				btn.setButtonText('Execute Script')
					.setCta()
					.onClick(() => {
						if (this.selectedScript) {
							this.onExecute(this.selectedScript.id, this.parameters);
							this.close();
						}
					});
			});
	}

	private refreshParameterInputs(): void {
		if (this.parametersContainer) {
			const parametersEl = this.parametersContainer;
			parametersEl.empty();
			this.parameters = {};

			if (!this.selectedScript?.parameters) return;

			parametersEl.createEl('h3', { text: 'Parameters' });

			this.selectedScript.parameters.forEach(param => {
				const setting = new Setting(parametersEl)
					.setName(param.name)
					.setDesc(param.description || `Type: ${param.type}`);

				// Set default value
				if (param.default !== undefined) {
					this.parameters[param.name] = param.default;
				}

				// Create appropriate input based on parameter type
				switch (param.type) {
					case 'string':
						setting.addText(text => {
							if (param.default) text.setValue(String(param.default));
							text.onChange(value => {
								this.parameters[param.name] = value;
							});
						});
						break;

					case 'number':
						setting.addText(text => {
							if (param.default) text.setValue(String(param.default));
							text.setPlaceholder('Enter a number');
							text.onChange(value => {
								const numValue = parseFloat(value);
								this.parameters[param.name] = isNaN(numValue) ? param.default : numValue;
							});
						});
						break;

					case 'boolean':
						setting.addToggle(toggle => {
							if (param.default) toggle.setValue(Boolean(param.default));
							toggle.onChange(value => {
								this.parameters[param.name] = value;
							});
						});
						break;

					case 'date':
						setting.addText(text => {
							text.setPlaceholder('YYYY-MM-DD');
							if (param.default) text.setValue(String(param.default));
							text.onChange(value => {
								this.parameters[param.name] = value;
							});
						});
						break;

					case 'array':
						setting.addTextArea(textarea => {
							textarea.setPlaceholder('Enter comma-separated values');
							if (param.default && Array.isArray(param.default)) {
								textarea.setValue(param.default.join(', '));
							}
							textarea.onChange(value => {
								this.parameters[param.name] = value.split(',').map(v => v.trim()).filter(v => v);
							});
						});
						break;
				}

				// Mark required parameters
				if (param.required) {
					setting.nameEl.createSpan({ text: ' *', cls: 'required-marker' });
				}
			});
		}

	}

	onClose(): void {
		const { contentEl } = this;
		contentEl.empty();
	}
}
