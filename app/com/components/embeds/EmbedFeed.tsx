import type { JSX } from 'solid-js';

import type { UnionOf } from '~/api/atp-schema.ts';
import { getRecordId } from '~/api/utils/misc.ts';

import { Interactive } from '../../primitives/interactive.ts';

import { LINK_FEED, Link } from '../Link.tsx';

import DefaultFeedAvatar from '../../assets/default-feed-avatar.svg?url';

type EmbeddedFeed = UnionOf<'app.bsky.feed.defs#generatorView'>;

export interface EmbedFeedProps {
	feed: EmbeddedFeed;
}

const embedFeedInteractive = Interactive({ variant: 'muted', class: `w-full rounded-md` });

export const EmbedFeedContent = (props: EmbedFeedProps) => {
	return (() => {
		const feed = props.feed;
		const creator = feed.creator;

		return (
			<div class="flex gap-3 rounded-md border border-divider p-3 text-left text-sm">
				<img
					src={/* @once */ feed.avatar || DefaultFeedAvatar}
					class="mt-0.5 h-9 w-9 rounded-md object-cover"
				/>

				<div>
					<p class="font-bold">{/* @once */ feed.displayName}</p>
					<p class="text-muted-fg">{/* @once */ `Feed by @${creator.handle}`}</p>
				</div>
			</div>
		);
	}) as unknown as JSX.Element;
};

const EmbedFeed = (props: EmbedFeedProps) => {
	return (() => {
		const feed = props.feed;
		const creator = feed.creator;

		return (
			<Link
				to={{ type: LINK_FEED, actor: creator.did, rkey: getRecordId(feed.uri) }}
				class={embedFeedInteractive}
			>
				{/* @once */ EmbedFeedContent(props)}
			</Link>
		);
	}) as unknown as JSX.Element;
};

export default EmbedFeed;
