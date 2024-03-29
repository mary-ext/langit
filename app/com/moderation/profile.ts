import { sequal } from '~/utils/dequal';

import type { SignalizedProfile } from '~/api/stores/profiles';

import {
	type ModerationCause,
	type ModerationDecision,
	decideLabelModeration,
	finalizeModeration,
} from '~/api/moderation/action';

import { type SharedPreferencesObject } from '../components/SharedPreferences';

type ModerationResult = { d: ModerationDecision | null; c: unknown[] };
const cached = new WeakMap<SignalizedProfile, ModerationResult>();

export const getProfileModDecision = (profile: SignalizedProfile, opts: SharedPreferencesObject) => {
	const profileDid = profile.did;
	const labels = profile.labels.value;

	const key: unknown[] = [labels, opts.rev];

	let res = cached.get(profile);

	if (!res || !sequal(res.c, key)) {
		const { moderation } = opts;

		const accu: ModerationCause[] = [];

		decideLabelModeration(accu, labels, profileDid, moderation);

		cached.set(profile, (res = { d: finalizeModeration(accu), c: key }));
	}

	return res.d;
};
