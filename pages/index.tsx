import type { GetServerSideProps } from 'next';
import { loadEventsForMonth, Event } from 'lib/compile-content';
import { ReactElement } from 'react';

type Props = {
	events: Event[];
};

export default function Home({ events }: Props): ReactElement {
	console.log(events);
	return <div></div>;
}

export const getServerSideProps: GetServerSideProps = async () => {
	const events = await loadEventsForMonth(new Date());

	const props: Props = {
		events,
	};

	return {
		props,
	};
};
