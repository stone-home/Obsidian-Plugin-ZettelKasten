import ZettelkastenPlugin from "../../main";
import { App, Modal } from 'obsidian';
import { NoteFactory } from "../../notes";
import { ISearchResult, ISearchConfirmCallback } from "../types";
import { Logger } from "../../logger";


export class SearchDashboardModal extends Modal {
	private plugin: ZettelkastenPlugin;
	private factory: NoteFactory;
	private targetDirectory: string;
	private searchQuery: string = '';
	private tagFilter: string = '';
	private tagFilterEnabled: boolean = true;
	private searchResults: ISearchResult[] = []; // Your search results data
	private allResults: ISearchResult[] = []; // Your search results data
	private logger = Logger.createLogger("Research-SearchDashboardModal");
	private callback: ISearchConfirmCallback;
	private selectedResult: ISearchResult | null = null;


	constructor(
		app: App,
		plugin: ZettelkastenPlugin,
		factory: NoteFactory,
		callback: ISearchConfirmCallback,
		targetDir?: string,
	) {
		super(app);
		this.plugin = plugin;
		this.factory = factory;
		this.callback = callback;
		this.targetDirectory = targetDir || this.plugin.settings.ResearchDashboard.researchRootPath; // Default to vault root if not provided

	}

	onOpen() {
		this.allResults = this.getAllNotes(this.targetDirectory, []);
		const { contentEl } = this;
		contentEl.empty();

		// Set modal title
		contentEl.createEl('h2', { text: 'Search Dashboard' });

		// Render search container
		this.renderSearchContainer(contentEl);

		// Render tag filter
		this.renderTageFilter(contentEl);

		// Render results display fields
		this.renderResultsDisplayFields(contentEl);

		// execute initial search
		this.performSearch()

		// Add CSS styles
		this.addStyles();
	}

	private renderSearchContainer(container: HTMLElement) {
		this.logger.debug("Rendering search container");
		// Search Section
		const searchContainer = container.createDiv('search-container');

		const searchInputContainer = searchContainer.createDiv('search-input-container');
		const searchIcon = searchInputContainer.createEl('span', { text: '🔍' });
		searchIcon.addClass('search-icon');

		const searchInput = searchInputContainer.createEl('input');
		searchInput.type = 'text';
		searchInput.placeholder = 'Search';
		searchInput.addClass('search-input');
		searchInput.value = this.searchQuery;

		searchInput.oninput = (e) => {
			this.searchQuery = (e.target as HTMLInputElement).value;
			this.performSearch()
		};
		searchInput.onkeydown = (e) => {
			if (e.key === 'Enter') {
				this.performSearch();
			}
		};
	}

	private renderTageFilter(container: HTMLElement) {
		this.logger.debug("Rendering Tage filter");
		// Tag Filter Section
		const tagFilterContainer = container.createDiv('tag-filter-container');

		const tagFilterInput = tagFilterContainer.createEl('input')
		tagFilterInput.type = 'text';
		tagFilterInput.placeholder = 'Filter by tags (e.g. #tag1;#tag2)';
		tagFilterInput.addClass('tag-filter-input');
		tagFilterInput.value = this.tagFilter;
		tagFilterInput.oninput = (e) => {
			this.tagFilter = (e.target as HTMLInputElement).value;
		};
		tagFilterContainer.onkeydown = (e) => {
			if (e.key === 'Enter') {
				this.performSearch();
			}
		}
		// Add tag suggestions
		this.logger.debug("Rendering Auto-complete for tags");
		const tagListId = 'tag-suggestions-datalist';
		const tagDatalist = container.createEl(
			'datalist', {
				attr: {
					id: tagListId
				}
			}
		);
		this.getAllTags().forEach(tag => {
			tagDatalist.createEl('option', { value: tag });
		});
		tagFilterInput.setAttribute('list', tagListId);



		// Toggle Switch
		const toggleContainer = tagFilterContainer.createDiv('toggle-container');
		const toggleSwitch = toggleContainer.createEl('div');
		toggleSwitch.addClass('toggle-switch');
		toggleSwitch.addClass(this.tagFilterEnabled ? 'enabled' : 'disabled');

		const toggleKnob = toggleSwitch.createEl('div');
		toggleKnob.addClass('toggle-knob');

		toggleSwitch.onclick = () => {
			this.tagFilterEnabled = !this.tagFilterEnabled;
			toggleSwitch.removeClass('enabled', 'disabled');
			toggleSwitch.addClass(this.tagFilterEnabled ? 'enabled' : 'disabled');
		};

	}

