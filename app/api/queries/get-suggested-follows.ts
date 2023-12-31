import type { QueryFunctionContext as QC } from '@pkg/solid-query';

import type { DID } from '../atp-schema.ts';
import { multiagent } from '../globals/agent.ts';

import { mergeProfile } from '../stores/profiles.ts';

export const getSuggestedFollowsKey = (uid: DID, limit = 30) => {
	return ['getSuggestedFollows', uid, limit] as const;
};
export const getSuggestedFollows = async (
	ctx: QC<ReturnType<typeof getSuggestedFollowsKey>, string | undefined>,
) => {
	const [, uid, limit] = ctx.queryKey;

	const agent = await multiagent.connect(uid);

	const response = await agent.rpc.get('app.bsky.actor.getSuggestions', {
		signal: ctx.signal,
		params: {
			cursor: ctx.pageParam,
			limit: limit,
		},
	});

	const data = response.data;
	const profiles = data.actors;

	return {
		cursor: data.cursor,
		profiles: profiles.map((profile) => mergeProfile(uid, profile)),
	};
};
