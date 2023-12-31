export declare enum SkinTone {
	Default = 0,
	Light = 1,
	MediumLight = 2,
	Medium = 3,
	MediumDark = 4,
	Dark = 5,
}

export interface NativeEmoji {
	annotation: string;
	emoticon?: string;
	group: number;
	name: string;
	order: number;
	shortcodes?: string[];
	tags?: string[];
	version: number;
	unicode: string;
	skins?: EmojiSkin[];
}

export interface EmojiSkin {
	tone: SkinTone;
	unicode: string;
	version: number;
}

export interface DatabaseConstructorOptions {
	dataSource?: string;
	locale?: string;
}

export declare type Emoji = NativeEmoji;

export default class Database {
	/**
	 * Create a new Database.
	 *
	 * Note that multiple Databases pointing to the same locale will share the
	 * same underlying IndexedDB connection and database.
	 *
	 * @param dataSource - URL to fetch the emoji data from
	 * @param locale - Locale string
	 */
	constructor({ dataSource, locale }?: DatabaseConstructorOptions);
	/**
	 * Resolves when the Database is ready, or throws an error if
	 * the Database could not initialize.
	 *
	 * Note that you don't need to do this before calling other APIs – they will
	 * all wait for this promise to resolve before doing anything.
	 */
	ready(): Promise<void>;
	/**
	 * Returns all emoji belonging to a group, ordered by `order`.
	 *
	 * Non-numbers throw an error.
	 * @param group - the group number
	 */
	getEmojiByGroup(group: number): Promise<NativeEmoji[]>;
	/**
	 * Returns all emoji matching the given search query, ordered by `order`.
	 *
	 * Empty/null strings throw an error.
	 *
	 * @param query - search query string
	 */
	getEmojiBySearchQuery(query: string): Promise<Emoji[]>;
	/**
	 * Return a single emoji matching the shortcode, or null if not found.
	 *
	 * The colons around the shortcode should not be included when querying, e.g.
	 * use "slight_smile", not ":slight_smile:". Uppercase versus lowercase
	 * does not matter. Empty/null strings throw an error.
	 * @param shortcode
	 */
	getEmojiByShortcode(shortcode: string): Promise<Emoji | null>;
	/**
	 * Return a single native emoji matching the unicode string, or null if not found.
	 *
	 * In the case of native emoji, the unicode string can be either the
	 * main unicode string, or the unicode of one of the skin tone variants.
	 *
	 * Empty/null strings throw an error.
	 * @param unicode - unicode (native emoji)
	 */
	getEmojiByUnicode(unicode: string): Promise<Emoji | null>;
	/**
	 * Get the user's preferred skin tone. Returns 0 if not found.
	 */
	getPreferredSkinTone(): Promise<SkinTone>;
	/**
	 * Set the user's preferred skin tone. Non-numbers throw an error.
	 *
	 * @param skinTone - preferred skin tone
	 */
	setPreferredSkinTone(skinTone: SkinTone): Promise<void>;
	/**
	 * Closes the underlying IndexedDB connection. The Database is not usable after that (or any other Databases
	 * with the same locale).
	 *
	 * Note that as soon as any other non-close/delete method is called, the database will automatically reopen.
	 *
	 */
	close(): Promise<void>;
	/**
	 * Deletes the underlying IndexedDB database. The Database is not usable after that (or any other Databases
	 * with the same locale).
	 *
	 * Note that as soon as any other non-close/delete method is called, the database will be recreated.
	 *
	 */
	delete(): Promise<void>;
}
