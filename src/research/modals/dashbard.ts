import {App, Modal, Notice, setIcon, Setting, TFile} from 'obsidian';
import {SearchDashboardModal} from "./search";
import {
	IAnnotationSection,
	IDashboardKeyTags,
	IDashboardWorkflowInput,
	IResearchPath,
	ISearchResult,
	IZoteroNoteItems
} from "../types";
import ZettelkastenPlugin from "../../main";
import {BaseDefault, Body, NoteFactory, NoteType} from "../../notes";
import {Logger} from "../../logger";
import {Utils} from "../../utils";
import {
	DataviewHelper,
	ViewResearchDirectionTopic,
	ViewResearchDirectionLiteratureReview,
	ViewResearchTopicMyPapers,
	ViewResearchTopicPapers,
	ViewResearchTopicReference,
	ViewResearchLiteratureMetadata,
	ViewResearchLiteratureReferences,
	ViewResearchLiteratureRelevantPapers
} from "../../dataview";


export class ResearchDashboardModal extends Modal {
	private selectedProject: string = '';
	private projects: string[] = ['Quantum Computing Research', 'AI in Healthcare', 'Decentralized Finance Trends'];
	private plugin: ZettelkastenPlugin;
	private factory: NoteFactory;
	private logger = Logger.createLogger('ResearchDashboardModal');
	private codeBlockType: string;

	constructor(app: App, plugin: ZettelkastenPlugin, factory: NoteFactory) {
		super(app);
		this.plugin = plugin;
		this.factory = factory;
		this.modalEl.addClass('research-dashboard-modal');
		this.codeBlockType = this.plugin.settings.ResearchDashboard.codeBlockType || 'zettelkasten';
	}

	async onOpen() {
		const { contentEl } = this;
		contentEl.empty();

		contentEl.createEl('h1', { text: 'Research Dashboard' });

		this.renderQuickSearch(contentEl);
		this.renderExploration(contentEl);
		this.renderCreating(contentEl);
		this.addStyles();
	}

	/**
	 * Corrected: Builds the "Quick Search" section with the inline layout.
	 * @param container - The HTMLElement to append the section to.
	 */
	private renderQuickSearch(container: HTMLElement) {
		// Then, create the header element inside the section for the inline layout
		const quickSearchHeader = container.createDiv('quick-search-header');

		// Add the title to the header
		quickSearchHeader.createEl('h3', { text: 'Quick Search' });

		// Add the button group to the header
		const buttonGroup = quickSearchHeader.createDiv('quick-search-button-group');
		const buttons = [
			{ label: 'Paper', icon: 'file-text' },
			{ label: 'Reference', icon: 'quote' },
			{ label: 'Venue', icon: 'building-2' }
		];

		buttons.forEach(({ label, icon }) => {
			const buttonEl = buttonGroup.createEl('button', {
				cls: 'quick-search-button',
				attr: { title: label } // Use title attribute for hover tooltip,
			});
			setIcon(buttonEl, icon);
		});
	}

	// --- The other build methods remain the same ---

	private renderExploration(container: HTMLElement) {
		const section = container.createDiv('dashboard-section');
		section.createEl('h3', { text: 'Exploration' });
		const workflow = section.createDiv('workflow-steps');
		// Define Callbacks for each step
		const LiteratureImportSearchModal = new SearchDashboardModal(
			this.app,
			this.plugin,
			this.factory,
			(selectedNote) => this.importLiteraturePaper(selectedNote),
			this.plugin.settings.ResearchDashboard.zoteroPath
		)

		const steps: IDashboardWorkflowInput[] = [
			{
				text: 'Literature Import',
				icon: 'file-plus-2',
				callback: async () => {
					LiteratureImportSearchModal.open();
					this.close()
				}},
			{ text: 'Literature Review', icon: 'glasses', callback: async () => {}},
			{ text: 'New Research', icon: 'lightbulb', callback: async () => {}}
		];
		this.createWorkflow(workflow, steps);
	}

