"use client";
import { useModal } from "@/components/hooks/useModal";
import EditUserModal from "@/components/modals/EditUserModal";
import * as apiClient from "@/lib/FetchWrapper";
import "@/lib/stringutil";
import { getDaysInCurrentMonth } from "@/lib/timeutil";
import { Result, Statistic } from "@/types";
import { Button, Chip, ChipProps, Dropdown, DropdownItem, DropdownMenu, DropdownTrigger, Pagination, Spinner, Table, TableBody, TableCell, TableColumn, TableHeader, TableRow, User as UserProfile } from "@nextui-org/react";
import moment from "moment";
import { User } from "next-auth";
import { useSession } from "next-auth/react";
import { Confirm, Loading, Notify } from "notiflix";
import React, { useCallback, useMemo, useState } from "react";
import { HiEllipsisHorizontal } from "react-icons/hi2";
import useSWR from "swr";

const columns = [
    { name: "Name", uid: "name" },
    { name: "Daily Target", uid: "dailyTarget" },
    { name: "Monthly Target", uid: "monthlyTarget" },
    { name: "Total Records", uid: "dsCount" },
    { name: "Role", uid: "role" },
    { name: "Last Activity", uid: "lastActivity" },
    { name: "Registered At", uid: "registeredAt" },
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

async function modifyUser(method: string, url: string, body: any) {
    try {
        const res = await fetch(url, {
            method,
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(body)
        })

        const data = await res.json()
        if (data.error) throw new Error(data.error)

        return data
    } catch (error) {
        throw error
    }
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

    const changeUserStatus = async (userId: string, status: string, term: string) => {
        Confirm.show(
            "Confirm Action",
            `Are you sure you want to ${term} this user?`,
            "Yes",
            "No",
            async () => {
                try {
                    Loading.hourglass('Processing...')
                    await modifyUser('PATCH', `/api/users/${userId}`, { status })
                    Notify.success(`User ${status === 'active' ? 'activated' : 'blocked'} successfully`)
                } catch (error) {
                    Notify.failure(`Failed to ${term} user`)
                } finally {
                    Loading.remove()
                }
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

                const dailyTarget = Math.round(monthlyTarget / days).toDisplay();

                return (
                    <div className="flex flex-col">
                        <p className="font-medium capitalize">{dailyTarget}</p>
                        <p className="text-bold text-sm capitalize text-default-400">Records</p>
                    </div>
                )
            } else if (columnKey === 'monthlyTarget') {
                if (monthlyTarget === 0) return (<span>-</span>);

                return (
                    <div className="flex flex-col">
                        <p className="font-medium capitalize">{monthlyTarget.toDisplay()}</p>
                        <p className="text-bold text-sm capitalize text-default-400">Records</p>
                    </div>
                )
            } else if (columnKey === 'dsCount') {
                return (
                    <div className="flex flex-col">
                        <p className="font-medium capitalize">{user.stats.total.toDisplay()}</p>
                        <p className="text-bold text-sm capitalize text-default-400">Records</p>
                    </div>
                )
            } else if (columnKey === 'lastActivity' || columnKey === 'registeredAt') {
                return (
                    <div className="flex flex-col">
                        <p className="font-medium capitalize">{cellValue ? moment(Number(cellValue)).format('YYYY/MM/DD HH:mm') : '-'}</p>
                    </div>
                )
            }

            return (
                <div className="flex flex-col">
                    <p className="font-medium capitalize">-</p>
                </div>
            )
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
                                        user.id,
                                        user.status === 'blocked' ? 'active' : 'blocked',
                                        user.status === 'blocked' ? 'activate' : 'block',
                                    );
                                } else if(key === 'delete') {
                                    Confirm.show(
                                        "Confirm Action",
                                        `Are you sure you want to delete this user?`,
                                        "Yes",
                                        "No",
                                        async () => {
                                            try {
                                                Loading.hourglass('Deleting user...')
                                                await modifyUser('DELETE', `/api/users/${user.id}`, {})
                                                Notify.success(`User deleted successfully`)
                                            } catch (error) {
                                                Notify.failure(`Failed to delete user`)
                                            } finally {
                                                Loading.remove()
                                            }
                                        }
                                    );
                                }
                            }}
                        >
                            <DropdownItem key="edit">Edit User</DropdownItem>
                            <DropdownItem key="showReports">Show Reports</DropdownItem>
                            {user.status === 'active' ? (
                                <DropdownItem key="setStatus" showDivider className="text-warning" color="warning">
                                    Block User
                                </DropdownItem>
                            ) : (
                                <DropdownItem key="setStatus" showDivider className="text-success" color="success">
                                    Activate User
                                </DropdownItem>
                            )}
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