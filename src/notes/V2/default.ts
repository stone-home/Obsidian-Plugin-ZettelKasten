import { Body, BaseTemplate } from "./note";


export class FleetingDefaultTemplate extends BaseTemplate {
	defaultBody(): Body {
		let _body: Body = super.defaultBody();
		_body.newSection("💥Ideas/Thoughts", 1);
		return _body;
	}
}

export class LiteratureDefaultTemplate extends BaseTemplate {
	defaultBody(): Body {
		let _body: Body = super.defaultBody();
		_body.newSection("🗃️content", 1);
		return _body;
	}
}

export class AtomicDefaultTemplate extends BaseTemplate {
	defaultBody(): Body {
		let _body: Body = super.defaultBody();
		_body.newSection("**💭Thoughts:", 4);
		_body.newSection("⚡️Key Points", 1);
		return _body;
	}
}

export class PermanentDefaultTemplate extends BaseTemplate {
	defaultBody(): Body {
		let _body: Body = super.defaultBody();
		_body.newSection("🗃️content", 1);
		return _body;
	}
}