	private renderResultsDisplayFields(container: HTMLElement) {
		this.logger.debug("Rendering Results Display");
		// Results Section
		const resultsContainer = container.createDiv('results-container');
		resultsContainer.createEl('h3', { text: 'Results' });

		const resultsArea = resultsContainer.createDiv('results-area');
		resultsArea.addClass('results-scrollable');

		// Display search results (placeholder)
		this.displayResults(resultsArea);

		// Action Buttons
		const buttonContainer = container.createDiv('button-container');

		const insertButton = buttonContainer.createEl('button', { text: 'Insert' });
		insertButton.addClass('action-button', 'insert-button');
		insertButton.onclick = async () => {
			if (this.selectedResult) {
				await this.callback(this.selectedResult);
				this.close()
			}
		};

		const cancelButton = buttonContainer.createEl('button', { text: 'Cancel' });
		cancelButton.addClass('action-button', 'cancel-button');
		cancelButton.onclick = async () => {
			this.close();
		};

	}

	private getAllNotes(path: string, tags: string[]): ISearchResult[] {
		return this.app.vault.getMarkdownFiles().filter(note => {
			return note.path.includes(path);
		}).map(note => {
			const metadata = this.app.metadataCache.getFileCache(note);
			const frontmatter = metadata!.frontmatter;
			const tags: string[] = metadata?.tags ? metadata.tags.map(tag => tag.tag.toLowerCase()) : []
			const uniqueTags = Array.from(new Set(tags))
			return {
				name: frontmatter?.title || note.basename,
				path: note.path,
				tags: uniqueTags
			}
		});
	}

	private getAllTags(): string[] {
		const allTags = this.allResults.map(item => {
			return item.tags;
		})
		return Array.from(new Set(allTags.flat())).sort((a, b) => {
			return a.localeCompare(b);
		}).map(tag => {
			return tag.toLowerCase();
		});
	}

	private performSearch() {
		// Implement your search logic here
		// This is where you'd integrate with your plugin's search functionality
		this.logger.debug("Performing Result Search from dir: " + this.targetDirectory);
		let filteredResults: ISearchResult[] = this.allResults;
		// Apply the keyword filter
		if (this.searchQuery.length > 0) {
			filteredResults = this.allResults.filter(result => {
				return result.name.toLowerCase().includes(this.searchQuery.toLowerCase());
			})
			this.logger.debug(`After Filtering results (no. ${filteredResults.length}) by search query: ` + this.searchQuery);
		}

		// Apply the tag filter
		if (this.tagFilterEnabled && this.tagFilter.trim().length > 0) {
			const filterTags = this.tagFilter.trim().split(';')
				.filter(tag => tag.trim().startsWith('#'))
				.map(tag => (tag.toLowerCase()));
			if (filterTags.length > 0) {
				filteredResults = filteredResults.filter(result => {
					return filterTags.some(tag => result.tags.includes(tag));
				});
				this.logger.debug(`After Filtering results (no. ${filteredResults.length}) by tags: ` + filterTags.join(', '));
			}
		}
		this.searchResults = filteredResults;

		// Update results display
		const resultsArea = this.contentEl.querySelector('.results-area') as HTMLElement;

		if (resultsArea) {
			this.displayResults(resultsArea);
		}
	}

