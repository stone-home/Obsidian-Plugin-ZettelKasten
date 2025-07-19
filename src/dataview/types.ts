// types.ts - Define types for JS-based dataviews
export interface IDataviewScript {
	id: string;
	name: string;
	description?: string;
	filePath: string;
	category?: string;
	parameters?: IDataviewParameter[];
	version?: string;
	tags?: string[];
}

export interface IDataviewParameter {
	name: string;
	type: 'string' | 'number' | 'boolean' | 'date' | 'array';
	required: boolean;
	default?: any;
	description?: string;
}

export interface IDataviewExecution {
	scriptId: string;
	container: HTMLElement;
	context: any;
	parameters: Record<string, any>;
}
