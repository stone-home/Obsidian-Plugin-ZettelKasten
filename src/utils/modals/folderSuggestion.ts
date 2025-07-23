import { App, Modal, TFolder } from "obsidian";

export class StepByStepFolderModal extends Modal {
	private onChoose: (result: TFolder) => void;
	private currentFolder: TFolder;
	private singeLayer: boolean;
	private entryPath: string;

	constructor(
		app: App,
		startFolder: TFolder | null,
		singleLayer: boolean = false,
		onChoose: (result: TFolder) => void,
	) {
		super(app);
		this.onChoose = onChoose;
		this.currentFolder = startFolder || this.app.vault.getRoot();
		this.singeLayer = singleLayer;
		this.entryPath = this.currentFolder.path;
	}

	onOpen() {
		this.display();
	}

	onClose() {
		this.contentEl.empty();
	}

	private display() {
		const { contentEl } = this;
		contentEl.empty();
		contentEl.addClass("modern-folder-modal");

		// --- 1. Header: Current Path ---
		const headerEl = contentEl.createDiv("modal-header");
		headerEl.createEl("h3", {
			text: `Current: ${this.currentFolder.path}`,
		});

		// --- 2. Content: Folder List ---
		const children = this.currentFolder.children.filter(
			(child) => child instanceof TFolder,
		) as TFolder[];
		const folderListEl = contentEl.createDiv("folder-list");

		if (children.length === 0) {
			folderListEl.createEl("div", {
				text: "No sub-folders.",
				cls: "empty-list-notice",
			});
		} else {
			children.forEach((folder) => {
				const folderItemEl = folderListEl.createDiv({
					text: `📁 ${folder.name}`,
					cls: "folder-item",
				});
				folderItemEl.addEventListener("click", () => {
					if (this.singeLayer) {
						this.choose(folder);
					} else {
						this.currentFolder = folder;
						this.display(); // Navigate into the clicked folder
					}
				});
			});
		}

		// --- 3. Footer: Action Buttons ---
		const footerEl = contentEl.createDiv("modal-footer");

		// Back Button (now at the end, as requested)
		if (!this.singeLayer) {
			const backButton = footerEl.createEl("button", {
				text: "Back",
				cls: "back-btn",
			});
			if (this.currentFolder.isRoot()) {
				backButton.disabled = true; // Disable if in root
			}
			backButton.addEventListener("click", () => {
				if (this.currentFolder.parent) {
					this.currentFolder = this.currentFolder.parent;
					this.display();
				}
			});
		}

		// The single confirm button
		if (!this.singeLayer) {
			const confirmButton = footerEl.createEl("button", {
				text: "Select this folder",
				cls: "confirm-btn",
			});
			confirmButton.addEventListener("click", () => {
				this.choose(this.currentFolder);
			});
		}
	}

	private choose(folder: TFolder) {
		this.onChoose(folder);
		this.close();
	}
}
