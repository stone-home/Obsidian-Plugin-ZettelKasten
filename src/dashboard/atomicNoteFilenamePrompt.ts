/**
 * 获取所有文件名，包括文件夹下的所有文件
 */import { App, Modal, Setting, TFile, TFolder } from 'obsidian';

export class AtomicFileNameModal extends Modal {
	private inputEl!: HTMLInputElement;
	private fileName: string = '';
	private resolve!: (value: string | null) => void;
	private sourceData: (TFile | TFolder)[] = [];

	constructor(app: App, sourceData?: (TFile | TFolder)[]) {
		super(app);
		this.sourceData = sourceData || [];
	}

	/**
	 * 打开模态框并返回 Promise
	 * @returns Promise<string | null> - 返回输入的文件名，取消时返回 null
	 */
	public getFileName(): Promise<string | null> {
		return new Promise((resolve) => {
			this.resolve = resolve;
			this.open();
		});
	}

	onOpen() {
		const { contentEl } = this;

		// 注入唯一的 CSS 样式
		this.injectStyles();

		// 设置模态框标题
		contentEl.createEl('h2', {
			text: 'Please enter the file name',
			cls: 'filename-modal-7f2a1b-title'
		});

		// 创建 datalist 用于自动补全
		const suggestionListId = "file-suggestions-datalist";
		const datalist = contentEl.createEl("datalist", {
			attr: { id: suggestionListId }
		});
		this.getAllFileNames().forEach((fileName) => {
			datalist.createEl("option", { value: fileName });
		});

		// 【核心修改】直接创建输入框，而不是用 new Setting()
		this.inputEl = contentEl.createEl('input', {
			type: 'text',
			placeholder: 'Type text here',
			cls: 'filename-modal-7f2a1b-input' // 应用你的 CSS 类
		});
		this.inputEl.setAttribute('list', suggestionListId);
		this.inputEl.value = this.fileName;
		this.inputEl.addEventListener('change', (e) => {
			this.fileName = (e.target as HTMLInputElement).value;
		});
		this.inputEl.addEventListener("keydown", (event) => {
			// 当按下的键是 'Enter' 时
			if (event.key === 'Enter') {
				// 阻止默认行为（例如表单提交或换行）
				event.preventDefault();
				// 调用与“确认”按钮完全相同的处理函数
				this.handleSubmit();
			} else if (event.key === 'Escape') {
				// 同时，也实现了按 'Escape' 键取消的功能
				event.preventDefault();
				this.handleCancel();
			}
		})
		setTimeout(() => { this.inputEl.focus(); }, 10);

		// 创建按钮容器
		const buttonContainer = contentEl.createDiv({ cls: 'filename-modal-7f2a1b-buttons' });
			// 取消按钮
		const cancelButton = buttonContainer.createEl('button', {
			text: 'Cancel',
			cls: 'filename-modal-7f2a1b-btn filename-modal-7f2a1b-btn-cancel'
		});
		cancelButton.onclick = () => {
			this.handleCancel();
		};

		// 确认按钮
		const submitButton = buttonContainer.createEl('button', {
			text: 'Confirm',
			cls: 'filename-modal-7f2a1b-btn filename-modal-7f2a1b-btn-submit mod-cta'
		});
		submitButton.onclick = () => {
			this.handleSubmit();
		};

		// 监听键盘事件
		this.inputEl.addEventListener('keydown', (event) => {
			if (event.key === 'Enter') {
				event.preventDefault();
				this.handleSubmit();
			} else if (event.key === 'Escape') {
				event.preventDefault();
				this.handleCancel();
			}
		});
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();

		// 移除注入的样式
		this.removeStyles();

		// 如果模态框被其他方式关闭（比如点击外部），返回 null
		if (this.resolve) {
			this.resolve(null);
		}
	}

	private handleSubmit() {
		if (this.fileName.trim() && this.resolve) {
			this.resolve(this.fileName.trim());
			this.resolve = null!; // 避免重复调用
			this.close();
		}
	}

	private handleCancel() {
		if (this.resolve) {
			this.resolve(null);
			this.resolve = null!; // 避免重复调用
			this.close();
		}
	}