	private renderCreating(container: HTMLElement) {
		const section = container.createDiv('dashboard-section');
		const header = section.createDiv('creating-header');
		header.createEl('h3', { text: 'Creating' });
		header.createEl('span', { text: '✨' });

		new Setting(section)
			.setName('Select Project')
			.setDesc('Choose the project you are currently working on.')
			.addDropdown(dropdown => {
				dropdown.addOption('', 'Select a project...');
				this.projects.forEach(project => dropdown.addOption(project, project));
				dropdown.onChange(value => { this.selectedProject = value; });
			});

		const workflow = section.createDiv('workflow-steps');
		const steps = [
			{ text: 'Questions', icon: 'help-circle', callback: async () => {}},
			{ text: 'Objective', icon: 'target', callback: async () => {}},
			{ text: 'Steps', icon: 'list-ordered', callback: async () => {}},
		];
		this.createWorkflow(workflow, steps);
	}

	private createWorkflow(container: HTMLElement, steps: IDashboardWorkflowInput[]) {
		steps.forEach((step, index) => {
			const stepEl = container.createDiv({ cls: 'workflow-step' });
			const iconDiv = stepEl.createDiv('workflow-step-icon');
			setIcon(iconDiv, step.icon);
			stepEl.createDiv({ cls: 'workflow-step-label', text: step.text });
			stepEl.addEventListener('click', async () => {
				new Notice(`Clicked on: ${step.text}`);
				await step.callback()
			});

			if (index < steps.length - 1) {
				const arrow = container.createDiv({ cls: 'workflow-arrow' });
				arrow.setText('→');
			}
		});
	}

	private getResearchRootPath(): string {
		return this.plugin.settings.ResearchDashboard.researchRootPath
	}

	private getKeyDirectionTag(): IDashboardKeyTags {
		return {
			zotero: '#software/Zotero',
			direction: "#software/Zotero/direction",
			topic: "#software/Zotero/topic",
		}
	}

	private getResearchPath(): IResearchPath {
		return {
			directions: this.getResearchRootPath() + '/directions',
			topics: this.getResearchRootPath() + '/topics',
			papers: this.getResearchRootPath() + '/papers',
			references: this.getResearchRootPath() + '/references',
			literatures: this.getResearchRootPath() + '/literatures',
		}
	}

	private async importLiteraturePaper(selectedNotes: ISearchResult | ISearchResult[]): Promise<void> {
		if (!(Array.isArray(selectedNotes))) {
			selectedNotes = [selectedNotes];
		}
		selectedNotes.map(async (selectedNote: ISearchResult) => {
			this.logger.info(`Executing importLiteraturePaper for note: ${selectedNote.name} in path: ${selectedNote.path}`);
			const zoteroItems = await this.loadZoteroFromFile(selectedNote.path)
			if (!zoteroItems) {
				this.logger.error(`Failed to load note from path: ${selectedNote.path}`);
				new Notice(`Failed to load note from path: ${selectedNote.path}`);
				return;
			}
			// Create all directions' notes based on the tags
			let copiedSelectedNote = Utils.deepClone(selectedNote);
			await this.createDirectionNote(copiedSelectedNote, zoteroItems)

			// Create all directions' notes based on the tags
			copiedSelectedNote = Utils.deepClone(selectedNote);
			await this.createTopicNote(copiedSelectedNote, zoteroItems)

			// Create all annotations' notes based on the tags
			copiedSelectedNote = Utils.deepClone(selectedNote);
			await this.createAnnotationNote(copiedSelectedNote, zoteroItems)

			// Create the literature paper note
			copiedSelectedNote = Utils.deepClone(selectedNote);
			await this.createLiteraturePaperNote(copiedSelectedNote, zoteroItems)

		})
	}

	private formatDirectionName(direction: string): string {
		return `Direction - ${direction}`;
	}

	private formatTopicName(direction: string): string {
		return `Topic - ${direction}`;
	}

	private formatLiteraturePaperName(paperName: string, year: string): string {
		const safeFilename = paperName.replace(/[^a-zA-Z0-9_.\- ]/g, '_');
		return `Summary - ${year} - ${safeFilename}`;
	}

