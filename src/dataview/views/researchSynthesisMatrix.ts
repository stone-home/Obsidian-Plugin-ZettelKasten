import { IRawDataviewScript } from "../types";

export const View: IRawDataviewScript = {
	id: "research-synthesis-matrix",
	name: "Research Synthesis Matrix for Literature Reviews",
	description: "A useful tool, Synthesis Martix, to organize and synthesize literature reviews in Obsidian.",
	parameters: [
		{
			name: "featuresMatrix",
			type: "boolean",
			required: false,
			description: " Whether to include a features matrix to create a synthesis matrix for checking features of each literature.",
		},
		{
			name: "checkTags",
			type: "string",
			required: false,
			description: "checkTags: The tags to filter the literature for the features matrix. Use a comma-separated list of tags, e.g., '#research/feature/feature1, #research/feature/feature2'.",
		},
		{
			name: "modelTrainMatrix",
			type: "boolean",
			required: false,
			description: " Whether to include a Model-Training related matrix, which include the model name, features, etc.",
		},
	],
	script: `
	// --- CONFIGURATION ---
const featuresMatrix = input.featuresMatrix ?? false;
const modelTrainMatrix = input.modelTrainMatrix ?? false;
let checkTagsInput = input.checkTags ?? [];

// Ensure checkTags is a string array.
const checkTags = Array.isArray(checkTagsInput)
    ? checkTagsInput
    : checkTagsInput.split(",").map(tag => tag.trim());

// --- DATA FETCHING & SORTING ---
const currentPage = dv.current();
const literatureLinks = currentPage.literatures ?? [];

const sortedPages = dv.array(literatureLinks)
    .map(link => dv.page(link))
    .sort(p => p.year?.year ?? 0, 'desc')
    .sort(p => p.file.name, 'asc');


// --- HELPER FUNCTIONS ---

/**
 * Generates a formatted name string for a page.
 * @param p - The Dataview page object.
 * @returns A formatted string with links and metadata.
 */
function getName(p) {
    const shortName = p.shortName ?? 'ShortName Unavailable';
    const year = p.year?.year ?? '';
    const nameLink = '[[' + p.file.path + '|' + shortName + '(' + year + ')]]';
    const isStarred = p.star ? "⭐" : "";
    const urlPage = p.url ? '[📜](' + p.url + ')' : "";
    const codeExist = p.code ? '[🌐](' + p.code + ')' : "";
    return nameLink + ' ' + isStarred + urlPage + codeExist;
}

/**
 * Extracts and cleans tags based on a prefix.
 * @param page - The Dataview page object.
 * @param prefix - The tag prefix to filter by.
 * @returns An array of cleaned tag suffixes.
 */
function getTagsByPrefix(page, prefix) {
    return (page.file.etags || [])
        .filter(tag => tag.startsWith(prefix))
        .map(tag => tag.substring(prefix.length));
}


// --- MAIN LITERATURE TABLE ---

dv.table(
    ["📑Name", "🗯️Problems", "🩻Topic", "🧬Position", "🫆Methods", "💎Novelty"],
    sortedPages.map(p => {
        const problems = getTagsByPrefix(p, "#research/problem/");
        const methods = p.method ?? getTagsByPrefix(p, "#research/method/");

        return [
            getName(p),
            problems.length > 0 ? problems.join(", ") : 'Undefined',
            p.topic ?? 'Undefined',
            p.position ?? 'Undefined',
            Array.isArray(methods) && methods.length > 0 ? methods.join(", ") : 'Undefined',
            p.novelty ?? 'Undefined'
        ];
    })
);


// --- FEATURES MATRIX ---
if (featuresMatrix) {
    dv.header(2, "🔬 Features Matrix");

    const keyElements = { "feature": "F", "concept": "C", "method": "M", "context": "X" };
    const legend = Object.entries(keyElements)
        .map(([key, abbr]) => key + ': ' + abbr)
        .join(', ');
    dv.paragraph(legend);

    const headers = ["Name"];
    const expectedTags = [];

    for (const tag of checkTags) {
        for (const key in keyElements) {
            if (tag.includes('/' + key + '/')) {
                const tagParts = tag.split('/' + key + '/');
                if (tagParts.length > 1) {
                    const abbreviation = keyElements[key];
                    headers.push('(' + abbreviation + ')' + tagParts.pop());
                    expectedTags.push(tag);
                }
            }
        }
    }

    if (headers.length > 1) {
        dv.table(
            headers,
            sortedPages.map(page => {
                const checkList = expectedTags.map(tag =>
                    // FIX: Use .includes() for arrays instead of .has()
                    (page.file.etags || []).includes(tag) ? "✅" : "❌"
                );
                return [getName(page), ...checkList];
            })
        );
    }
}


// --- MODEL-TRAINING MATRIX ---
if (modelTrainMatrix) {
    dv.header(2, "🤖 Model Training Matrix");

    const mlPages = sortedPages.filter(p =>
        // FIX: Use .includes() for arrays instead of .has()
        (p.file.etags || []).includes("#research/method/ml-based-prediction")
    );

    const allUniqueFeatures = [...new Set(mlPages.flatMap(p => p.trainFeatures ?? []))];
    const trainingTitle = ["Name", "Model", "Sampling", "DProcess", "Loss+Opt", "Metrics", ...allUniqueFeatures];

    const content = mlPages.map(page => {
        const pageFeatures = new Set(page.trainFeatures ?? []);
        const trainLoss = page.trainLoss ?? [];
        const trainOptimizer = page.trainOptimizer ?? [];
        const lossAndOptParts = [];
        if (trainLoss.length > 0) {
            lossAndOptParts.push(trainLoss.join(', '));
        }
        if (trainOptimizer.length > 0) {
            lossAndOptParts.push(trainOptimizer.join(', '));
        }
        const lossAndOptStr = lossAndOptParts.join(' + ');

        const baseData = [
            getName(page),
            (page.models ?? []).join(", ") || "N/A",
            (page.datasetSampling ?? []).join(", ") || "N/A",
            (page.datasetProcess ?? []).join(", ") || "N/A",
            lossAndOptStr || "N/A",
            (page.trainMetrics ?? []).join(", ") || "N/A"
        ];

        const featureCheckmarks = allUniqueFeatures.map(feat =>
            pageFeatures.has(feat) ? "✅" : "❌"
        );

        return [...baseData, ...featureCheckmarks];
    });

    if (mlPages.length > 0) {
        dv.table(trainingTitle, content);
    }
}
	`,
};
