import { type JSX, createMemo, createSignal } from 'solid-js';

import { renderLabelName } from '~/api/display';
import type { SignalizedPost } from '~/api/stores/posts';

import { CauseLabel, type ModerationDecision } from '~/api/moderation/action';
import { FlagNoOverride } from '~/api/moderation/enums';

import VisibilityIcon from '~/com/icons/baseline-visibility';

export interface PostEmbedWarningProps {
	post: SignalizedPost;
	decision: ModerationDecision | undefined | null;
	children?: JSX.Element;
}

const PostEmbedWarning = (props: PostEmbedWarningProps) => {
	const verdict = createMemo(() => {
		const $decision = props.decision;

		if ($decision) {
			if ($decision.m) {
				return $decision;
			}
		}
	});

	const render = () => {
		const $verdict = verdict();

		if (!$verdict) {
			return props.children;
		}

		const [show, setShow] = createSignal(false);

		const source = $verdict.s;
		const forced = source.t === CauseLabel && source.d.f & FlagNoOverride;
		const title = source.t === CauseLabel ? renderLabelName(source.l.val) : `Media warning`;

		return [
			<button
				disabled={!!forced}
				onClick={() => setShow(!show())}
				class="flex w-full min-w-0 items-center gap-3 overflow-hidden rounded-md border border-divider p-3 text-left hover:bg-secondary/30 disabled:pointer-events-none"
			>
				<VisibilityIcon class="shrink-0 text-base text-muted-fg" />
				<span class="grow text-sm">{title}</span>

				{!forced && <span class="text-de font-medium text-accent">{show() ? `Hide` : `Show`}</span>}
			</button>,

			!forced &&
				(() => {
					if (show()) {
						return props.children;
					}
				}),
		];
	};

	return render as unknown as JSX.Element;
};

export default PostEmbedWarning;
