import ZettelkastenPlugin from "../main";
import { App } from "obsidian";
import { BaseDefault, BodySection, NoteFactory, NoteType } from "../notes";
import { IProjectData } from "./types";
import { ProjectConfig, ProjectFileType } from "./config";
import { projectReformResearchNote } from "./utils";
import { Utils } from "../utils";
import { Logger } from "../logger";
import { ISearchResult } from "../research";
import { DataviewHelper, ViewProjectGanttChart } from "../dataview";
import { ViewProjectCustomTable } from "../dataview/views";
import { WeeklyKanban } from "../task";

export class Project {
	private app: App;
	private factory: NoteFactory;
	public property: IProjectData;
	private plugin: ZettelkastenPlugin;
	private logger = Logger.createLogger("ZettelkastenProject");

	/*
	 * @param app - The Obsidian application instance.
	 * @param factory - The factory to create notes.
	 * @param entrypoing - The entry point for the project.
	 */
	constructor(
		app: App,
		plugin: ZettelkastenPlugin,
		factory: NoteFactory,
		property?: IProjectData,
	) {
		this.app = app;
		this.plugin = plugin;
		this.factory = factory;
		this.property = property || ProjectConfig;
	}

	public getBaseName(): string {
		return this.property.basename;
	}

	public getFolderName(): string {
		return this.property.entrypoint.split("/").pop() || "Untitled Project";
	}

	public getProjectName(): string {
		const regex = /^\d{4}-\d{2}-\d{2}\s*-\s*(.*)$/;
		const dirName = this.getFolderName();
		const nameMatch = dirName.match(regex);
		if (nameMatch) {
			return nameMatch[1].trim();
		}
		return dirName;
	}

	public getProjectDate(): string {
		const regex = /^(\d{4}-\d{2}-\d{2})\s*-\s*.*$/;
		const dirName = this.getFolderName();
		const nameMatch = dirName.match(regex);
		if (nameMatch) {
			return nameMatch[1].trim();
		}
		return Utils.generateDate();
	}

	public getTargetFolderPath(type: ProjectFileType): string {
		return (
			this.property.entrypoint + "/" + this.property.subfolderPaths[type]
		);
	}

	public projectNameToFileName(name: string): string {
		return `${this.getProjectDate()} - Project - ${name}`;
	}

