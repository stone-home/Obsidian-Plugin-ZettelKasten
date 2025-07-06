import { App } from 'obsidian'
import {BaseNote, NoteType, Body, Property, IProperties, KeyValue} from './note';
import {Utils} from "../utils";
import {IntegrationManager} from "../3rd/manager";


export class BaseTemplate extends BaseNote {
	defaultBody(): Body {
		return new Body();
	}

	defaultProperty(): Property {
		let properties: Property = new Property();
		properties.setPropertyValue("template", true);
		return properties;
	}

}


export class FleetingDefaultTemplate extends BaseTemplate {
	defaultBody(): Body {
		let _body: Body = super.defaultBody();
		_body.newSection("💥Ideas/Thoughts", 1)
		return _body;
	}

}

export class LiteratureDefaultTemplate extends BaseTemplate {
	defaultBody(): Body {
		let _body: Body = super.defaultBody();
		_body.newSection("🗃️content", 1)
		return _body;
	}
}

export class AtomicDefaultTemplate extends BaseTemplate {
	defaultBody(): Body {
		let _body: Body = super.defaultBody();
		_body.newSection("**💭Thoughts:", 4)
		_body.newSection("⚡️Key Points", 1)
		return _body;
	}
}


export class PermanentDefaultTemplate extends BaseTemplate {
	defaultBody(): Body {
		let _body: Body = super.defaultBody();
		_body.newSection("🗃️content", 1)
		return _body;
	}
}


// Zettelkasten Relevant Class
export interface IZettelkastenProperties extends IProperties {
	url: KeyValue<string>;
	create: KeyValue<string>;
	id: KeyValue<string>;
	sources: KeyValue<string[]>;
	new: KeyValue<boolean>;
}


export class ZettelkastenProperty extends Property {
	protected _properties: IZettelkastenProperties;

	constructor() {
		super();
		this._properties = {
			"title": new KeyValue("title", ""),
			"type": new KeyValue("type", ""),
			"url": new KeyValue("url", ""),
			"create": new KeyValue("create", Utils.generateDate()),
			"id": new KeyValue("id", Utils.generateZettelID()),
			"tags": new KeyValue("tags", []),
			"aliases": new KeyValue("aliases", []),
			"sources": new KeyValue("sources", []),
			"new": new KeyValue("new", true),
		}
	}

	public getUrl(): string {
		this.logger.debug("Get Property: url");
		return this.getPropertyValue("url");
	}

	public setUrl(url: string): void {
		this.logger.info(`Set Property: url:${url}`);
		this.setPropertyValue("url", url);
	}

	public addSources(sourceNote: string| string[]): void {
		this.logger.info(`Add Property: source_notes:${sourceNote}`);
		this.setPropertyValue("sources", sourceNote);
	}

	public getSources(): string[] {
		this.logger.debug("Get Property: source_notes");
		return this.getPropertyValue("sources");
	}

	public getId(): string {
		this.logger.debug("Get Property: id");
		return this.getPropertyValue("id");
	}

	public toString(): string {
		this.logger.debug("Generate string-form content");
		this.addAlias(this.getId());
		let propString = "---\n";
		for (const key in this._properties) {
			propString += this._properties[key].toString();
		}
		propString += "---\n";
		return propString;
	}
}


// This default note is used for supplementing mandatory fields in the Zettelkasten system
export class BaseDefault extends BaseNote {
	protected properties: ZettelkastenProperty;

	constructor(app: App, noteType: NoteType, template?: BaseTemplate) {
		super(app, noteType, template);
		this.properties = this.defaultProperty()
	}

	defaultBody(): Body {
		let _body: Body = new Body();
		_body.newSection("**🔗Source**", 4)
		return _body;
	}

	defaultProperty(): ZettelkastenProperty {
		return new ZettelkastenProperty();
	}

	public setUrl(url: string): void {
		this.properties.setUrl(url);
	}

	public addSourceNote(sourceNote: string): void {
		if (!this.properties.getSources().includes(sourceNote)) {
			this.properties.addSources(sourceNote);
		}
	}

}