	private async createDirectionNote(selectedNote: ISearchResult, zoteroItems: IZoteroNoteItems): Promise<void> {
		const directionTag = this.getKeyDirectionTag().direction.toLowerCase();
		const directions = selectedNote.tags.filter( tag => tag.contains(directionTag));
		const directionNotePromise = directions.map( async (direction) => {
			const directionFullName = direction.replace(directionTag, '');
			const directionList = directionFullName.split('/').map( part => part.trim()).filter(part => part.length > 0);
			// Ensure the last element is the direction name
			let directionName = directionList.pop();
			if (!directionName) {
				this.logger.error(`Invalid direction name extracted from tag: ${direction}`);
				new Notice(`Invalid direction name extracted from tag: ${direction}`);
				return;
			}
			let directionPath = this.getResearchPath().directions;
			if (directionList.length >= 1) {
				directionPath = directionPath + '/' + directionList.join('/');
			}
			const directionNote = this.factory.createNote(NoteType.LITERATURE) as BaseDefault;
			directionName = this.formatDirectionName(directionName);
			directionNote.setTitle(directionName);
			directionNote.setPath(directionPath);
			if ((await directionNote.exist())) {
				this.logger.warn(`Note with title "${directionName}" already exists in path "${directionPath}". Skipping creation.`);
				return;
			}
			const zoteroKeyTagPath = this.getKeyDirectionTag().zotero.toLowerCase();
			directionNote.addTag(["research/direction", "📍tagNode"])
			directionNote.addAlias(`"#${direction.replace(zoteroKeyTagPath, "research").trim()}"`);
			directionNote.setProperty("new", false)
			directionNote.addBodyContent([DataviewHelper.getCodeBlockContent(this.codeBlockType, ViewResearchDirectionTopic)], "Topics in Direction", 1);
			directionNote.addBodyContent([DataviewHelper.getCodeBlockContent(this.codeBlockType, ViewResearchDirectionLiteratureReview)], "Literature Reviews", 1);
			// add the zotero note as a source note
			const sourceNote = zoteroItems.note.getProperty("id") || zoteroItems.note.getProperty("citekey") || zoteroItems.note.getTitle() || undefined;
			if (sourceNote) {
				directionNote.addSourceNote(`[[${sourceNote}]]`)
			}

			await directionNote.save();
		})
		try {
			await Promise.all(directionNotePromise);
		} catch (error) {
			this.logger.error("An error occurred while processing directions:", error);
		}
	}

	private async createTopicNote(selectedNote: ISearchResult, zoteroItems: IZoteroNoteItems): Promise<void> {
		const topicTags = this.getKeyDirectionTag().topic.toLowerCase();
		const topics = selectedNote.tags.filter( tag => tag.contains(topicTags));
		const directionNotePromise = topics.map( async (topic) => {
			const topicFullName = topic.replace(topicTags, '');
			const topicList = topicFullName.split('/').map( part => part.trim()).filter(part => part.length > 0);
			// Ensure the last element is the direction name
			let topicName = topicList.pop();
			if (!topicName) {
				this.logger.error(`Invalid direction name extracted from tag: ${topic}`);
				new Notice(`Invalid direction name extracted from tag: ${topic}`);
				return;
			}
			let topicPath = this.getResearchPath().topics;
			if (topicList.length >= 1) {
				topicPath = topicPath + '/' + topicList.join('/');
			}
			const topicNote = this.factory.createNote(NoteType.LITERATURE) as BaseDefault;
			topicName = this.formatTopicName(topicName);
			topicNote.setTitle(topicName);
			topicNote.setPath(topicPath);
			if ((await topicNote.exist())) {
				this.logger.warn(`Note with title "${topicName}" already exists in path "${topicPath}". Skipping creation.`);
				return;
			}
			const zoteroKeyTagPath = this.getKeyDirectionTag().zotero.toLowerCase();
			topicNote.addTag(["research/topic", "📍tagNode"])
			topicNote.setProperty("new", false)
			topicNote.addAlias(`"#${topic.replace(zoteroKeyTagPath, "research").trim()}"`);
			topicNote.addBodyContent([DataviewHelper.getCodeBlockContent(this.codeBlockType, ViewResearchTopicPapers)], "Papers", 1);
			topicNote.addBodyContent([DataviewHelper.getCodeBlockContent(this.codeBlockType, ViewResearchTopicMyPapers)], "My Papers", 1);
			topicNote.addBodyContent([DataviewHelper.getCodeBlockContent(this.codeBlockType, ViewResearchTopicReference)], "References", 1);
			topicNote.addBodyContent([], "Knowledges", 1);
			topicNote.addBodyContent([], "Methods", 1);

			// add the zotero note as a source note
			const sourceNote = zoteroItems.note.getProperty("id") || zoteroItems.note.getProperty("citekey") || zoteroItems.note.getTitle() || undefined;
			if (sourceNote) {
				topicNote.addSourceNote(`[[${sourceNote}]]`)
			}

			await topicNote.save();
		})
		try {
			await Promise.all(directionNotePromise);
		} catch (error) {
			this.logger.error("An error occurred while processing topics:", error);
		}
	}

