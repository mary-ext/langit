import { For, createEffect, createSignal, lazy } from 'solid-js';
import { createMutable } from 'solid-js/store';

import { createInfiniteQuery, useQueryClient } from '@pkg/solid-query';

import type { AppBskyGraphListitem, At, Brand, ComAtprotoRepoApplyWrites } from '~/api/atp-schema';
import { multiagent, renderAccountName } from '~/api/globals/agent';
import { renderListPurpose } from '~/api/display';
import { getCurrentDate, waitForRatelimit } from '~/api/utils/misc';

import { getProfileLists, getProfileListsKey } from '~/api/queries/get-profile-lists';
import type { SignalizedList } from '~/api/stores/lists';

import { chunked, clsx, mapDefined } from '~/utils/misc';

import { closeModal, openModal, useModalState } from '../../../globals/modals';

import { Button } from '../../../primitives/button';
import { DialogActions, DialogBody, DialogHeader, DialogRoot, DialogTitle } from '../../../primitives/dialog';
import { IconButton } from '../../../primitives/icon-button';
import { Interactive, loadMoreBtn } from '../../../primitives/interactive';

import GenericErrorView from '../../views/GenericErrorView';
import FilterBar from '../../inputs/FilterBar';
import CircularProgress from '../../CircularProgress';
import Modal from '../../Modal';
import DialogOverlay from '../DialogOverlay';

import AddIcon from '../../../icons/baseline-add';
import CheckIcon from '../../../icons/baseline-check';
import CloseIcon from '../../../icons/baseline-close';

import DefaultListAvatar from '../../../assets/default-list-avatar.svg?url';

import type { CloneListMembersDialogProps } from './CloneListMembersDialog';

const AddListDialog = lazy(() => import('./AddListDialog'));

const listItem = Interactive({
	variant: 'muted',
	class: `flex min-w-0 items-center gap-3 px-4 py-3 text-left disabled:opacity-50`,
});

const enum Step {
	START,
	PENDING,
	ERROR,
	SUCCESS,
}

