import { batch, createSignal } from 'solid-js';

import { multiagent } from '~/api/globals/agent.ts';
import { type PreliminaryRichText, textToPrelimRt } from '~/api/richtext/composer.ts';

import { modelChecked } from '~/utils/input.ts';
import { signal } from '~/utils/signals.ts';

import ConfirmDialog from '~/com/components/dialogs/ConfirmDialog.tsx';
import Checkbox from '~/com/components/inputs/Checkbox.tsx';

import { type GateState, type PostState, useComposer } from '../../ComposerContext.tsx';
import { type ComposerDraft, type SerializedPostState, getDraftDb } from '../../utils/draft-db.ts';

export interface ApplyDraftDialogProps {
	draft: ComposerDraft;
	onApply: (shouldRemove: boolean) => void;
}

const hydratePostState = (state: SerializedPostState): PostState => {
	let cached: string;
	let rt: PreliminaryRichText;

	return {
		text: state.text,
		get rt() {
			const next = this.text;

			if (cached !== (cached = next)) {
				rt = textToPrelimRt(next);
			}

			return rt;
		},
		external: state.external,
		record: state.record,
		images: state.images.map((img) => {
			return {
				blob: img.blob,
				ratio: img.ratio,
				alt: signal(img.alt),
			};
		}),
		tags: [...state.tags],
		labels: [...state.labels],
		languages: [...state.languages],
	};
};

const hydrateGateState = (state: GateState): GateState => {
	const type = state.type;

	if (type === 'c') {
		return {
			type: type,
			follows: state.follows,
			mentions: state.mentions,
			lists: state.lists,
		};
	}

	return { type: type };
};

const ApplyDraftDialog = (props: ApplyDraftDialogProps) => {
	const context = useComposer();

	const [remove, setRemove] = createSignal(true);

	const draft = props.draft;

	return (
		<ConfirmDialog
			title={`Use draft?`}
			unwrap
			body={
				<>
					<p class="text-sm">
						<b>{/* @once */ draft.title}</b> will replace your current work.
					</p>

					<label class="flex items-center gap-3 pb-2">
						<Checkbox ref={modelChecked(remove, setRemove)} />
						<span class="text-sm">Remove draft copy</span>
					</label>
				</>
			}
			confirmation="Confirm"
			onConfirm={() => {
				const shouldRemove = remove();

				batch(() => {
					const author = draft.author;

					if (multiagent.accounts.some((x) => x.did === author)) {
						context.author = draft.author;
					}

					const state = draft.state;

					// Prevent reusing the serialized objects for use in hydrated state
					context.state = {
						reply: state.reply,
						posts: state.posts.map((post) => hydratePostState(post)),
						gate: hydrateGateState(state.gate),
					};
				});

				if (shouldRemove) {
					const dbp = getDraftDb();

					dbp.then((db) => db.delete('drafts', draft.id)).then(() => props.onApply(shouldRemove));
				} else {
					props.onApply(shouldRemove);
				}
			}}
		/>
	);
};

export default ApplyDraftDialog;
