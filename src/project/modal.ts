import { App, Modal, Notice, setIcon, Setting } from "obsidian";
import {
	SearchDashboardModal,
	ISearchResult,
	IDashboardWorkflowInput,
} from "../research";
import ZettelkastenPlugin from "../main";
import { NoteFactory } from "../notes";
import { Logger } from "../logger";
import { Utils } from "../utils";
import { Project, ProjectConfig } from "../project";
import { ProjectFileType } from "./config";

export class ProjectDashboardModal extends Modal {
	private selectedProject: Project | undefined = undefined;
	private projects: Record<string, Project> = {};
	private plugin: ZettelkastenPlugin;
	private factory: NoteFactory;
	private logger = Logger.createLogger("ResearchDashboardModal");
	private codeBlockType: string;

	constructor(app: App, plugin: ZettelkastenPlugin, factory: NoteFactory) {
		super(app);
		this.plugin = plugin;
		this.factory = factory;
		this.modalEl.addClass("research-dashboard-modal");
		this.codeBlockType =
			this.plugin.settings.dataviewCodeBlockType || "zettelkasten";
	}

	async onOpen() {
		await this.loadAllProjects();
		const { contentEl } = this;
		contentEl.empty();

		contentEl.createEl("h1", { text: "Research Dashboard" });

		this.renderCreating(contentEl);
		this.addStyles();
	}

	private getProjectsPath(): string {
		return this.plugin.settings.projectPath;
	}

	private async loadAllProjects(): Promise<void> {
		const entrypoint = this.getProjectsPath();
		if (!Utils.fileExists(this.app, entrypoint, true)) {
			await this.app.vault.createFolder(this.getProjectsPath());
		}
		const filesAndFolders = await this.app.vault.adapter.list(entrypoint);
		if (filesAndFolders.folders.length === 0) {
			this.logger.info(`No Projects found in path: ${entrypoint}`);
		}
		const regex = /^\d{4}-\d{2}-\d{2}\s*-\s*(.*)$/;
		filesAndFolders.folders.forEach((folder) => {
			const folderName = folder.split("/").pop()?.trim() || "";
			const nameMatch = folderName.match(regex);
			if (nameMatch) {
				const projectName = nameMatch[1].trim();
				this.projects[projectName] = this.createProjectEntity(
					projectName,
					folderName,
				);
			}
		});
	}

	private renderCreating(container: HTMLElement) {
		const section = container.createDiv("dashboard-section");
		const header = section.createDiv("creating-header");
		header.createEl("h3", { text: "Creating" });
		header.createEl("span", { text: "✨" });

		new Setting(section)
			.setName("Select Project")
			.setDesc("Choose the project you are currently working on.")
			.addDropdown((dropdown) => {
				dropdown.addOption("", "Select a project...");
				Object.keys(this.projects).forEach((key) =>
					dropdown.addOption(key, key),
				);
				if (this.selectedProject) {
					dropdown.setValue(this.selectedProject.getBaseName());
				} else {
					dropdown.setValue("");
				}

				dropdown.onChange(async (value) => {
					if (value === "") {
						// If "Select a project..." is chosen, clear the selected project
						this.selectedProject = undefined;
					} else {
						// Otherwise, set the selected project based on the chosen key
						this.selectedProject = this.projects[value];
					}
					await this.onOpen();
				});
			})
			.addButton((button) => {
				button.setIcon("plus");
				button.onClick(async () => {
					await this.createProject();
					this.close();
				});
			});

		if (this.selectedProject) {
			const workflow = section.createDiv("workflow-steps");
			const steps = [
				{
					text: "Questions",
					icon: "help-circle",
					callback: async () => {
						if (!this.selectedProject) {
							new Notice("Please select a project first.");
							return;
						}
						const projectName =
							this.selectedProject.getProjectName();
						const mainFileName =
							this.selectedProject.projectNameToFileName(
								projectName,
							);
						await this.selectedProject.createSubtaskProject(
							{
								name: mainFileName,
								basename: mainFileName,
								path:
									this.getProjectsPath() + "/" + mainFileName,
								tags: [],
							},
							ProjectFileType.questionType,
						);
						this.close();
					},
				},
				{
					text: "Objective",
					icon: "target",
					callback: async () => {
						const targetProject = this.selectedProject;
						if (!targetProject) {
							this.logger.error("Select a project first.");
							new Notice("Please select a project first.");
							return;
						}
						new SearchDashboardModal(
							this.app,
							this.plugin,
							this.factory,
							(selectedNote) =>
								targetProject.createSubtaskProject(
									selectedNote,
								),
							targetProject.getTargetFolderPath(
								ProjectFileType.questionType,
							),
							`Create Objective for ${targetProject.getBaseName()}`,
						).open();
						this.close();
					},
				},
				{
					text: "Steps",
					icon: "list-ordered",
					callback: async () => {
						const targetProject = this.selectedProject;
						if (!targetProject) {
							this.logger.error("Select a project first.");
							new Notice("Please select a project first.");
							return;
						}
						new SearchDashboardModal(
							this.app,
							this.plugin,
							this.factory,
							(selectedNote) =>
								targetProject.createSubtaskProject(
									selectedNote,
								),
							targetProject.getTargetFolderPath(
								ProjectFileType.objectiveType,
							),
							`Create Steps for ${targetProject.getBaseName()}`,
						).open();
						this.close();
					},
				},
			];
			this.createWorkflow(workflow, steps);
		}
	}

