import { promises as fs } from 'fs';
import getMatter from 'gray-matter';
import {
	addMonths,
	addSeconds,
	differenceInSeconds,
	getDate,
	getDay,
	nextDay,
	setDate,
	startOfMonth,
} from 'date-fns';
import { createDeepTypeEquals, optional, union } from 'deep-type-equals';

export type EventCategory = 'holistic';
export type EventRepeat = 'once' | 'weekly' | 'monthly';

export type Event = {
	slug: string;

	lastUpdatedAt: Date;
	lastConfirmedAt: Date;

	price: number;
	title: string;
	description: string;
	eventUrl: string;
	address: string;
	categories: EventCategory[];

	start: Date;
	end: Date;

	repeat: EventRepeat;
	repeatEnd: Date | undefined;
};

const date = new Date();

const eventReference: Event = {
	slug: 'Slug',

	lastUpdatedAt: date,
	lastConfirmedAt: date,

	price: 123,
	title: 'Title',
	description: 'Description',
	eventUrl: 'URL',
	address: 'Address',
	categories: [union<EventCategory>('holistic', 'holistic')],

	start: date,
	end: date,

	repeat: union<EventRepeat>('once', 'weekly', 'monthly'),
	repeatEnd: optional(date),
};

const isEventComplete = createDeepTypeEquals<Event>(eventReference);

export const loadAllEvents = async (): Promise<Event[]> => {
	const dir = './content/events/';
	const fileNames = await fs.readdir(dir);

	const events = (
		await Promise.all(
			fileNames.map(async fileName => {
				const file = await fs.readFile(dir + fileName, {
					encoding: 'utf-8',
				});
				const matter = getMatter(file);
				if (!matter) return {};

				const { data } = matter;

				const event: Partial<Event> = {
					slug: fileName.replace('.md', ''),

					lastUpdatedAt: data.last_updated_at,
					lastConfirmedAt: data.last_confirmed_at,

					price: data.price,
					title: data.title,
					description: data.description,
					eventUrl: data.event_url,
					address: data.address,
					categories: data.categories?.map(
						(category: { category: string }) => category?.category,
					),

					start: data.start_datetime,
					end: data.end_datetime,

					repeat: data.repeat,
					repeatEnd: data.repeat_end,
				};

				return event;
			}),
		)
	).filter((event): event is Event => {
		if (isEventComplete(event as Event)) return true;
		else throw new Error('data type mismatch' + event?.slug);
	});

	return events;
};

export const loadEventsForMonth = async (
	referenceDateDuringMonth: Date,
): Promise<Event[]> => {
	const monthStart = startOfMonth(referenceDateDuringMonth);
	const nextMonthStart = addMonths(monthStart, 1);

	const allEvents = await loadAllEvents();

	const oneOffEvents = allEvents.filter(event => {
		return (
			event.repeat === 'once' &&
			((event.start >= monthStart && event.start < nextMonthStart) ||
				(event.end >= monthStart && event.end < nextMonthStart))
		);
	});

	const relevantRepeatingEvents = allEvents.filter(event => {
		return (
			event.repeat !== 'once' &&
			event.start < nextMonthStart &&
			(!event.repeatEnd || event.repeatEnd > monthStart)
		);
	});

	const allRepeatingEvents = relevantRepeatingEvents.reduce<Event[]>(
		(acc, curr) => {
			const earliestDate =
				curr.start > monthStart ? curr.start : monthStart;

			const latestDate =
				curr.repeatEnd && curr.repeatEnd < nextMonthStart
					? curr.repeatEnd
					: nextMonthStart;

			const eventDurationSeconds = differenceInSeconds(
				curr.end,
				curr.start,
			);

			if (curr.repeat === 'weekly') {
				const repeatDay = getDay(curr.start);
				const repeats = [
					getDay(earliestDate) === repeatDay
						? earliestDate
						: nextDay(earliestDate, repeatDay),
				];

				while (repeats[repeats.length - 1] < latestDate) {
					const newRepeat = nextDay(
						repeats[repeats.length - 1],
						repeatDay,
					);
					if (newRepeat < latestDate) {
						repeats.push(newRepeat);
					} else break;
				}

				const newEvents = repeats.map(start => ({
					...curr,
					start,
					end: addSeconds(start, eventDurationSeconds),
				}));

				return [...acc, ...newEvents];
			}

			if (curr.repeat === 'monthly') {
				const repeatDay = getDate(curr.start);
				const newStart = setDate(earliestDate, repeatDay);

				if (newStart < earliestDate || newStart > latestDate)
					return acc;

				return [
					...acc,
					{
						...curr,
						start: newStart,
						end: addSeconds(newStart, eventDurationSeconds),
					},
				];
			}

			return acc;
		},
		[],
	);

	return [...oneOffEvents, ...allRepeatingEvents];
};
