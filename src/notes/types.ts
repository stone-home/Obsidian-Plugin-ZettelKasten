// [TS] KeyValue is a generic class that can hold any type of value
import {NoteType} from "./config";
import {BaseNote} from "./note";

export interface IKeyValue<T> {
	getValue(): T;
	setValue(value: T): void;
	toString(): string;
}

// IProperties interface defines the structure of properties for a note
export interface IProperties {
	title: IKeyValue<string>;
	type: IKeyValue<string>;
	tags: IKeyValue<string[]>;
	aliases: IKeyValue<string[]>;
	// [TS] new is a boolean indicating if the note is new
	[key: string]: IKeyValue<any>;
}

/*
 * IZettelkastenProperties interface extends IProperties to include specific properties for Zettelkasten notes
 */
export interface IZettelkastenProperties extends IProperties {
	url: IKeyValue<string>;
	create: IKeyValue<string>;
	id: IKeyValue<string>;
	sources: IKeyValue<string[]>;
	new: IKeyValue<boolean>;
}

export interface IBodySection {
	title: string;
	head_level: number;
	content: Array<string>;
	getId(): string;
	addContent(content: string | string[]): void;
}

export interface IBody {
	sections: Map<string, IBodySection>;
	newSection(name: string, head_level: number): IBodySection;
	addSection(section: IBodySection): void;
	getSectionById(id: string): IBodySection | undefined;
	getSection(name: string, head_level: number): IBodySection | undefined;
	addContent(content: string | string[], sectionName: string, head_level: number) : void;
	update(body: IBody): void;
	toString(): string;
}

/*
 * INoteLink interface defines the structure for linking notes
 */
export interface INoteLink {
	targetNote: BaseNote;
	header?: IBodySection;
	form?: 'list' | 'checklist';
	property: boolean;
	link(sourceNote: BaseNote): Promise<void>;
}

/*
 * BaseTemplate interface defines the structure for a template
 */
export interface ITemplateMetadata {
	"path": string,
}

/**
 * The Data is used to store metadata for each note type
 * all basic metadata is stored here
 */
export interface INoteTemplateMetadata {
	label: string;
	emoji: string;
	description: string;
	path: string;
	upgradePath: Array<NoteType>;
}