	public async createSubtaskProject(
		sources: ISearchResult | ISearchResult[],
		taskType?: ProjectFileType,
	): Promise<void> {
		if (!Array.isArray(sources)) {
			sources = [sources];
		}
		if (!taskType) {
			const targetSource = sources[0];
			for (const fileType of Object.values(ProjectFileType)) {
				const targetPath = this.getTargetFolderPath(fileType);
				if (targetSource.path.startsWith(targetPath)) {
					if (fileType === ProjectFileType.questionType) {
						taskType = ProjectFileType.objectiveType;
					} else if (fileType === ProjectFileType.objectiveType) {
						taskType = ProjectFileType.stepType;
					} else {
						taskType = ProjectFileType.otherType;
					}
					break;
				}
			}
			// other type is the default type if no other type is found
			// Therefore, check if the Input file is a main file of project
			if (
				taskType === ProjectFileType.otherType &&
				targetSource.path.startsWith(this.property.entrypoint)
			) {
				taskType = ProjectFileType.questionType;
			}
		}
		if (!taskType) {
			this.logger.error(
				"Task type is not defined. Please provide a valid task type.",
			);
			return;
		}

		let subtaskTags: string[] = [];
		if (taskType === ProjectFileType.questionType) {
			subtaskTags =
				this.property.exclusiveTags[ProjectFileType.objectiveType];
		} else if (taskType === ProjectFileType.objectiveType) {
			subtaskTags = this.property.exclusiveTags[ProjectFileType.stepType];
		}

		const name = await this.plugin.integrationManager
			.getTemplater()
			.getPrompt(`Please enter file name of ${taskType}:`);
		if (!name) {
			this.logger.error(
				"Question note's name is an empty string. Please set a valid name.",
			);
			return;
		}
		const note = this.factory.createNote(
			NoteType.LITERATURE,
		) as BaseDefault;
		if (taskType === ProjectFileType.questionType) {
			note.setTitle(`${Utils.generateDate()} - RQ - ${name}`);
		} else if (taskType === ProjectFileType.objectiveType) {
			note.setTitle(`${Utils.generateDate()} - RO - ${name}`);
		} else if (taskType === ProjectFileType.stepType) {
			note.setTitle(`${Utils.generateDate()} - RS - ${name}`);
		} else {
			note.setTitle(`${Utils.generateDate()} - Other - ${name}`);
		}
		note.setPath(this.getTargetFolderPath(taskType));
		if (taskType === ProjectFileType.objectiveType) {
			note.setProperty("StartDate", Utils.generateDate());
			note.setProperty("EndDate", "");
			note.setProperty("Section", "inbox");
			note.setProperty("Dependencies", "");
			note.setProperty("Length", 1);
			note.setProperty("shortName", name)
		}
		note.addTag([
			"🗂️project/PhD",
			...this.property.exclusiveTags[taskType],
		]);
		note.addBodyContent(
			[],
			`${taskType[0].toUpperCase()}${taskType.slice(1, taskType.length)}`,
			1,
		);
		if (taskType !== ProjectFileType.stepType) {
			note.addBodyContent(
				[
					DataviewHelper.getCodeBlockContent(
						this.plugin.settings.dataviewCodeBlockType,
						ViewProjectCustomTable,
						[
							{
								name: "inlink",
								type: "boolean",
								required: true,
								value: true,
							},
							{
								name: "outlink",
								type: "boolean",
								required: true,
								value: false,
							},
							{
								name: "header",
								type: "array",
								required: true,
								value: [`🐾${taskType} Tasks`, "Active"],
							},
							{
								name: "property",
								type: "array",
								required: true,
								value: ["file.link", "new"],
							},
							{
								name: "tags",
								type: "array",
								required: true,
								value: subtaskTags,
							},
						],
					),
				],
				`🛤️Research Path - ${taskType}`,
				1,
			);
		} else {
			note.setProperty("status", "");
			note.addBodyContent([], "🧩Method Description", 1)
			note.addBodyContent([], "Theoretical Foundation", 2)
			note.addBodyContent([], "Specific Implementation Steps", 2)
			note.addBodyContent(
				[
					"- Software:",
					"- Hardware:",
					"- Datasets:",
					"- References:",
				],
				"Tool/Materials Used",
				2
			)
			note.addBodyContent([], "📌Failure Analysis", 1)
			note.addBodyContent([
				"- **Expected**: What effect was anticipated",
				"- **Actual**: What actually occurred",
			], "Expected Results vs Actual Results", 2)
			note.addBodyContent([
				"- **Problem 1**: Description of the first problem encountered",
			], "Specific Failure Manifestations", 2)
			note.addBodyContent([], "🔍Root Cause Analysis", 2)
			note.addBodyContent([
				"- [ ] Theoretical assumption was incorrect",
				"- [ ] Implementation had bugs",
				"- [ ] Theoretical applicability conditions not met",
				"- [ ] Misunderstanding of theory",
			], "Theoretical Level", 3)
			note.addBodyContent([
				"- [ ] Implementation method problematic",
				"- [ ] Parameter settings inappropriate",
				"- [ ] Tool/equipment limitations"
			], "Technical Level", 3)
			note.addBodyContent([
				"- [ ] Data quality issues",
				"- [ ] Insufficient data quantity",
				"- [ ] Data does not meet method requirements",
			], "Data Level", 3)
			note.addBodyContent([], "👀Insights Gained", 1)
			note.addBodyContent([
				"- Although the main goal failed, what interesting phenomena were observed?"
			], "## Unexpected Discoveries", 2)
			note.addBodyContent([
				"- What new insights about the problem itself did this failure provide?"
			], "New Understanding of the Research Problem", 3)
			note.addBodyContent([
				"- What hints does this failure give for other research paths?"
			], "Inspiration for Other Methods", 3)
			note.addBodyContent([], "🔖Follow-up Actions", 1)
			note.addBodyContent([
				"- [ ] Possible improvement point 1"
			], "Improvement Directions", 2)
			note.addBodyContent([
				"- links"
			], "Related Methods", 2)
			note.addBodyContent([
				"Under what circumstances might this method be reconsidered?"
			], "Conditions for Future Reconsideration", 2)
			note.addBodyContent(["Literature supporting this method"], "References", 2)
			note.addBodyContent([], "Discussion Records", 2)
			note.addBodyContent([
				"- Date: Discussion key points"
			], "Discussions with Advisor/Colleagues", 3)
		}
		sources.forEach((source) => {
			note.addSourceNote(`[[${source.basename}]]`);
		});
		if (
			taskType === ProjectFileType.stepType &&
			this.plugin.settings.kanbanEnabled
		) {
			const kanban = new WeeklyKanban(
				this.app,
				this.plugin.settings,
				this.factory,
			);
			if (!(await kanban.kanbanExists())) {
				await kanban.kanbanCreate(false);
			}
			const kanbanFilePath =
				kanban.getKanbanDir() +
				"/" +
				kanban.getKanbanNoteName() +
				".md";
			const kanbanNote = await this.factory.loadFromFile(kanbanFilePath);
			const header = new BodySection("BackLogs", 2);
			header.addContent(note.getTitle());
			note.addLinkedPage(kanbanNote, header, "checklist");
		}
		await note.save();

		if (this.plugin.settings.autoOpenNewNote) {
			await this.app.workspace.openLinkText(note.getTitle(), "", false, {
				state: { mode: "source" },
			});
		}
	}

