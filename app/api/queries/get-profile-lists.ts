import type { QueryFunctionContext as QC } from '@pkg/solid-query';

import type { DID } from '../atp-schema.ts';
import { multiagent } from '../globals/agent.ts';

import { mergeList } from '../stores/lists.ts';

export const getProfileListsKey = (uid: DID, actor: string, limit: number = 30) => {
	return ['getProfileLists', uid, actor, limit] as const;
};
export const getProfileLists = async (ctx: QC<ReturnType<typeof getProfileListsKey>, string | undefined>) => {
	const [, uid, actor, limit] = ctx.queryKey;

	const agent = await multiagent.connect(uid);

	const response = await agent.rpc.get('app.bsky.graph.getLists', {
		signal: ctx.signal,
		params: {
			actor: actor,
			limit: limit,
			cursor: ctx.pageParam,
		},
	});

	const data = response.data;

	return {
		cursor: data.cursor,
		lists: data.lists.map((list) => mergeList(uid, list)),
	};
};