	private displayResults(container: HTMLElement) {
		container.empty();

		if (this.searchResults.length === 0) {
			container.createEl('div', {
				text: 'No results found. Try adjusting your search query or filters.',
				cls: 'no-results'
			});
			return;
		}

		// Display actual results here
		this.searchResults.forEach((result, index) => {
			const resultItem = container.createDiv('result-item');
			resultItem.createEl('div', { text: `${result.name}` });

			// If this result is the currently selected one, apply the class on render
			if (this.selectedResult && this.selectedResult.path === result.path) {
				resultItem.addClass('selected');
			}

			resultItem.onclick = () => {
				// Handle result selection
				const previouslySelectedItem = container.querySelector('.result-item.selected');
				if (previouslySelectedItem) {
					previouslySelectedItem.removeClass('selected');
				}

				// Add the 'selected' class to the clicked item
				resultItem.addClass('selected');

				// Update the state to remember the new selection
				this.selectedResult = result;
				this.logger.debug(`selected Result: ${this.selectedResult.name}`);
			};
		});
	}

	private addStyles() {
		const styleEl = document.createElement('style');
		styleEl.textContent = `
            .search-container {
                margin-bottom: 20px;
            }
            
            .search-input-container {
                display: flex;
                align-items: center;
                border: 1px solid var(--background-modifier-border);
                border-radius: 4px;
                padding: 8px 12px;
                background: var(--background-primary);
            }
            
            .search-icon {
                margin-right: 8px;
                color: var(--text-muted);
            }
            
            .search-input {
                border: none;
                outline: none;
                background: transparent;
                color: var(--text-normal);
                flex: 1;
                font-size: 14px;
            }
            
            .tag-filter-container {
                display: flex;
                align-items: center;
                gap: 10px;
                margin-bottom: 20px;
            }
            
            .tag-filter-input {
                flex: 1;
                padding: 8px 12px;
                border: 1px solid var(--background-modifier-border);
                border-radius: 4px;
                background: var(--background-primary);
                color: var(--text-normal);
                font-size: 14px;
            }
            
            .toggle-container {
                display: flex;
                align-items: center;
            }
            
            .toggle-switch {
                width: 50px;
                height: 24px;
                background: var(--background-modifier-border);
                border-radius: 12px;
                position: relative;
                cursor: pointer;
                transition: background-color 0.2s;
            }
            
            .toggle-switch.enabled {
                background: var(--interactive-accent);
            }
            
            .toggle-knob {
                width: 20px;
                height: 20px;
                background: white;
                border-radius: 50%;
                position: absolute;
                top: 2px;
                left: 2px;
                transition: transform 0.2s;
            }
            
            .toggle-switch.enabled .toggle-knob {
                transform: translateX(26px);
            }
            
            .results-container {
                margin-bottom: 20px;
            }
            
            .results-area {
                border: 1px solid var(--background-modifier-border);
                border-radius: 4px;
                min-height: 200px;
                max-height: 300px;
                overflow-y: auto;
                padding: 10px;
                background: var(--background-primary);
            }
            
            .result-item {
                padding: 8px;
                border: 1px solid var(--background-modifier-border);
                border-radius: 4px;
                margin-bottom: 8px;
                cursor: pointer;
                background: var(--background-primary);
            }
            
            .result-item:hover {
                background: var(--background-modifier-hover);
            }
            
            .result-item.selected {
				background-color: var(--interactive-accent-hover);
				border-color: var(--interactive-accent);
			}
            
            .no-results {
                text-align: center;
                color: var(--text-muted);
                padding: 20px;
            }
            
            .button-container {
                display: flex;
                justify-content: flex-end;
                gap: 10px;
                margin-top: 20px;
            }
            
            .action-button {
                padding: 8px 16px;
                border: 1px solid var(--background-modifier-border);
                border-radius: 4px;
                cursor: pointer;
                font-size: 14px;
            }
            
            .insert-button {
                background: var(--interactive-accent);
                color: var(--text-on-accent);
                border-color: var(--interactive-accent);
            }
            
            .cancel-button {
                background: var(--background-primary);
                color: var(--text-normal);
            }
            
            .action-button:hover {
                opacity: 0.8;
            }
        `;
		document.head.appendChild(styleEl);
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}
}