	private async createAnnotationNote(selectedNote: ISearchResult, zoteroItems: IZoteroNoteItems): Promise<void> {
		const annotationPromises =  zoteroItems.annotations
			// Filter annotations that have only one tag and do not include "vocabulary" in the tag
			.filter((annotation => annotation.tags.length === 1 && annotation.tags.some((tag) => !tag.toLowerCase().includes("vocabulary"))))
			.map(async (annotation) => {
			const zoteroId = zoteroItems.note.getProperty("id") || zoteroItems.note.getProperty("citekey") || zoteroItems.note.getTitle() || undefined;
			const name = `${zoteroId} - Annotation ${annotation.id}`;
			const annotationNote = this.factory.createNote(NoteType.LITERATURE) as BaseDefault;
			annotationNote.setTitle(name);
			annotationNote.setPath(this.getResearchPath().references);
			if ((await annotationNote.exist())) {
				this.logger.info(`Note with title "${annotationNote.getTitle()}" already exists in path "${annotationNote.getPath()}". Skipping creation.`);
				return;
			}
			annotationNote.setProperty("url", annotation.url);
			annotationNote.setProperty("new", false);
			annotationNote.addSourceNote(`[[${zoteroId}]]`);
			annotationNote.addTag(annotation.tags);
			annotationNote.addBodyContent([], "**🔗Source**", 4);
			const displayName = annotation.content.filter((line => line.trim().length > 0)).join(". ")
			annotationNote.addBodyContent(
				[
					"> [!INFO] Annotation Metadata",
					`> **Article**:: ${annotation.article}`,
					`> **Year**:: ${annotation.year}`,
					`> **Page**:: ${annotation.page}`,
					`> **Note Date**:: ${annotation.date}`,
					`> **Bibliography**:: ${annotation.bibliography}`,
					'',
					`DisplayName:: ${displayName.length > 100 ? displayName.substring(0, 100) + '...' : displayName}`,
					'',
					...annotation.content
				],
				"Quote",
				1);
			if (annotation.comments && annotation.comments.length > 0) {
				annotationNote.addBodyContent(annotation.comments, "Comments", 1);
			}
			await annotationNote.save()

		})
		try {
			await Promise.all(annotationPromises);
		} catch (error) {
			this.logger.error("An error occurred while processing annotation:", error);
		}
	}

