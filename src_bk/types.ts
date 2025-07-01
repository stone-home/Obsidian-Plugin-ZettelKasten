// 笔记类型枚举
export enum NoteType {
	FLEETING = 'fleeting',
	LITERATURE = 'literature',
	PERMANENT = 'permanent',
	ATOMIC = 'atomic',
	UNKNOWN = 'unknown'
}

// 插件设置接口 - 扩展更多配置项
export interface ZettelkastenSettings {
	// 路径设置
	fleetingPath: string;
	literaturePath: string;
	permanentPath: string;
	atomicPath: string;

	// 基础设置
	useTemplater: boolean;
	autoOpenNewNote: boolean;
	showUpgradeNotifications: boolean;

	// 模板设置
	includeTimestamp: boolean;
	defaultTags: string[];

	// 高级设置
	maxRecentNotes: number;
	enableAutoLinking: boolean;
}

// 默认设置 - 更完整的配置
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
	enableAutoLinking: false
}
