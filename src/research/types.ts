import {BaseDefault} from "../notes";

export interface ISearchResult {
	name: string;
	path: string;
	tags: string[];
}


export interface IDashboardWorkflowInput {
	text: string;
	icon: string;
	callback: () => Promise<void>;
}


export interface ISearchConfirmCallback {
	(selectedNote: ISearchResult| ISearchResult[]): Promise<void>;
}


export interface IAnnotationSection {
	id: string;
	tags: string[];
	article: string;
	year?: string;
	page?: string;
	date?: string;
	content: string[],
	comments?: string[];
	bibliography?: string;
	url?: string;
}


export interface IDashboardKeyTags {
	zotero: string;
	direction: string;
	topic: string;
}

export interface IResearchPath {
	directions: string;
	topics: string;
	papers: string;
	references: string;
	literatures: string;
}


export interface IZoteroNoteItems {
	note: BaseDefault,
	annotations: IAnnotationSection[],
}
