// This context holds the preferences that common components will use.

import { createContext, useContext } from 'solid-js';

import type { DID } from '~/api/atp-schema.ts';
import type { FilterPreferences, LanguagePreferences, TranslationPreferences } from '~/api/types.ts';

import type { ModerationOpts } from '~/api/moderation/types.ts';

export interface SharedPreferencesObject {
	/** Used as a cache-busting mechanism */
	rev: number;
	moderation: ModerationOpts;
	filters: FilterPreferences;
	language: LanguagePreferences;
	translation: TranslationPreferences;
}

export const SharedPreferences = createContext<SharedPreferencesObject>();

/*#__NO_SIDE_EFFECTS__*/
export const useSharedPreferences = () => {
	return useContext(SharedPreferences)!;
};

export const isProfileTempMuted = (prefs: FilterPreferences, actor: DID): number | null => {
	const date = prefs.tempMutes[actor];
	return date !== undefined && Date.now() < date ? date : null;
};

export const useBustRevCache = () => {
	const prefs = useSharedPreferences();
	return () => {
		prefs.rev = ~~(Math.random() * 1024);
	};
};
