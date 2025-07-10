import { Logger } from './logger';

/**
 * A class containing general utility methods.
 */
export class Utils {
	/**
	 * Generates a string for the current date.
	 * @param ISOFormat - If true, returns the date in full ISO format (YYYY-MM-DDTHH:mm:ss.sssZ).
	 * If false (default), returns the date as YYYY-MM-DD.
	 * @returns {string} The formatted date string.
	 */
	static generateDate(ISOFormat: boolean = false): string {
		let date: string = new Date().toISOString();
		if (!ISOFormat) {
			date = date.split("T")[0];
		}
		Logger.debug(`Generated date: ${date}`);
		return date;
	}

	/**
	 * Generates a unique ID based on the current timestamp and a random number.
	 * @returns {string} A unique string ID.
	 */
	static generateZettelID(): string {
		Logger.debug(`Calling function generateZettelID`);
		// Date.now() provides temporal uniqueness.
		// Math.random() prevents collisions if called within the same millisecond.
		const randomPart = Math.random().toString(36).substring(2);
		const id = Date.now().toString(36) + randomPart;
		Logger.debug(`Generated Zettel ID: ${id}`);
		return id;
	}

	/**
	 * Generates a random integer between min and max (inclusive).
	 * @param min - Minimum value
	 * @param max - Maximum value
	 * @returns {number} Random integer
	 */
	static generateRandomInt(min: number, max: number): number {
		const result = Math.floor(Math.random() * (max - min + 1)) + min;
		Logger.debug(`Generated random int: ${result} (range: ${min}-${max})`);
		return result;
	}

	/**
	 * Sanitizes a filename by removing or replacing invalid characters.
	 * @param filename - The filename to sanitize
	 * @returns {string} Sanitized filename
	 */
	static sanitizeFilename(filename: string): string {
		// Remove or replace characters that are invalid in filenames
		const sanitized = filename
			.replace(/[<>:"/\\|?*]/g, '-') // Replace invalid chars with dash
			.replace(/\s+/g, '-') // Replace spaces with dash
			.replace(/-+/g, '-') // Replace multiple dashes with single dash
			.replace(/^-|-$/g, ''); // Remove leading/trailing dashes

		Logger.debug(`Sanitized filename: "${filename}" -> "${sanitized}"`);
		return sanitized;
	}

	/**
	 * Formats a date string for display.
	 * @param dateString - ISO date string
	 * @param format - Format type ('short', 'long', 'time')
	 * @returns {string} Formatted date string
	 */
	static formatDate(dateString: string, format: 'short' | 'long' | 'time' = 'short'): string {
		const date = new Date(dateString);

		let formatted: string;
		switch (format) {
			case 'long':
				formatted = date.toLocaleDateString('zh-CN', {
					year: 'numeric',
					month: 'long',
					day: 'numeric'
				});
				break;
			case 'time':
				formatted = date.toLocaleString('zh-CN');
				break;
			case 'short':
			default:
				formatted = date.toLocaleDateString('zh-CN');
				break;
		}

		Logger.debug(`Formatted date: "${dateString}" -> "${formatted}" (${format})`);
		return formatted;
	}

	/**
	 * Validates if a string is a valid note type.
	 * @param type - The type string to validate
	 * @returns {boolean} True if valid note type
	 */
	static isValidNoteType(type: string): boolean {
		const validTypes = ['fleeting', 'literature', 'atomic', 'permanent'];
		const isValid = validTypes.includes(type.toLowerCase());
		Logger.debug(`Validated note type: "${type}" -> ${isValid}`);
		return isValid;
	}

	/**
	 * Extracts tags from a string of comma-separated values.
	 * @param tagString - Comma-separated tag string
	 * @returns {string[]} Array of trimmed tags
	 */
	static parseTags(tagString: string): string[] {
		if (!tagString || tagString.trim() === '') {
			return [];
		}

		const tags = tagString
			.split(',')
			.map(tag => tag.trim())
			.filter(tag => tag.length > 0);

		Logger.debug(`Parsed tags: "${tagString}" -> [${tags.join(', ')}]`);
		return tags;
	}

	/**
	 * Capitalizes the first letter of a string.
	 * @param str - String to capitalize
	 * @returns {string} Capitalized string
	 */
	static capitalize(str: string): string {
		if (!str) return str;
		const capitalized = str.charAt(0).toUpperCase() + str.slice(1);
		Logger.debug(`Capitalized: "${str}" -> "${capitalized}"`);
		return capitalized;
	}

	/**
	 * Truncates a string to a specified length with ellipsis.
	 * @param str - String to truncate
	 * @param maxLength - Maximum length
	 * @returns {string} Truncated string
	 */
	static truncate(str: string, maxLength: number): string {
		if (!str || str.length <= maxLength) {
			return str;
		}

		const truncated = str.substring(0, maxLength - 3) + '...';
		Logger.debug(`Truncated: "${str}" -> "${truncated}" (max: ${maxLength})`);
		return truncated;
	}

	/**
	 * Debounces a function call.
	 * @param func - Function to debounce
	 * @param wait - Wait time in milliseconds
	 * @returns {Function} Debounced function
	 */
	static debounce<T extends (...args: any[]) => any>(
		func: T,
		wait: number
	): (...args: Parameters<T>) => void {
		let timeout: NodeJS.Timeout;

		return (...args: Parameters<T>) => {
			clearTimeout(timeout);
			timeout = setTimeout(() => func.apply(this, args), wait);
		};
	}

	/**
	 * Deep clones an object.
	 * @param obj - Object to clone
	 * @returns {T} Cloned object
	 */
	static deepClone<T>(obj: T): T {
		if (obj === null || typeof obj !== 'object') {
			return obj;
		}

		if (obj instanceof Date) {
			return new Date(obj.getTime()) as unknown as T;
		}

		if (obj instanceof Array) {
			return obj.map(item => Utils.deepClone(item)) as unknown as T;
		}

		if (typeof obj === 'object') {
			const cloned: any = {};
			Object.keys(obj).forEach(key => {
				cloned[key] = Utils.deepClone((obj as any)[key]);
			});
			return cloned as T;
		}

		return obj;
	}

	/**
	 * Finds the key of a string-based enum by its value.
	 * This is a type-safe implementation for strict mode.
	 *
	 * @param enumObject The enum object to search in.
	 * @param value The string value whose key needs to be found.
	 * @returns The corresponding enum key, or undefined if not found.
	 */
	static getKeyByValue<T extends Record<string, string>>(enumObject: T, value: string): keyof T | undefined {
		return (Object.keys(enumObject) as Array<keyof T>).find(key => enumObject[key] === value);
	}

	/**
	 * Creates a mutable copy of a readonly object.
	 * @param obj
	 * @return {T} A mutable copy of the object
	 */
	static makeMutable<T>(obj: T): { -readonly [K in keyof T]: T[K] } {
		return { ...obj } as { -readonly [K in keyof T]: T[K] };
	}
}
