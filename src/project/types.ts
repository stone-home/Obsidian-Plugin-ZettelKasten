import {IBodySection} from "../notes";

export interface IProjectSubfolderPaths {
	[key: string]: string
}

export interface IProjectExclusiveTags {
	[key: string]: string[]
}

export interface IProjectData {
	entrypoint: string;
	basename: string;
	subfolderPaths: IProjectSubfolderPaths;
	exclusiveTags: IProjectExclusiveTags;
}


export interface IReformNoteProperties {
	codeblockKey: string,
	ongoingProject: boolean,
	sourceNotes?: string[],
	eTags?: string[],
	eSection?: IBodySection[],
	[key: string]: any
}


