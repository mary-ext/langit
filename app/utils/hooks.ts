import {
	type Accessor,
	type Signal,
	createEffect,
	createRenderEffect,
	createSignal,
	onCleanup,
} from 'solid-js';

export const EQUALS_FALSE = { equals: false } as const;

export const createDebouncedValue = <T>(
	accessor: Accessor<T>,
	delay: number,
	equals?: false | ((prev: T, next: T) => boolean),
): Accessor<T> => {
	const initial = accessor();
	const [state, setState] = createSignal(initial, { equals });

	createEffect((prev: T) => {
		const next = accessor();

		if (prev !== next) {
			const timeout = setTimeout(() => setState(() => next), delay);
			onCleanup(() => clearTimeout(timeout));
		}

		return next;
	}, initial);

	return state;
};

export const createDerivedSignal = <T>(accessor: Accessor<T>): Signal<T> => {
	const [state, setState] = createSignal<T>();

	createRenderEffect(() => {
		setState(accessor);
	});

	return [state, setState] as Signal<T>;
};