	/**
	 * 注入唯一的 CSS 样式
	 */
	private injectStyles() {
		const styleId = 'filename-modal-7f2a1b-styles';

		// 检查是否已经注入过样式
		if (document.getElementById(styleId)) {
			return;
		}

		const style = document.createElement('style');
		style.id = styleId;
		style.textContent = `
            .filename-modal-7f2a1b-title {
                color: var(--text-normal);
                font-size: 1.2em;
                font-weight: 600;
                margin-bottom: 1em;
                text-align: center;
            }

            .filename-modal-7f2a1b-input {
                width: 90% !important;
                margin-left: auto !important;
                margin-right: auto !important;
                display: block !important;
                padding: 8px 12px !important;
                background: var(--background-modifier-form-field) !important;
                border: 1px solid var(--background-modifier-border) !important;
                border-radius: 4px !important;
                color: var(--text-normal) !important;
                font-family: var(--font-interface) !important;
                font-size: 14px !important;
                transition: border-color 0.2s ease !important;
                box-sizing: border-box
            }

            .filename-modal-7f2a1b-input:focus {
                outline: none !important;
                border-color: var(--interactive-accent) !important;
                box-shadow: 0 0 0 2px var(--interactive-accent-hover) !important;
            }

            .filename-modal-7f2a1b-input::placeholder {
                color: var(--text-muted) !important;
                opacity: 0.7 !important;
            }

            .filename-modal-7f2a1b-buttons {
                display: flex !important;
                justify-content: flex-end !important;
                gap: 10px !important;
                margin-top: 20px !important;
                padding-top: 15px !important;
                border-top: 1px solid var(--background-modifier-border) !important;
            }

            .filename-modal-7f2a1b-btn {
                padding: 8px 16px !important;
                border-radius: 4px !important;
                font-size: 14px !important;
                font-weight: 500 !important;
                cursor: pointer !important;
                transition: all 0.2s ease !important;
                border: 1px solid transparent !important;
                background: transparent !important;
                color: var(--text-normal) !important;
            }

            .filename-modal-7f2a1b-btn-cancel {
                color: var(--text-muted) !important;
            }

            .filename-modal-7f2a1b-btn-cancel:hover {
                color: var(--text-normal) !important;
                background: var(--background-modifier-hover) !important;
            }

            .filename-modal-7f2a1b-btn-submit {
                background: var(--interactive-accent) !important;
                color: var(--text-on-accent) !important;
            }

            .filename-modal-7f2a1b-btn-submit:hover {
                background: var(--interactive-accent-hover) !important;
            }

            .filename-modal-7f2a1b-btn-submit:disabled {
                background: var(--background-modifier-border) !important;
                color: var(--text-muted) !important;
                cursor: not-allowed !important;
                opacity: 0.6 !important;
            }

            /* 深色主题适配 */
            .theme-dark .filename-modal-7f2a1b-input {
                background: var(--background-primary-alt) !important;
                border-color: var(--background-modifier-border-hover) !important;
            }

            .theme-dark .filename-modal-7f2a1b-input:focus {
                border-color: var(--interactive-accent) !important;
                box-shadow: 0 0 0 2px rgba(var(--interactive-accent-rgb), 0.3) !important;
            }

            /* 自定义 datalist 样式 */
            .filename-modal-7f2a1b-input::-webkit-calendar-picker-indicator {
                display: none !important;
            }
        `;

		document.head.appendChild(style);
	}

	/**
	 * 移除注入的样式
	 */
	private removeStyles() {
		const styleId = 'filename-modal-7f2a1b-styles';
		const existingStyle = document.getElementById(styleId);
		if (existingStyle) {
			existingStyle.remove();
		}
	}
	private getAllFileNames(): string[] {
		const fileNames: string[] = [];

		// 如果没有传入源数据，则使用整个 vault 的文件
		if (this.sourceData.length !== 0) {
			// 处理传入的数据
			this.sourceData.forEach(item => {
				if (item instanceof TFile) {
					const nameParts = item.basename.split(" - ")
					fileNames.push(nameParts.slice(1).join(" - ").trim());
				}
			});
		}

		// 去重并排序
		return [...new Set(fileNames)].sort();
	}
}
