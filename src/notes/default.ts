import { Body, BaseNote, Property } from "./note";


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





