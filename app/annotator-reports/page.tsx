"use client"
import useSimpleUsers from '@/components/hooks/useSimpleUsers';
import { get } from '@/lib/FetchWrapper';
import { Avatar, Select, SelectItem, Spinner } from '@nextui-org/react';
import { cn } from '@nextui-org/system';
import { useInfiniteScroll } from '@nextui-org/use-infinite-scroll';
import moment from 'moment';
import { Dispatch, FC, SetStateAction, useEffect, useMemo, useState } from 'react';
import { Calendar, DateHeaderProps, ToolbarProps, Views, momentLocalizer } from "react-big-calendar";
import "react-big-calendar/lib/css/react-big-calendar.css";
import { HiCheck, HiCircleStack, HiOutlineClock, HiXMark } from "react-icons/hi2";
import { Key } from 'swr';
import useSWRMutation from 'swr/mutation';

const InputCreator = ({ state }: { state: [string | null, Dispatch<SetStateAction<string | null>>] }) => {
    const [isOpen, setIsOpen] = useState(false);
    const { items, hasMore, isLoading, onLoadMore } = useSimpleUsers(["corrector", "annotator"]);
    const [, setSelected] = state;

    const [, scrollerRef] = useInfiniteScroll({
        hasMore,
        isEnabled: isOpen,
        shouldUseLoader: false,
        onLoadMore,
    });

    return (
        <Select
            isMultiline
            fullWidth
            disallowEmptySelection={false}
            isLoading={isLoading}
            items={items}
            scrollRef={scrollerRef}
            onOpenChange={setIsOpen}
            onSelectionChange={(key) => {
                const selectedId = (key as Set<string>).values().next().value;
                setSelected(selectedId)
            }}
            aria-labelledby="creators"
            variant="flat"
            selectionMode="single"
            placeholder="Select creators"
            size="sm"
            className="max-w-full md:max-w-xs w-full md:w-72"
            classNames={{
                trigger:
                    "border hover:opacity-75 rounded-lg overflow-hidden dark:border-none dark:group-data-[focus=true]:bg-[#374151] dark:bg-[#374151] bg-[#F9FAFB] shadow-none",
                popoverContent: "dark:bg-[#374151] bg-[#F9FAFB]",
                value: "font-medium text-current",
            }}
            renderValue={(users) => {
                const user = users[0]?.data;
                if (!user) return undefined;

                return (
                    <div className="flex gap-2 items-center">
                        <Avatar alt={user.name} className="flex-shrink-0" size="sm" src={user.image} />
                        <div className="flex flex-col">
                            <span className="text-small">{user.name}</span>
                        </div>
                    </div>
                )
            }}
        >
            {(user) => (
                <SelectItem
                    key={user.id}
                    textValue={user.name}
                    className="dark:hover:bg-white/10"
                >
                    <div className="flex gap-2 items-center">
                        <Avatar alt={user.name} className="flex-shrink-0" size="sm" src={user.image} />
                        <div className="flex flex-col">
                            <span className="text-small">{user.name}</span>
                        </div>
                    </div>
                </SelectItem>
            )}
        </Select>
    );
}

interface TimeSeries {
    date: string;
    stats: {
        pending: number;
        approved: number;
        rejected: number;
        total: number;
        isAchieved: boolean;
    };
}

interface StatsSeries {
    timeSeries: TimeSeries[];
    daysAchieved: number;
    daysNotAchieved: number;
    totalRecords: number;
    pendingRecords: number;
    approvedRecords: number;
    rejectedRecords: number;
}

type Result = { result: StatsSeries }

type Arg = { date: string } | undefined

const fetcher = (key: string, options: { arg: Arg }) => {
    const url = new URL(key, window.location.origin)
    if (options.arg?.date) {
        url.searchParams.set('date', options.arg.date)
    }

    return get(url.toString())
}

const useMutation = (key: Key) => useSWRMutation<Result, any, Key, Arg>(key, fetcher)

