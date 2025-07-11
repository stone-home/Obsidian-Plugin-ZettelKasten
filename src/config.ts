import { ZettelkastenSettings } from "./types";


export const DEFAULT_SETTINGS: ZettelkastenSettings = {
	// Paths for different types of notes
	fleetingPath: 'inbox/fleeting',
	literaturePath: 'inbox/literature',
	permanentPath: 'inbox/permanent',
	atomicPath: 'inbox/atoms',

	// Basic settings
	useTemplater: true,
	autoOpenNewNote: true,
	showUpgradeNotifications: true,

	// Template settings
	includeTimestamp: true,
	defaultTags: [],
	templateDirPath: "templates",
	// Initialize createNoteOptions with the default values from config.ts
	createNoteOptions: [],

	// Advanced settings
	maxRecentNotes: 10,
	enableAutoLinking: false,

}
