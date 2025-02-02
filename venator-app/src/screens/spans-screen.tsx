import { createSignal, Show } from "solid-js";

import { SpanDetailPane } from "../components/detail-pane";
import { FilterInput } from "../components/filter-input";
import { ScreenHeader } from "../components/screen-header";
import { Input, parseSpanFilter, Span, Timestamp } from '../invoke';
import { Counts, PartialCountFilter, PartialFilter, PositionedSpan, Timespan } from "../models";
import { ColumnDef, INHERENT, parseSpanColumn, Table } from "../components/table";
import { SpanGraph } from "../components/span-graph";

import './spans-screen.css';

export type SpansScreenProps = {
    raw_filter: Input[],
    filter: Input[],
    setFilter: (filter: Input[]) => void,
    addToFilter: (filter: Input[]) => void,
    timespan: Timespan,
    setTimespan: (timespan: Timespan) => void,

    columns: ColumnDef<Span>[],
    columnWidths: string[],
    columnUpdate: (i: number, def: ColumnDef<Span>) => void,
    columnUpdateWidth: (i: number, width: string) => void,
    columnMove: (i: number, to: number) => void,
    columnInsert: (i: number, def: ColumnDef<Span>) => void,
    columnRemove: (i: number) => void,

    getSpans: (filter: PartialFilter, wait?: boolean) => Promise<Span[] | null>,
    getPositionedSpans: (filter: PartialFilter, wait?: boolean) => Promise<PositionedSpan[] | null>,
    getSpanCounts: (filter: PartialCountFilter, wait?: boolean, cache?: boolean) => Promise<Counts | null>,

    live: boolean,
    setLive: (live: boolean) => void,

    selected: Span | null,
    setSelected: (e: Span | null) => void,
};

export function SpansScreen(props: SpansScreenProps) {
    const [hoveredRow, setHoveredRow] = createSignal<Span | null>(null);
    const [count, setCount] = createSignal<[number, boolean]>([0, false]);

    async function getTimestampBefore(timestamp: Timestamp) {
        // TODO: this gets the most recent "created_at" and not the most recent
        // "closed_at" that a user is probably expecting, however at the moment
        // that is more complicated to get and unclear what to return if the
        // timestamp is intersecting a span

        let spans = await props.getSpans({
            order: 'desc',
            start: null,
            end: timestamp,
            limit: 1,
        });

        if (spans == null || spans.length == 0) {
            return null;
        }

        return spans[0].created_at;
    }

    async function getTimestampAfter(timestamp: Timestamp) {
        // TODO: this will return a timestamp "before" the one provided if it
        // intersects a span

        let spans = await props.getSpans({
            order: 'asc',
            start: timestamp,
            end: null,
            limit: 1,
        });

        if (spans == null || spans.length == 0) {
            return null;
        }

        return spans[0].created_at;
    }

    return (<div class="spans-screen">
        <ScreenHeader
            screenKind="spans"
            {...props}
            count={count()}
            countThresholds={[1000, 5000]}
            timeControlsEnabled={true}
            live={props.live}
            setLive={props.setLive}
            getTimestampBefore={getTimestampBefore}
            getTimestampAfter={getTimestampAfter}
        />

        <FilterInput predicates={props.raw_filter} updatePredicates={props.setFilter} parse={parseSpanFilter} />

        <SpanGraph
            filter={props.filter}
            timespan={props.timespan}
            updateTimespan={props.setTimespan}
            getPositionedSpans={props.getPositionedSpans}
            getSpanCounts={props.getSpanCounts}
            setCount={setCount}
            hoveredRow={hoveredRow()}
        />

        <div class="spans-screen-content">
            <Table<Span>
                timespan={props.timespan}
                columns={props.columns}
                columnWidths={props.columnWidths}
                columnUpdate={props.columnUpdate}
                columnUpdateWidth={props.columnUpdateWidth}
                columnMove={props.columnMove}
                columnInsert={props.columnInsert}
                columnRemove={props.columnRemove}
                columnDefault={INHERENT('name')}
                columnMin={3}
                selectedRow={props.selected}
                setSelectedRow={props.setSelected}
                hoveredRow={hoveredRow()}
                setHoveredRow={setHoveredRow}
                getEntries={props.getSpans}
                addToFilter={async f => props.addToFilter(await parseSpanFilter(f))}
                columnParser={parseSpanColumn}
            />

            <Show when={props.selected}>
                {row => <SpanDetailPane
                    timespan={props.timespan}
                    span={row()}
                    updateSelectedRow={props.setSelected}
                    filter={props.filter}
                    addToFilter={async f => props.addToFilter(await parseSpanFilter(f))}
                    addColumn={c => props.columnInsert(-1, parseSpanColumn(c))}
                />}
            </Show>
        </div>
    </div>);
}
