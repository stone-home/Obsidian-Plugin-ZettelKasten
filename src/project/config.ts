import {IProjectSubfolderPaths, IProjectData, IProjectExclusiveTags} from "./types";


export enum ProjectFileType {
	questionType = "question",
	objectiveType = "objective",
	stepType = "step",
	otherType = "other"
}

export const ProjectSubfolderPaths: IProjectSubfolderPaths = {
	[ProjectFileType.questionType]: "questions",
	[ProjectFileType.objectiveType]: "objectives",
	[ProjectFileType.stepType]: "steps",
	[ProjectFileType.otherType]: "others"
}

export const exclusiveTags: IProjectExclusiveTags = {
	[ProjectFileType.questionType]: ["✍️writing/academic/question"],
	[ProjectFileType.objectiveType]: ["✍️writing/academic/objective"],
	[ProjectFileType.stepType]: ["✍️writing/academic/step", "kanban/task"],
	[ProjectFileType.otherType]: ["✍️writing/academic/unclassified"]
}

export const ProjectConfig: IProjectData = {
	entrypoint: "project",
	basename: "project",
	subfolderPaths: ProjectSubfolderPaths,
	exclusiveTags: exclusiveTags
}
