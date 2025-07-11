import { ZettelkastenSettings } from "./types";
import {CreateNoteOptions, NoteTypeData} from "./notes";

export const DEFAULT_SETTINGS: ZettelkastenSettings = {
	// 路径设置
	fleetingPath: '000-inbox/1-fleeting',
	literaturePath: '000-inbox/2-literature',
	permanentPath: '000-inbox/3-permanent',
	atomicPath: '000-inbox/4-atoms',

	// 基础设置
	useTemplater: true,
	autoOpenNewNote: true,
	showUpgradeNotifications: true,

	// 模板设置
	includeTimestamp: true,
	defaultTags: [],

	// 高级设置
	maxRecentNotes: 10,
	enableAutoLinking: false,

	// Initialize createNoteOptions with the default values from config.ts
	createNoteOptions: []
}
