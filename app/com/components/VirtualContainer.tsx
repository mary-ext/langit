import { type JSX, createSignal, onCleanup } from 'solid-js';

import { resizeObserver, scrollObserver } from '~/utils/intersection-observer';

export interface VirtualContainerProps {
	estimateHeight?: number;
	class?: string;
	children?: JSX.Element;
}

export const VirtualContainer = (props: VirtualContainerProps) => {
	let entry: IntersectionObserverEntry | undefined;
	let height: number | undefined;

	const estimateHeight = props.estimateHeight;

	const [intersecting, setIntersecting] = createSignal(false);
	const [cachedHeight, setCachedHeight] = createSignal(estimateHeight);

	const shouldHide = () => !intersecting() && cachedHeight() !== undefined;

	const handleIntersect = (nextEntry: IntersectionObserverEntry) => {
		const prev = intersecting();
		const next = nextEntry.isIntersecting;

		entry = nextEntry;

		if (!prev && next) {
			// hidden -> visible
			setIntersecting(next);
		} else if (prev && !next) {
			// visible -> hidden
			// unmounting is cheap, but we don't need to immediately unmount it, say
			// for scenarios where layout is still being figured out and we don't
			// actually know where the virtual container is gonna end up.
			requestIdleCallback(() => {
				// bail out if it's no longer us.
				if (entry !== nextEntry) {
					return;
				}

				setIntersecting(next);
			});
		}
	};

	const handleResize = (nextEntry: ResizeObserverEntry) => {
		if (shouldHide()) {
			return;
		}

		const contentRect = nextEntry.contentRect;
		const nextHeight = Math.trunc(contentRect.height * 1000) / 1000;

		if (nextHeight !== height) {
			setCachedHeight((height = nextHeight));
		}
	};

	return (
		<article
			ref={startMeasure}
			class={props.class}
			style={{
				contain: 'content',
				height: shouldHide() ? `${height ?? cachedHeight()}px` : undefined,
			}}
			prop:$onintersect={handleIntersect}
			prop:$onresize={handleResize}
		>
			{(() => {
				if (!shouldHide()) {
					return props.children;
				}
			})()}
		</article>
	);
};

const startMeasure = (node: HTMLElement) => {
	scrollObserver.observe(node);
	resizeObserver.observe(node);

	onCleanup(() => {
		scrollObserver.unobserve(node);
		resizeObserver.unobserve(node);
	});
};

declare class ContentVisibilityAutoStateChangeEvent extends Event {
	readonly target: HTMLElement;
	readonly currentTarget: HTMLElement;
	readonly skipped: boolean;
}

declare module 'solid-js' {
	namespace JSX {
		interface ExplicitProperties {
			oncontentvisibilityautostatechange: (ev: ContentVisibilityAutoStateChangeEvent) => void;
		}
	}
}
