import {INoteOption, NoteType} from "./notes";


export interface DefaultTemplate {
	[NoteType.FLEETING]: string
	[NoteType.LITERATURE]: string
	[NoteType.PERMANENT]: string
	[NoteType.ATOMIC]: string
}


export interface ZettelkastenSettings {
	// Default paths for different types of notes
	fleetingPath: string;
	literaturePath: string;
	permanentPath: string;
	atomicPath: string;

	// Basic settings
	useTemplater: boolean;
	autoOpenNewNote: boolean;
	showUpgradeNotifications: boolean;

	// Template settings
	includeTimestamp: boolean;
	defaultTags: string[];
	templateDirPath: string;
	default: DefaultTemplate;

	// New Note Options (for settings)
	createNoteOptions: INoteOption[];

	// Advanced settings
	maxRecentNotes: number;
	enableAutoLinking: boolean;

}

