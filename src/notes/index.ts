export { NoteType, NoteTypeData } from "./config";

export {
	BaseTemplate,
	FleetingDefaultTemplate,
	LiteratureDefaultTemplate,
	AtomicDefaultTemplate,
	PermanentDefaultTemplate,
} from "./default";

export type {
	IProperties,
	INoteLink,
	IZettelkastenProperties,
	INoteTemplateMetadata,
	IBodySection,
	IKeyValue,
} from "./types";

export {
	BaseNote,
	Body,
	ZettelkastenProperty,
	BaseDefault,
	KeyValue,
	BodySection,
} from "./note";

export { NoteFactory } from "./factory";

// test use
export { ConfirmationModal } from "./V2/modal"
export { BaseDefault as NoteBaseV2 } from "./V2";
