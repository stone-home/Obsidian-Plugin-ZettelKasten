// [TS] KeyValue is a generic class that can hold any type of value
import {NoteType} from "./config";

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

/*
 * INoteLink interface defines the structure for linking notes
 */
export interface INoteLink {
	targetNote: string;
	header?: string;
	form?: 'list' | 'checklist';
	link(sourceNote: string): Promise<void>;
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


export interface INoteOptionExtraParams {
	tags?: string[];
	prefix?: string;
	properties?: IKeyValue<any>[];
}

/**
 * INoteOption interface defines the structure for options available in the 'New Note' modal
 */
export interface INoteOption {
	enabled: boolean;
	type: NoteType;
	label: string;
	emoji?: string;
	path?: string;
	template?: string;
	metadata?: INoteTemplateMetadata;
	folderNote?: boolean;
	extraInfo?: INoteOptionExtraParams;
}




