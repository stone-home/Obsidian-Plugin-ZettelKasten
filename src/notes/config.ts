import { INoteTemplateMetadata } from "./types";

export enum NoteType {
	FLEETING = "fleeting",
	LITERATURE = "literature",
	PERMANENT = "permanent",
	ATOMIC = "atom",
}

/*
 * Default metadata for each note type, including label, emoji, description, and upgrade paths
 */
export const NoteTypeData: Record<NoteType, INoteTemplateMetadata> = {
	[NoteType.FLEETING]: {
		label: "Fleeting",
		emoji: "🌱",
		description: "A temporary note for quick thoughts or ideas.",
		path: "001-fleeting/001-notes",
		upgradePath: [NoteType.LITERATURE],
	},
	[NoteType.LITERATURE]: {
		label: "Literature",
		emoji: "📚",
		description: "A note summarizing literature or research findings.",
		path: "002-literature/001-notes",
		upgradePath: [NoteType.FLEETING, NoteType.ATOMIC, NoteType.PERMANENT],
	},
	[NoteType.ATOMIC]: {
		label: "Atomic",
		emoji: "⚛️",
		description:
			"A small, self-contained note that can be linked to others.",
		path: "003-atomic/001-notes",
		upgradePath: [NoteType.FLEETING, NoteType.PERMANENT],
	},
	[NoteType.PERMANENT]: {
		label: "Permanent",
		emoji: "💎",
		description: "A well-structured note that is meant to be permanent.",
		path: "004-permanent/001-notes",
		upgradePath: [NoteType.FLEETING],
	},
};
