import { type JSX, For, children, createMemo } from 'solid-js';

import { Freeze } from '@pkg/solid-freeze';

import Tab from './Tab.tsx';

export interface TabbedPanelViewProps {
	label: string;
	value: string | number;
	hidden?: boolean;
	children?: JSX.Element;
}

export const TabbedPanelView = (props: TabbedPanelViewProps) => {
	return props as unknown as JSX.Element;
};

export interface TabbedPanelProps<T extends string | number> {
	dense?: boolean;
	hideTabs?: boolean;
	selected: T;
	onChange: (next: T) => void;
	children: JSX.Element;
}

export const TabbedPanel = <T extends string | number>(props: TabbedPanelProps<T>) => {
	const panels = children(() => props.children);

	const selectedArray = createMemo<T[]>((prev) => {
		const $selected = props.selected;

		if (!prev.includes($selected)) {
			return prev.concat($selected);
		}

		return prev;
	}, []);

	const rendered = (): TabbedPanelViewProps[] => {
		const $panels = panels.toArray() as unknown as TabbedPanelViewProps[];
		const $selectedArray = selectedArray();

		const array: TabbedPanelViewProps[] = [];

		for (let idx = 0, len = $panels.length; idx < len; idx++) {
			const panel = $panels[idx];

			if (panel.hidden || !$selectedArray.includes(panel.value as T)) {
				continue;
			}

			array.push(panel);
		}

		return array;
	};

	return (
		<>
			{!props.hideTabs && (
				<div
					class="box-content flex shrink-0 overflow-x-auto border-b border-divider"
					classList={{ [`h-13`]: !props.dense, [`h-10`]: props.dense }}
				>
					<For each={panels.toArray() as unknown as TabbedPanelViewProps[]}>
						{(panel) => (
							<>
								{!panel.hidden && (
									<Tab
										active={props.selected === panel.value}
										onClick={() => props.onChange(panel.value as T)}
									>
										{panel.label}
									</Tab>
								)}
							</>
						)}
					</For>
				</div>
			)}

			<For each={rendered()}>
				{(panel) => <Freeze freeze={props.selected !== panel.value}>{panel.children}</Freeze>}
			</For>
		</>
	);
};
