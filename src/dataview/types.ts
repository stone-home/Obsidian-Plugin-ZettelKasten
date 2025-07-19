// types.ts - Define types for JS-based dataviews
export interface IRawDataviewScript {
	id: string;
	name: string;
	description?: string;
	parameters?: IDataviewParameter[];
	script: string; // The script content as a string
}


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
	value?: any; //
}

export interface IDataviewExecution {
	scriptId: string;
	container: HTMLElement;
	context: any;
	parameters: Record<string, any>;
}