const CloneListMembersDialog = (props: CloneListMembersDialogProps) => {
	const queryClient = useQueryClient();
	const { disableBackdropClose } = useModalState();

	const list = props.list;

	const [uid, setUid] = createSignal(list.uid);

	const ui = createMutable({
		step: Step.START,
		value: 0,
		max: 1,
		message: `Retrieving list of members`,
	});

	const [dest, setDest] = createSignal<SignalizedList>();

	const lists = createInfiniteQuery(() => {
		const $uid = uid();

		return {
			queryKey: getProfileListsKey($uid, $uid),
			queryFn: getProfileLists,
			initialPageParam: undefined,
			getNextPageParam: (last) => last.cursor,
			select: (data) => {
				const isSameAuthor = $uid === list.uid;

				return data.pages.flatMap((page) => {
					const lists = page.lists;

					if (isSameAuthor) {
						return lists.filter((x) => x.uri !== list.uri);
					}

					return lists;
				});
			},
		};
	});

	const handleSubmit = async () => {
		const dst = dest();

		if (ui.step !== Step.START || !dst) {
			return;
		}

		const { rpc } = await multiagent.connect(dst.uid);

		let existing: Set<At.DID>;
		let members: At.DID[] = [];

		ui.step = Step.PENDING;

		try {
			let dids: At.DID[] = [];
			let cursor: string | undefined;

			do {
				ui.message = `Retrieving destination list (${dids.length} members)`;

				const response = await rpc.get('app.bsky.graph.getList', {
					params: {
						list: dst.uri,
						cursor: cursor,
						limit: 100,
					},
				});

				const data = response.data;

				cursor = data.cursor;
				dids = dids.concat(data.items.map((x) => x.subject.did));
			} while (cursor !== undefined);

			existing = new Set(dids);
		} catch (err) {
			ui.step = Step.ERROR;
			ui.message = `Something happened while retrieving members from destination list.`;

			console.error(err);
			return;
		}

		try {
			let cursor: string | undefined;
			let total = 0;

			do {
				ui.message = `Retrieving source list (${members.length}/${total} members)`;

				const { data } = await rpc.get('app.bsky.graph.getList', {
					params: {
						list: list.uri,
						cursor: cursor,
						limit: 100,
					},
				});

				cursor = data.cursor;
				members = members.concat(
					mapDefined(data.items, (x) => {
						const did = x.subject.did;
						return !existing.has(did) ? did : undefined;
					}),
				);

				total += data.items.length;
			} while (cursor !== undefined);
		} catch (err) {
			ui.step = Step.ERROR;
			ui.message = `Something happened while retrieving list of members to clone.`;

			console.error(err);
			return;
		}

		const date = getCurrentDate();
		const writes: Brand.Union<ComAtprotoRepoApplyWrites.Create>[] = members.map((did) => {
			const record: AppBskyGraphListitem.Record = {
				createdAt: date,
				list: dst.uri,
				subject: did,
			};

			return {
				$type: 'com.atproto.repo.applyWrites#create',
				collection: 'app.bsky.graph.listitem',
				value: record,
			};
		});

		const CHUNK_SIZE = 100;

		const total = writes.length;
		let current = 0;

		try {
			ui.max = total;

			for (const chunk of chunked(writes, CHUNK_SIZE)) {
				ui.message = `Copied ${current} members out of ${total}`;
				ui.value = current;

				const { headers } = await rpc.call('com.atproto.repo.applyWrites', {
					data: {
						repo: dst.uid,
						writes: chunk,
					},
				});

				await waitForRatelimit(headers, CHUNK_SIZE * 3);

				current += chunk.length;
			}

			ui.value = current;
		} catch (err) {
			ui.step = Step.ERROR;
			ui.message = `Something happened while copying list members.`;

			console.error(err);
			return;
		} finally {
			// Invalidate the memberships
			queryClient.invalidateQueries({
				exact: true,
				queryKey: ['getListMemberships', dst.uid],
			});
		}

		ui.step = Step.SUCCESS;
		ui.message = `Successfully copied ${total} members`;
	};

	createEffect(() => {
		disableBackdropClose.value = ui.step === Step.PENDING;
	});

	return (
		<DialogOverlay>
			<Modal open={ui.step !== Step.START} onClose={() => ui.step === Step.PENDING || closeModal()}>
				<DialogOverlay>
					<div class={/* @once */ DialogRoot({ size: 'sm' })}>
						<div class={/* @once */ DialogHeader()}>
							<h1 class={/* @once */ DialogTitle()}>Cloning list members</h1>
						</div>

						<div class={/* @once */ DialogBody({ padded: true, class: 'flex flex-col gap-4' })}>
							<p class="text-sm">
								List members from <b>{list.name.value}</b> are being cloned to <b>{dest()!.name.value}</b>...
							</p>

							<div class="h-1 w-full overflow-hidden rounded bg-muted">
								<div class="h-full bg-accent" style={{ width: `${(ui.value / ui.max) * 100}%` }}></div>
							</div>

							<p class="text-sm text-muted-fg">{ui.message}</p>
						</div>

						<div class={/* @once */ DialogActions()}>
							<button
								disabled={ui.step === Step.PENDING}
								onClick={closeModal}
								class={/* @once */ Button({ variant: 'primary' })}
							>
								Dismiss
							</button>
						</div>
					</div>
				</DialogOverlay>
			</Modal>

			<div class={/* @once */ DialogRoot({ size: 'md', fullHeight: true })}>
				<fieldset disabled={ui.step !== Step.START} class="contents">
					<div class={/* @once */ DialogHeader({ divider: true })}>
						<button
							title="Close dialog"
							onClick={closeModal}
							class={/* @once */ IconButton({ edge: 'left' })}
						>
							<CloseIcon />
						</button>

						<div class="flex min-w-0 grow flex-col gap-0.5">
							<p class="overflow-hidden text-ellipsis whitespace-nowrap text-base font-bold leading-5">
								Copy list members
							</p>

							<p class="overflow-hidden text-ellipsis whitespace-nowrap text-xs text-muted-fg">
								{list.name.value}
							</p>
						</div>

						<button
							disabled={!dest()}
							onClick={handleSubmit}
							class={/* @once */ Button({ variant: 'primary', size: 'xs' })}
						>
							Clone
						</button>
					</div>

					<div class={/* @once */ DialogBody({ padded: false, scrollable: true, class: 'flex flex-col' })}>
						{multiagent.accounts.length > 1 && (
							<div class="p-4 pb-2">
								<FilterBar
									value={uid()}
									onChange={setUid}
									items={multiagent.accounts.map((account) => ({
										value: account.did,
										get label() {
											return `${renderAccountName(account)}'s lists`;
										},
									}))}
								/>
							</div>
						)}

						<button
							onClick={() => {
								const $uid = uid();

								openModal(() => (
									<AddListDialog
										uid={$uid}
										onSubmit={() => {
											queryClient.resetQueries({
												exact: true,
												queryKey: getProfileListsKey($uid, $uid),
											});
										}}
									/>
								));
							}}
							class={listItem}
						>
							<AddIcon class="text-lg" />
							<span class="text-sm">Create new list</span>
						</button>

						<For each={lists.data}>
							{(list) => {
								const isSelected = () => {
									const $dest = dest();
									return $dest ? $dest.uri === list.uri : false;
								};

								return (
									<button aria-pressed={isSelected()} onClick={() => setDest(list)} class={listItem}>
										<img src={list.avatar.value || DefaultListAvatar} class="h-9 w-9 shrink-0 rounded-md" />

										<div class="min-w-0 grow">
											<p class="break-words text-sm font-bold">{list.name.value}</p>
											<p class="text-sm text-muted-fg">{renderListPurpose(list.purpose.value)}</p>
										</div>

										<CheckIcon class={clsx([`text-xl text-accent`, !isSelected() && `invisible`])} />
									</button>
								);
							}}
						</For>

						{(() => {
							if (lists.isFetching) {
								return (
									<div class="grid h-13 shrink-0 place-items-center">
										<CircularProgress />
									</div>
								);
							}

							if (lists.isError) {
								return (
									<GenericErrorView
										error={lists.error}
										onRetry={() => {
											if (lists.isLoadingError) {
												lists.refetch();
											} else {
												lists.fetchNextPage();
											}
										}}
									/>
								);
							}

							if (lists.hasNextPage) {
								return (
									<button onClick={() => lists.fetchNextPage()} class={loadMoreBtn}>
										Show more lists
									</button>
								);
							}

							return (
								<div class="grid h-13 shrink-0 place-items-center">
									<p class="text-sm text-muted-fg">End of list</p>
								</div>
							);
						})()}
					</div>
				</fieldset>
			</div>
		</DialogOverlay>
	);
};

export default CloneListMembersDialog;