const ReportPage = () => {
    const [selectedUser, setSelectedUser] = useState<string | null>(null);

    const { data, trigger: loadStatsSeries, isMutating } = useMutation(`/api/users/${selectedUser}/stats-series`)

    useEffect(() => {
        if (selectedUser) {
            loadStatsSeries()
        }

    }, [selectedUser, loadStatsSeries])

    const { stats, timeSeries } = useMemo(() => {
        const result = data?.result

        return {
            stats: {
                daysAchieved: result?.daysAchieved ?? 0,
                daysNotAchieved: result?.daysNotAchieved ?? 0,
                totalRecords: result?.totalRecords ?? 0,
                pendingRecords: result?.pendingRecords ?? 0,
                approvedRecords: result?.approvedRecords ?? 0,
                rejectedRecords: result?.rejectedRecords ?? 0,
            },
            timeSeries: result?.timeSeries ?? [],
        }
    }, [data])

    return (
        <div className="h-[calc(100vh-65px)] overflow-hidden">
            <div className="border-b border-b-divider w-full px-6 py-6 flex items-center gap-5">
                <div className="text-current text-2xl font-bold">User Reports</div>
                <InputCreator state={[selectedUser, setSelectedUser]} />
                {isMutating && (
                    <Spinner size="md" color="secondary" />
                )}
            </div>
            <div className="grid grid-cols-12 min-h-full max-h-full overflow-y-auto divide-x-1 divide-divider">
                <div className="col-span-3 h-full px-5 py-4 flex flex-col gap-3">
                    <div className="grid grid-cols-2 gap-3">
                        <div className="flex flex-col gap-1 bg-success/20 border border-success rounded-lg px-5 py-3.5">
                            <div className="text-success text-2xl font-bold leading-none">{stats.daysAchieved}</div>
                            <div className="text-current text-sm font-normal">Days achieved</div>
                        </div>
                        <div className="flex flex-col gap-1 bg-danger/20 border border-danger rounded-lg px-5 py-3.5">
                            <div className="text-danger text-2xl font-bold leading-none">{stats.daysNotAchieved}</div>
                            <div className="text-current text-sm font-normal">Days not achieved</div>
                        </div>
                    </div>
                    <div className="flex justify-between items-center bg-[#F9FAFB] dark:bg-slate-800 border border-divider rounded-lg px-5 py-3.5">
                        <div className="flex flex-col gap-1">
                            <div className="text-current text-2xl font-bold leading-none">{stats.totalRecords}</div>
                            <div className="text-current text-sm font-normal">Records entered</div>
                        </div>
                        <div>
                            <HiCircleStack className="w-10 h-10" />
                        </div>
                    </div>
                    <div className="flex justify-between items-center bg-[#F9FAFB] dark:bg-slate-800 border border-divider rounded-lg px-5 py-3.5">
                        <div className="flex flex-col gap-1">
                            <div className="text-current text-2xl font-bold leading-none">{stats.approvedRecords}</div>
                            <div className="text-current text-sm font-normal">Records approved</div>
                        </div>
                        <div className="w-10 h-10 bg-success p-2 text-white rounded-xl">
                            <HiCheck className="w-full h-full" strokeWidth={1.5} />
                        </div>
                    </div>
                    <div className="flex justify-between items-center bg-[#F9FAFB] dark:bg-slate-800 border border-divider rounded-lg px-5 py-3.5">
                        <div className="flex flex-col gap-1">
                            <div className="text-current text-2xl font-bold leading-none">{stats.rejectedRecords}</div>
                            <div className="text-current text-sm font-normal">Records rejected</div>
                        </div>
                        <div className="w-10 h-10 bg-danger p-2 text-white rounded-xl">
                            <HiXMark className="w-full h-full" strokeWidth={1.5} />
                        </div>
                    </div>
                    <div className="flex justify-between items-center bg-[#F9FAFB] dark:bg-slate-800 border border-divider rounded-lg px-5 py-3.5">
                        <div className="flex flex-col gap-1">
                            <div className="text-current text-2xl font-bold leading-none">{stats.pendingRecords}</div>
                            <div className="text-current text-sm font-normal">Records pending</div>
                        </div>
                        <div className="w-10 h-10 bg-warning p-2 text-white rounded-xl">
                            <HiOutlineClock className="w-full h-full" strokeWidth={1.5} />
                        </div>
                    </div>
                </div>
                <div className="col-span-9 max-h-full p-4 overflow-y-auto">
                    <CalendarView
                        series={timeSeries}
                        onNavigate={(newDate) => {
                            const date = moment(newDate).format('YYYY-MM-DD')
                            loadStatsSeries({ date })
                        }}
                    />
                </div>
            </div>
        </div>
    );
}

