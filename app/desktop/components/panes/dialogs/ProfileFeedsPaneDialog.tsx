import { createQuery } from '@pkg/solid-query';

import type { At } from '~/api/atp-schema';

import { getProfile, getProfileKey } from '~/api/queries/get-profile';

import FeedList from '~/com/components/lists/FeedList';

import { usePaneContext } from '../PaneContext';
import PaneDialog from '../PaneDialog';
import PaneDialogHeader from '../PaneDialogHeader';

export interface ProfileFeedsPaneDialogProps {
	/** Expected to be static */
	actor: At.DID;
}

const ProfileFeedsPaneDialog = (props: ProfileFeedsPaneDialogProps) => {
	const { actor } = props;

	const { pane } = usePaneContext();

	const profile = createQuery(() => {
		// @todo: shouldn't be necessary to put initialData for this one I think?
		return {
			queryKey: getProfileKey(pane.uid, actor),
			queryFn: getProfile,
		};
	});

	return (
		<PaneDialog>
			<PaneDialogHeader
				title={`Feeds`}
				subtitle={(() => {
					const $subject = profile.data;

					if ($subject) {
						return `@${$subject.handle.value}`;
					}
				})()}
			/>

			<div class="flex min-h-0 grow flex-col overflow-y-auto">
				<FeedList uid={pane.uid} actor={actor} />
			</div>
		</PaneDialog>
	);
};

export default ProfileFeedsPaneDialog;
