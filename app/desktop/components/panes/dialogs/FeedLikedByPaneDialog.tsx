import { createInfiniteQuery, createQuery } from '@pkg/solid-query';

import type { DID } from '~/api/atp-schema.ts';

import { getFeedInfo, getFeedInfoKey, getInitialFeedInfo } from '~/api/queries/get-feed-info.ts';
import { getLikes, getLikesKey } from '~/api/queries/get-likes.ts';

import ProfileList from '~/com/components/lists/ProfileList.tsx';
import { LINK_PROFILE, useLinking } from '~/com/components/Link.tsx';

import { usePaneContext } from '../PaneContext.tsx';
import PaneDialog from '../PaneDialog.tsx';
import PaneDialogHeader from '../PaneDialogHeader.tsx';

export interface FeedLikedByPaneDialogProps {
	/** Expected to be static */
	actor: DID;
	/** Expected to be static */
	rkey: string;
}

const FeedLikedByPaneDialog = (props: FeedLikedByPaneDialogProps) => {
	const { actor, rkey } = props;

	const linking = useLinking();
	const { pane } = usePaneContext();

	const uri = `at://${actor}/app.bsky.feed.generator/${rkey}`;

	const feed = createQuery(() => {
		const key = getFeedInfoKey(pane.uid, uri);

		return {
			queryKey: key,
			queryFn: getFeedInfo,
			initialDataUpdatedAt: 0,
			initialData: () => getInitialFeedInfo(key),
		};
	});

	const likes = createInfiniteQuery(() => {
		return {
			queryKey: getLikesKey(pane.uid, uri),
			queryFn: getLikes,
			initialPageParam: undefined,
			getNextPageParam: (last) => last.cursor,
		};
	});

	return (
		<PaneDialog>
			<PaneDialogHeader
				title={`Likes`}
				subtitle={(() => {
					const $feed = feed.data;

					if ($feed) {
						return $feed.name.value;
					}
				})()}
			/>

			<div class="flex min-h-0 grow flex-col overflow-y-auto">
				<ProfileList
					profiles={likes.data?.pages.flatMap((page) => page.profiles)}
					fetching={likes.isFetching}
					error={likes.error}
					hasMore={likes.hasNextPage}
					onRetry={() => likes.fetchNextPage()}
					onLoadMore={() => likes.fetchNextPage()}
					onItemClick={(profile, alt) => {
						if (alt) {
							return;
						}

						linking.navigate({ type: LINK_PROFILE, actor: profile.did });
					}}
				/>
			</div>
		</PaneDialog>
	);
};

export default FeedLikedByPaneDialog;