	public async createNonResearchProject() {
		const name = this.property.basename;
		if (!name) {
			this.logger.error(
				"Project entrypoint is an empty string. Please set a valid entrypoint in the settings.",
			);
			return;
		}
		const projectNote = this.factory.createNote(
			NoteType.LITERATURE,
		) as BaseDefault;
		const projectName = this.projectNameToFileName(name);
		projectNote.setTitle(projectName);
		projectNote.setPath(this.property.entrypoint);
		if (Utils.fileExists(this.app, this.property.entrypoint, true)) {
			this.logger.warn(
				`Project with name ${name} already exists. Skipping creation.`,
			);
			return;
		}
		projectNote.addTag("🗂️project");
		projectNote.setProperty("url", "");
		projectNote.setProperty("shortName", "");
		projectNote.setProperty("year", Utils.generateDate());
		projectNote.addBodyContent(["💊**TL;DR**::", ""], "👻Summary", 1);
		projectNote.addBodyContent([], "💡Notes", 1);
		projectNote.addBodyContent(
			[
				DataviewHelper.getCodeBlockContent(
					this.plugin.settings.dataviewCodeBlockType,
					ViewProjectGanttChart,
				),
			],
			"🗓️Project Plan",
			1,
		);
		await projectNote.save();

		if (this.plugin.settings.autoOpenNewNote) {
			await this.app.workspace.openLinkText(
				projectNote.getTitle(),
				"",
				false,
				{ state: { mode: "source" } },
			);
		}
	}

	public async createProject(
		sources: ISearchResult | ISearchResult[],
	): Promise<void> {
		if (!Array.isArray(sources)) {
			sources = [sources];
		}
		const name = this.property.basename;
		if (!name) {
			this.logger.error(
				"Project entrypoint is an empty string. Please set a valid entrypoint in the settings.",
			);
			return;
		}
		const projectNote = this.factory.createNote(
			NoteType.LITERATURE,
		) as BaseDefault;
		const projectName = this.projectNameToFileName(name);
		projectNote.setTitle(projectName);
		projectNote.setPath(this.property.entrypoint);
		if (Utils.fileExists(this.app, this.property.entrypoint, true)) {
			this.logger.warn(
				`Project with name ${name} already exists. Skipping creation.`,
			);
			return;
		}
		let tags = ["🗂️project/PhD"];
		sources.forEach((source) => {
			source.tags.forEach((tag) => {
				if (tag.contains("research/topic")) {
					tags.push(tag);
				}
			});
		});
		const reformedNote = projectReformResearchNote(projectNote, {
			codeblockKey: this.plugin.settings.dataviewCodeBlockType,
			ongoingProject: true,
			sourceNotes: sources.map((sources) => sources.basename),
			eTags: tags,
			year: Utils.generateDate(),
			new: true,
		});
		await reformedNote.save();

		if (this.plugin.settings.autoOpenNewNote) {
			await this.app.workspace.openLinkText(
				reformedNote.getTitle(),
				"",
				false,
				{ state: { mode: "source" } },
			);
		}
	}
}