	private createWorkflow(
		container: HTMLElement,
		steps: IDashboardWorkflowInput[],
	) {
		steps.forEach((step, index) => {
			const stepEl = container.createDiv({ cls: "workflow-step" });
			const iconDiv = stepEl.createDiv("workflow-step-icon");
			setIcon(iconDiv, step.icon);
			stepEl.createDiv({ cls: "workflow-step-label", text: step.text });
			stepEl.addEventListener("click", async () => {
				new Notice(`Clicked on: ${step.text}`);
				await step.callback();
			});

			if (index < steps.length - 1) {
				const arrow = container.createDiv({ cls: "workflow-arrow" });
				arrow.setText("→");
			}
		});
	}

	private formatProjectName(project: string): string {
		return `${Utils.generateDate()} - ${project}`;
	}

	private async createProject(): Promise<void> {
		const projectName = await this.plugin.integrationManager
			.getTemplater()
			.getPrompt("Enter a short project name (max 20 words):");
		if (!projectName) {
			this.logger.error("Project name cannot be empty.");
			new Notice("Project name cannot be empty.");
			return;
		}
		const newProject = this.createProjectEntity(projectName);
		await newProject.createNonResearchProject();
		this.projects[projectName] = newProject;
	}

	private createProjectEntity(name: string, dirName?: string): Project {
		// Ensure that ProjectConfig must be copied before use to prevent mutation of the original config
		let config = Utils.deepClone(ProjectConfig);
		const dir = dirName || this.formatProjectName(name);
		config.entrypoint = this.getProjectsPath() + "/" + dir;
		config.basename = name;
		return new Project(this.app, this.plugin, this.factory, config);
	}

	private addStyles() {
		const styleId = "research-dashboard-styles";
		if (document.getElementById(styleId)) return;

		const styleEl = document.head.createEl("style", {
			attr: { id: styleId },
		});
		styleEl.textContent = `
            .research-dashboard-modal.modal {
                width: 90%;
                max-width: 600px;
            }
            .research-dashboard-modal .modal-content {
                display: flex;
                flex-direction: column;
                gap: 20px;
                padding: 20px 25px;
            }
            .research-dashboard-modal h1 {
                text-align: center;
                color: var(--text-title);
            }
            
            /* General Section Styling */
            .dashboard-section {
                background-color: var(--background-secondary);
                padding: 20px;
                border-radius: 12px;
                border: 1px solid var(--background-modifier-border);
            }

            /********************************************/
            /* CORRECTED STYLES for QUICK SEARCH        */
            /********************************************/
            .quick-search-header {
                display: flex;
                display: flex;
				justify-content: flex-start; /* This groups items at the start */
				align-items: center;
				gap: 20px; /* This adds a 20px space between the text and the buttons */
            }
            /* Target the H3 inside the new header to override default section H3 styles */
            .quick-search-header h3 {
                margin: 0;
            }
            .quick-search-button-group {
                display: flex;
                gap: 8px;
            }
            .quick-search-button {
                display: flex;
                align-items: center;
                justify-content: center;
                padding: 8px;
                border-radius: 6px;
                border: 1px solid var(--background-modifier-border);
                background-color: var(--background-primary);
                cursor: pointer;
                transition: all 0.2s ease-in-out;
            }
            .quick-search-button .lucide {
                width: 20px;
                height: 20px;
                color: var(--text-muted);
            }
            .quick-search-button:hover {
                border-color: var(--interactive-accent);
            }
            .quick-search-button:hover .lucide {
                color: var(--interactive-accent);
            }

            /* --- Styles for other sections --- */
            .dashboard-section h3 {
                margin-top: 0;
                margin-bottom: 20px;
                color: var(--text-normal);
                border-bottom: 1px solid var(--background-modifier-border);
                padding-bottom: 10px;
            }
            .workflow-steps {
                display: flex;
                align-items: center;
                justify-content: space-between;
                gap: 12px;
            }
            .workflow-step {
                flex: 1;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                gap: 10px;
                padding: 20px 10px;
                border: 1px solid var(--background-modifier-border);
                background-color: var(--background-primary);
                border-radius: 8px;
                cursor: pointer;
                transition: all 0.2s ease-in-out;
            }
            .workflow-step:hover {
                border-color: var(--interactive-accent);
                color: var(--interactive-accent);
                transform: translateY(-3px);
            }
            .workflow-step-icon .lucide {
                width: 32px;
                height: 32px;
            }
            .workflow-step-label {
                font-size: var(--font-ui-small);
                font-weight: 500;
                text-align: center;
            }
            .workflow-arrow {
                font-size: 24px;
                color: var(--text-faint);
                flex-shrink: 0;
            }
            .creating-header {
                display: flex;
                align-items: center;
                gap: 10px;
            }
            .research-dashboard-modal .setting-item {
                border: none;
                padding: 8px 0;
            }
        `;
	}

	onClose() {
		this.contentEl.empty();
		document.getElementById("research-dashboard-styles")?.remove();
	}
}
