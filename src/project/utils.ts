import { IReformNoteProperties } from "./types";
import { BaseDefault } from "../notes";
import {
	DataviewHelper,
	ViewResearchLiteratureMetadata,
	ViewProjectReference,
} from "../dataview";
import { ViewProjectGanttChart } from "../dataview/views";

export function projectReformResearchNote(
	note: BaseDefault,
	properties: IReformNoteProperties,
): BaseDefault {
	const tags = Array.from(
		new Set([
			"writing/academic/literatureSummary",
			"research",
			"📍tagNode",
			...(properties.eTags || []),
		]),
	);

	note.setProperty("url", properties.url || "");
	note.setProperty("shortName", properties.shortName || "");
	note.setProperty("year", properties.year || "");
	note.setProperty("organisation", properties.organisation || "");
	note.setProperty("venus", properties.venus || "");
	note.setProperty("code", properties.code || "");
	note.setProperty("new", properties.new || false);
	note.setProperty("star", false);
	note.addTag(tags);
	properties.sourceNotes?.forEach((source) => {
		note.addSourceNote(`[[${source}]]`);
	});
	note.addBodyContent(
		[
			DataviewHelper.getCodeBlockContent(
				properties.codeblockKey,
				ViewResearchLiteratureMetadata,
				[
					{
						name: "current",
						type: "boolean",
						required: false,
						value: true,
					},
					{
						name: "statisticOnly",
						type: "boolean",
						required: false,
						value: false,
					},
				],
			),
		],
		"Metadata",
		4,
	);
	note.addBodyContent(
		[
			"🩻**topic**::",
			"🧬**position**::",
			"🔗**evidence**::",
			"🫆**method**::",
			"💊**TL;DR**::",
			"",
		],
		"👻Summary",
		1,
	);

	if (properties.ongoingProject) {
		note.addBodyContent([], "💡Notes", 1);
		note.addBodyContent([], "🔥Issues", 1);
		note.addBodyContent(
			[
				DataviewHelper.getCodeBlockContent(
					properties.codeblockKey,
					ViewProjectGanttChart,
				),
			],
			"🗓️Project Plan",
			1,
		);
		note.addBodyContent([], "🔖References", 1);
	} else {
		note.addBodyContent([], "⭐️Highlights", 1);
		note.addBodyContent([], "📌Limitation", 1);
		note.addBodyContent([], "💡Notes", 1);
		note.addBodyContent([], "⭐️Highlights", 1);
		note.addBodyContent(
			[
				DataviewHelper.getCodeBlockContent(
					properties.codeblockKey,
					ViewResearchLiteratureMetadata,
					[
						{
							name: "current",
							type: "boolean",
							required: false,
							value: true,
						},
						{
							name: "isDetailed",
							type: "boolean",
							required: false,
							value: true,
						},
						{
							name: "statisticOnly",
							type: "boolean",
							required: false,
							value: true,
						},
					],
				),
			],
			"🗃️Relevant Papers",
			4,
		);
		note.addBodyContent(
			[
				DataviewHelper.getCodeBlockContent(
					properties.codeblockKey,
					ViewProjectReference,
				),
			],
			"🔖References",
			1,
		);
	}
	properties?.eSection?.forEach((section) => {
		note.addBodyContent(section.content, section.title, section.head_level);
	});

	return note;
}
