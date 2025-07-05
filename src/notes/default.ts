import { App } from 'obsidian'
import { BaseNote, NoteType, Body, Property} from './note';

class BaseDefault extends BaseNote {

	constructor(app: App, noteType: NoteType, template?: BaseNote) {
		super(app, noteType, template);
	}

	defaultBody(): Body {
		let _body: Body = new Body();
		_body.newSection("**🔗Source**", 4)
		return _body;
	}

	defaultProperty(): Property {
		return new Property();
	}

}

export class FleetingDefault extends BaseDefault {
	defaultBody(): Body {
		let _body: Body = super.defaultBody();
		_body.newSection("💥Ideas/Thoughts", 1)
		return _body;
	}

}

export class LiteratureDefault extends BaseDefault {
	defaultBody(): Body {
		let _body: Body = super.defaultBody();
		_body.newSection("🗃️content", 1)
		return _body;
	}
}

export class AtomicDefault extends BaseDefault {
	defaultBody(): Body {
		let _body: Body = super.defaultBody();
		_body.newSection("**💭Thoughts:", 4)
		_body.newSection("⚡️Key Points", 1)
		return _body;
	}
}


export class PermanentDefault extends BaseDefault {
	defaultBody(): Body {
		let _body: Body = super.defaultBody();
		_body.newSection("🗃️content", 1)
		return _body;
	}
}
