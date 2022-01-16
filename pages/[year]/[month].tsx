import type { GetServerSideProps } from 'next';
import { Event, loadEventsForMonth } from 'lib/compile-content';
import { ReactElement } from 'react';

type Props = {
	events: Event[];
};

export default function MonthYear({ events }: Props): ReactElement {
	console.log(events);
	return <div></div>;
}

export const getServerSideProps: GetServerSideProps = async context => {
	const { year, month } = context.params as { year?: string; month?: string };

	const numMonth = Number(month);
	const numYear = Number(year);

	if (
		!year ||
		year.length !== 4 ||
		isNaN(numYear) ||
		isNaN(numMonth) ||
		numMonth < 1 ||
		numMonth > 12
	) {
		return {
			redirect: {
				destination: '/',
				permanent: true,
			},
		};
	}

	const events = await loadEventsForMonth(new Date(numYear, numMonth - 1));

	const props: Props = {
		events,
	};

	return {
		props,
	};
};
