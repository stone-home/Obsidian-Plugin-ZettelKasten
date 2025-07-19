import { IDataviewParameter, IDataviewScript } from "./types";
import { DataviewJSManager } from "./manager";

// dataview-script-builder.ts - Builder for creating scripts programmatically
export class DataviewScriptBuilder {
	private manager: DataviewJSManager;
	private script: Partial<IDataviewScript & { content: string }> = {};

	constructor(manager: DataviewJSManager) {
		this.manager = manager;
	}

	id(id: string): this {
		this.script.id = id;
		return this;
	}

	name(name: string): this {
		this.script.name = name;
		return this;
	}

	description(desc: string): this {
		this.script.description = desc;
		return this;
	}

	category(category: string): this {
		this.script.category = category;
		return this;
	}

	parameter(name: string, type: IDataviewParameter['type'], required = false, defaultValue?: any, description?: string): this {
		if (!this.script.parameters) this.script.parameters = [];
		this.script.parameters.push({
			name,
			type,
			required,
			default: defaultValue,
			description
		});
		return this;
	}

	content(scriptContent: string): this {
		this.script.content = scriptContent;
		return this;
	}

	tags(tags: string[]): this {
		this.script.tags = tags;
		return this;
	}

	async build(): Promise<IDataviewScript> {
		if (!this.script.id || !this.script.name || !this.script.content) {
			throw new Error('Script must have id, name, and content');
		}

		return await this.manager.createScript(
			this.script.id,
			this.script.name,
			this.script.content,
			{
				description: this.script.description,
				category: this.script.category,
				parameters: this.script.parameters,
				tags: this.script.tags
			}
		);
	}
}
