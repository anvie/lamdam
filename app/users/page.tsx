"use client";
import { useModal } from "@/components/hooks/useModal";
import EditUserModal from "@/components/modals/EditUserModal";
import * as apiClient from "@/lib/FetchWrapper";
import { getDaysInCurrentMonth } from "@/lib/timeutil";
import { Result, Statistic } from "@/types";
import { Button, Chip, ChipProps, Dropdown, DropdownItem, DropdownMenu, DropdownTrigger, Pagination, Spinner, Table, TableBody, TableCell, TableColumn, TableHeader, TableRow, User as UserProfile } from "@nextui-org/react";
import { User } from "next-auth";
import { useSession } from "next-auth/react";
import Notiflix from "notiflix";
import React, { useCallback, useMemo, useState } from "react";
import { HiEllipsisHorizontal } from "react-icons/hi2";
import useSWR from "swr";

const columns = [
    { name: "Name", uid: "name" },
    { name: "Daily Target", uid: "dailyTarget" },
    { name: "Monthly Target", uid: "monthlyTarget" },
    { name: "Total Datasets", uid: "dsCount" },
    { name: "Role", uid: "role" },
    { name: "Status", uid: "status" },
    { name: "Actions", uid: "actions" },
];

const statusColorMap: Record<string, ChipProps["color"]> = {
    active: "success",
    blocked: "danger",
};

type UserWithStats = User & {
    stats: Statistic
}

const UsersPage = () => {
    const rowsPerPage = 10;
    const [page, setPage] = useState(1);
    const { data, error, isLoading } = useSWR<Result<UserWithStats>>(
        `/api/users?page=${page}&perPage=${rowsPerPage}`,
        apiClient.get,
        { refreshInterval: 1000 },
    );
    const { showModal } = useModal()

    const session = useSession()

    const pages = useMemo(() => {
        return data?.result.count ? Math.ceil(data.result.count / rowsPerPage) : 0;
    }, [data?.result.count, rowsPerPage]);

    const changeUserStatus = async (status: string, term: string) => {
        Notiflix.Confirm.show(
            "Confirm Action",
            `Are you sure you want to ${term} this user?`,
            "Yes",
            "No",
            async () => {
            }
        );
    }

    const renderCell = useCallback((user: UserWithStats, columnKey: React.Key) => {
        const cellValue = user[columnKey as keyof UserWithStats];
        const days = getDaysInCurrentMonth()

        if (typeof cellValue !== 'string' && columnKey !== 'actions') {
            const monthlyTarget = (user.meta?.monthlyTarget || 0)

            if (columnKey === 'dailyTarget') {
                if (monthlyTarget === 0) return (<span>-</span>);

                const dailyTarget = Math.round(monthlyTarget / days);

                return (
                    <div className="flex flex-col">
                        <p className="font-medium capitalize">{dailyTarget}</p>
                        <p className="text-bold text-sm capitalize text-default-400">Datasets</p>
                    </div>
                )
            } else if (columnKey === 'monthlyTarget') {
                if (monthlyTarget === 0) return (<span>-</span>);

                return (
                    <div className="flex flex-col">
                        <p className="font-medium capitalize">{monthlyTarget}</p>
                        <p className="text-bold text-sm capitalize text-default-400">Datasets</p>
                    </div>
                )
            } else if (columnKey === 'dsCount') {
                return (
                    <div className="flex flex-col">
                        <p className="font-medium capitalize">{user.stats.total}</p>
                        <p className="text-bold text-sm capitalize text-default-400">Datasets</p>
                    </div>
                )
            }

            return null;
        }

        switch (columnKey) {
            case "name":
                return (
                    <UserProfile
                        avatarProps={{ radius: "lg", src: user.image! }}
                        description={user.email}
                        name={String(cellValue)}
                    >
                        {user.email}
                    </UserProfile>
                );
            case "role":
                return (
                    <div className="flex flex-col">
                        <p className="font-medium capitalize">{user.role}</p>
                    </div>
                );
            case "status":
                return (
                    <Chip className="capitalize" color={statusColorMap[user.status!]} size="sm" variant="flat">
                        {String(cellValue)}
                    </Chip>
                );
            case "actions":
                return (
                    <Dropdown placement="bottom-end" showArrow>
                        <DropdownTrigger>
                            <Button
                                variant="bordered"
                                isIconOnly
                                isDisabled={user.id === session.data?.user?.id}
                            >
                                <HiEllipsisHorizontal />
                            </Button>
                        </DropdownTrigger>
                        <DropdownMenu
                            aria-label="Action event example"
                            onAction={(key) => {
                                if (key === 'edit') {
                                    return showModal('Edit User', EditUserModal, {
                                        user,
                                        size: 'md',
                                        isDissmissable: true,
                                        placement: 'center',
                                    });
                                } else if (key === 'setStatus') {
                                    return changeUserStatus(
                                        user.status === 'blocked' ? 'active' : 'blocked',
                                        user.status === 'blocked' ? 'activate' : 'block',
                                    );
                                }
                            }}
                        >
                            <DropdownItem key="edit">Edit User</DropdownItem>
                            <DropdownItem key="showReports">Show Reports</DropdownItem>
                            <DropdownItem key="setStatus" showDivider className="text-warning" color="warning">
                                Block User
                            </DropdownItem>
                            <DropdownItem key="delete" className="text-danger" color="danger">
                                Delete User
                            </DropdownItem>
                        </DropdownMenu>
                    </Dropdown>
                );
            default:
                return null;
        }
    }, [session.data?.user?.id, showModal]);

    return (
        <div className="p-8">
            <Table
                aria-label="All Users"
                shadow="none"
                radius="lg"
                classNames={{
                    base: "border border-divider rounded-lg",
                    th: "dark:bg-[#374151] capitalize",
                }}
                bottomContent={
                    pages > 0 ? (
                        <div className="flex w-full justify-center">
                            <Pagination
                                isCompact
                                showControls
                                color="primary"
                                page={page}
                                total={pages}
                                onChange={(page) => setPage(page)}
                            />
                        </div>
                    ) : null
                }
            >
                <TableHeader columns={columns}>
                    {(column) => (
                        <TableColumn key={column.uid}>
                            {column.uid === 'actions' ? null : column.name}
                        </TableColumn>
                    )}
                </TableHeader>
                <TableBody
                    items={data?.result.entries ?? []}
                    loadingContent={<Spinner />}
                    loadingState={isLoading ? "loading" : "idle"}
                    emptyContent={"No users to display."}
                >
                    {(item) => (
                        <TableRow key={item.id}>
                            {(columnKey) => (
                                <TableCell className={columnKey === 'actions' ? 'flex justify-end' : ''}>
                                    {renderCell(item, columnKey)}
                                </TableCell>
                            )}
                        </TableRow>
                    )}
                </TableBody>
            </Table>
        </div>
    );
}

export default UsersPage;