const CalendarView: FC<{ series?: TimeSeries[], onNavigate?: (newDate: Date) => void }> = ({ series = [], onNavigate }) => {
    const localizer = momentLocalizer(moment)

    const CustomHeader = ({ label }: { label: string }) => (<div className="py-5 text-currrent font-medium text-sm">{label}</div>)
    const CustomDateHeader = ({ label, isOffRange, date }: DateHeaderProps) => {
        const today = moment().isSame(date, 'day')

        return (
            <div
                className={cn("p-1.5 font-semibold text-xs text-left", {
                    ["text-slate-700 dark:text-white"]: !isOffRange && !today,
                    ["text-danger font-medium"]: today,
                    ["text-gray-300 dark:text-primary"]: isOffRange,
                })}
            >
                {label}
            </div>
        )
    }
    const CustomToolbar = ({ label, onNavigate }: ToolbarProps) => {
        const [month, year] = label.split(' ') as [string, string]

        return (
            <div className="w-full text-center pl-3.5 py-0 flex justify-between items-center pb-6">
                <div className="flex gap-3 items-center">
                    <div className="text-center text-current text-3xl font-black font-lato leading-9">{month}</div>
                    <div className="text-center text-current text-3xl font-light font-lato leading-9">{year}</div>
                </div>

                <div className="flex items-center gap-2">
                    <button className="hover:bg-opacity-75 rounded-md p-2 text-primary border-opacity-50 hover:bg-primary hover:text-white transition-all ease-in-out" onClick={() => onNavigate('PREV')}>
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
                        </svg>
                    </button>
                    <button className="hover:bg-opacity-75 rounded-md p-2 text-primary border-opacity-50 hover:bg-primary hover:text-white transition-all ease-in-out" onClick={() => onNavigate('NEXT')}>
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                        </svg>
                    </button>
                </div>
            </div>
        )
    }

    return (
        <div className="h-[77vh] bg-background rounded-lg">
            <Calendar
                culture="id-ID"
                localizer={localizer}
                defaultView={Views.MONTH}
                defaultDate={moment().toDate()}
                views={[Views.MONTH]}
                min={moment().toDate()}
                max={moment().add(1, 'year').toDate()}
                components={{
                    toolbar: CustomToolbar,
                    month: {
                        header: CustomHeader,
                        dateHeader: CustomDateHeader,
                        event: ({ event: { resource: r, title } }) => {
                            return (
                                <div className="flex flex-col gap-0.5 self-stretch">
                                    <div data-achieved={r.isAchieved} className="text-xs font-medium data-[achieved=true]:bg-success bg-danger text-white rounded-md px-2 py-1">{title}</div>
                                    <div className="text-xs font-medium text-black dark:text-white bg-success bg-opacity-25 rounded-md px-2 py-1">{r.approved} Approved</div>
                                    <div className="text-xs font-medium text-black dark:text-white bg-danger bg-opacity-25 rounded-md px-2 py-1">{r.rejected} Rejected</div>
                                    <div className="text-xs font-medium text-black dark:text-white bg-warning bg-opacity-25 rounded-md px-2 py-0.5">{r.pending} Pending</div>
                                </div>
                            )
                        },
                    },
                }}
                events={series.map(({ date, stats }, i) => {
                    const start = moment(date).toDate()

                    return {
                        id: i,
                        title: stats.isAchieved ? 'Achieved' : 'Not Achieved',
                        start: start,
                        end: start,
                        allDay: true,
                        resource: stats,
                    }
                })}
                onNavigate={(newDate) => onNavigate?.(newDate)}
                showAllEvents={true}
                doShowMoreDrillDown={true}
                selectable={false}
                popup={true}
                timeslots={2}
            />
        </div>
    );
}

export default ReportPage;