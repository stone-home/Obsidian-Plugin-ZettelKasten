import {INoteOption} from "./notes";


// 插件设置接口 - 扩展更多配置项
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
	// New Note Options (for settings)
	createNoteOptions: INoteOption[];

	// Advanced settings
	maxRecentNotes: number;
	enableAutoLinking: boolean;

}