	private async createLiteraturePaperNote(selectedNote: ISearchResult, zoteroItem: IZoteroNoteItems): Promise<void> {
		const literatureNote = this.factory.createNote(NoteType.LITERATURE) as BaseDefault;
		literatureNote.setTitle(this.formatLiteraturePaperName(selectedNote.name, zoteroItem.note.getProperty("year") || ''));
		literatureNote.setPath(this.getResearchPath().literatures)
		if ((await literatureNote.exist())) {
			this.logger.warn(`Note with title "${literatureNote.getTitle()}" already exists in path "${literatureNote.getPath()}". Skipping creation.`);
			new Notice(`Note with title "${literatureNote.getTitle()}" already exists in path "${literatureNote.getPath()}". Skipping creation.`);
			return;
		}

		const zoteroId = zoteroItem.note.getProperty("id") || zoteroItem.note.getProperty("citekey") || zoteroItem.note.getTitle() || undefined;
		const noHashTags = selectedNote.tags.map((tag) => tag.replace(this.getKeyDirectionTag().zotero.toLowerCase(), "research").trim());
		literatureNote.addTag(noHashTags)
		literatureNote.setProperty("url", zoteroItem.note.getProperty("url") || '');
		literatureNote.setProperty("shortName", "")
		literatureNote.setProperty("year", zoteroItem.note.getProperty("date") || '');
		literatureNote.setProperty("organisation", "")
		literatureNote.setProperty("venus", "")
		literatureNote.setProperty("star", false)
		literatureNote.addSourceNote(`[[${zoteroId}]]`);
		literatureNote.addTag([
			"✍️writing/academic/literatureSummary",
			"research",
			"📍tagNode"
		])
		literatureNote.addBodyContent([DataviewHelper.getCodeBlockContent(this.codeBlockType, ViewResearchLiteratureMetadata)], "Metadata", 4)
		literatureNote.addBodyContent(
			[
				"🩻**topic**::",
				"🧬**position**::",
				"🔗**evidence**::",
				"🫆**method**::",
				"💊**TL;DR**::",
				""
			],
			"👻Summary",
			1
		)
		literatureNote.addBodyContent([], "⭐️Highlights", 1)
		literatureNote.addBodyContent([], "📌Limitation", 1)
		literatureNote.addBodyContent([], "💡Notes", 1)
		literatureNote.addBodyContent([], "⭐️Highlights", 1)
		literatureNote.addBodyContent([DataviewHelper.getCodeBlockContent(this.codeBlockType, ViewResearchLiteratureRelevantPapers)], "🗃️Relevant Papers", 1)
		literatureNote.addBodyContent([DataviewHelper.getCodeBlockContent(this.codeBlockType, ViewResearchLiteratureReferences)], "🔖References", 1)
		await literatureNote.save()

		if (this.plugin.settings?.features.AUTO_OPEN_CREATED_NOTES) {
			await this.app.workspace.openLinkText(literatureNote.getTitle(), '', false, { state: { mode: 'read' } });
		}
	}

	private async loadZoteroFromFile(filePath: string): Promise<IZoteroNoteItems> {
		const file = this.app.vault.getAbstractFileByPath(filePath) as TFile;
		if (!file) {
			throw new Error(`File not found at path: ${filePath}`);
		}


		// create a new note based on the file's frontmatter type
		const cache = this.app.metadataCache.getFileCache(file);
		const frontmatter = cache!.frontmatter
		let enumKey = Utils.getKeyByValue(NoteType, frontmatter!.type)
		if (!enumKey){
			enumKey = "FLEETING";
		}
		const zoteroNote = this.factory.createNote(NoteType[enumKey], false) as BaseDefault;


		const fileContent = await this.app.vault.read(file);

		const frontmatterRegex = /^---\n([\s\S]*?)\n---/;
		const match = fileContent.match(frontmatterRegex);
		let properties = zoteroNote.getProperties();
		if (match && match[1]) {
			if (frontmatter) {
				for (const [key, propValue] of Object.entries(frontmatter)) {
					properties.setPropertyValue(key, propValue, true)
				}
			}
		}
		//parse the file content to extract the body
		const annotations = await this.parseBody(file, zoteroNote);
		//supplement the annotations with the properties from frontmatter
		annotations.forEach((annotation) => {
			annotation.bibliography = properties.getPropertyValue("bibliography") || '';
			annotation.url = properties.getPropertyValue("url") || '';
		})

		// ensure the note has a right title and path
		// the title name may be updated in parseBody method
		zoteroNote.setTitle(file.basename)
		zoteroNote.setPath(file.path)

		return {
			note: zoteroNote,
			annotations: annotations
		}
	}

