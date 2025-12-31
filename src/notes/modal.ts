import { App, Modal, Setting, Notice } from 'obsidian';

/**
 * A simple confirmation modal.
 * It displays a message and a button to trigger a function.
 */
export class ConfirmationModal extends Modal {
	// The function to call when the button is clicked
	private onConfirm: () => void;
	private message: string;

	/**
	 * @param app The Obsidian App instance.
	 * @param message The message to display to the user.
	 * @param onConfirm The function to execute when the user clicks the confirm button.
	 */
	constructor(app: App, message: string, onConfirm: () => void) {
		super(app);
		this.message = message;
		this.onConfirm = onConfirm;
	}

	/**
	 * Called when the modal is opened. This is where you'll build the UI.
	 */
	onOpen() {
		// Get the content element of the modal
		const { contentEl } = this;

		// Add a title to the modal
		contentEl.createEl('h2', { text: 'Are you sure?' });

		// Add the descriptive message
		contentEl.createEl('p', { text: this.message });

		// Add the settings container for the button
		new Setting(contentEl)
			// Add a button to the setting
			.addButton((button) => {
				button
					.setButtonText('Confirm Action')
					.setCta() // Makes the button more prominent
					.onClick(() => {
						// 1. Close the modal
						this.close();
						// 2. Execute the callback function
						this.onConfirm();
					});
			});
	}

	/**
	 * Called when the modal is closed.
	 */
	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}
}
