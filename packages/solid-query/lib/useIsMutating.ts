import type { MutationFilters } from '@tanstack/query-core';

import { type Accessor, createSignal, onCleanup, untrack } from 'solid-js';

import type { QueryClient } from './QueryClient.ts';
import { useQueryClient } from './QueryClientProvider.tsx';

export function useIsMutating(
	filters?: Accessor<MutationFilters>,
	queryClient?: QueryClient,
): Accessor<number> {
	const client = useQueryClient(queryClient);
	const mutationCache = client.getMutationCache();

	const initialFilters = untrack(() => filters?.());
	const [mutations, setMutations] = createSignal(client.isMutating(initialFilters));

	const unsubscribe = mutationCache.subscribe((_result) => {
		setMutations(client.isMutating(filters?.()));
	});

	onCleanup(unsubscribe);

	return mutations;
}