	private async parseBody(file: TFile, note: BaseDefault): Promise<IAnnotationSection[]> {
		const cache = this.app.metadataCache.getFileCache(file);
		const fileContent = await this.app.vault.read(file);
		const lines = fileContent.split('\n');
		const body = new Body();
		const sections = Array.from(cache?.sections || []);
		const headings = Array.from(cache?.headings || []);

		// fetch extra tags, which are not exist in frontmatter
		if (sections.length >= 2 && sections[1].type === 'paragraph' && sections[0].type === 'yaml') {
			let extraTags: Array<string> = [];
			const startPosition = sections[1].position.start.line;
			const endPosition = sections.length > 2 ? sections[2].position.start.line : lines.length;
			lines.slice(startPosition, endPosition).forEach((line) => {
				const tags = line.split('#');
				tags.forEach(tag => {
					tag = tag.trim().replace("#", "");
					if (tag.length > 0 && !tag.contains(" ")){
						extraTags.push(tag)
					}
				})
			})
			const uniqueTags = Array.from(new Set(extraTags));
			note.addTag(uniqueTags);
			sections.pop()
			sections.pop()
		}

		// Fetch extra properties, which are not exist in frontmatter
		if (headings.length >= 1 && headings[0].heading === "Abstract") {
			const startPosition = headings[0].position.start.line;
			const endPosition = headings.length > 1 ? headings[1].position.start.line : lines.length;
			lines.slice(startPosition, endPosition).forEach((line) => {
				const regex = /^\s*([^:]+?)\s*::\s*(.*)$/;
				const match = line.match(regex);

				if (match) {
					const key = match[1].replace(">", "").trim();
					const value = match[2].trim();
					const properties = note.getProperties();
					if (!Object.prototype.hasOwnProperty.call(properties, key)) {
						properties.setPropertyValue(key, value);
					}
				}
			})
		}

		const annotations: IAnnotationSection[] = [];
		for (const [index, heading] of headings.entries()) {
			const annotationRegex = /^Annotation ID\s*-\s*(\S+)/;
			const startPosition = heading.position.start.line + 1; // +1 to skip the heading line itself
			const endPosition = headings.length > index + 2 ? headings[index+1].position.start.line - 1 : lines.length; // -1 to exclude the next heading line
			const blockLines = lines.slice(startPosition, endPosition);
			const annotationMatch = heading.heading.match(annotationRegex);
			if (annotationMatch) {
				const annotationBlock = this.parseAnnotationSection(blockLines, annotationMatch[1].trim())
				annotations.push(annotationBlock);
			}
			body.addContent(blockLines, heading.heading, heading.level)
		}

		note.setBody(body)
		return annotations
	}

	private parseAnnotationSection(lines: string[], id: string): IAnnotationSection {
		const annotation: IAnnotationSection = {
			id: id,
			tags: [],
			article: '',
			year: '',
			page: '',
			date: '',
			content: [],
			comments: [],
			bibliography: '',
			url: ''
		}
		let collectingComments = false;
		for (const line of lines) {
			if (line.startsWith('*article*:')) {
				annotation.article = line.split('*article*:')[1].trim();
			} else if (line.startsWith('*year*:')) {
				annotation.year = line.split('*year*:')[1].trim();
			} else if (line.startsWith('*page*:')) {
				annotation.page = line.split('*page*:')[1].trim();
			} else if (line.startsWith('*note date*:')) {
				annotation.date = line.split('*note date*:')[1].trim();
			} else if (line.startsWith('Auto Tags:')) {
				line.split('Auto Tags: ')[1].trim().split("#").forEach(tag => {
					tag = tag.replace("#", "").trim();
					if (tag.length > 0 && !tag.includes(" ")) {
						annotation.tags.push(tag);
					}
				})
			} else if (line.startsWith('```ad-comments')) {
				collectingComments = true;
				annotation.comments?.push(line);
			} else if (line.startsWith('```') && collectingComments) {
				collectingComments = false;
				annotation.comments?.push(line);
			} else if (collectingComments) {
				annotation.comments?.push(line);
			} else {
				const specificTagRegex = /#\S+/g;
				if (line.match(specificTagRegex)) {
					line.split('#').forEach(tag => {
						tag = tag.replace("#", "").replace(",", "").trim();
						if (tag.length > 0 && !tag.includes(" ")) {
							annotation.tags.push(tag);
						}
					});
				} else {
					// Collect content lines
					// Ignore empty lines and code blocks deviated by backticks
					if (line.trim().length > 0 && !line.contains('```')) {
						annotation.content.push(line.trim());
					}
				}
			}
		}
		return annotation;
	}

	private addStyles() {
		const styleId = 'research-dashboard-styles';
		if (document.getElementById(styleId)) return;

		const styleEl = document.head.createEl('style', { attr: { id: styleId } });
		styleEl.textContent = `
            .research-dashboard-modal.modal {
                width: 90%;
                max-width: 500px;
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
		document.getElementById('research-dashboard-styles')?.remove();
	}
}
