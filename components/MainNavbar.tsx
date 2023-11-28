"use client"
import { Avatar, Button, Dropdown, DropdownItem, DropdownMenu, DropdownTrigger, Navbar, NavbarBrand, NavbarContent, NavbarItem } from "@nextui-org/react";
import { signOut, useSession } from "next-auth/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo } from "react";
import { GearIcon } from "./icon/GearIcon";
import LamdamIcon from "./icon/LamdamIcon";
import LogoutIcon from "./icon/LogoutIcon";
import { ThemeSwitch } from "./theme-switch";

const MainNavbar = () => {
    const { data: session } = useSession();
    const user = useMemo(() => session?.user, [session]);
    const router = useRouter();

    if (!user) return null;

    const settings = [
        { title: "All Users", path: "/users" },
        { title: "Annotator Reports", path: "/annotator-reports" },
    ]

    return (
        <Navbar
            position="sticky"
            maxWidth="full"
            isBordered
        >
            <NavbarBrand className="w-fit inline-flex gap-3 items-center divide-x-1 divide-current">
                <Link href="/" className="text-current text-xl font-bold inline-flex gap-3 items-center justify-start w-fit leading-none select-none">
                    <LamdamIcon width={20} height={30} />
                    <span>Lamdam</span>
                </Link>
                <div className="text-current text-xs font-normal pl-3">by Neuversity</div>
            </NavbarBrand>

            <NavbarContent justify="end" className="gap-2 items-center">
                {user.role === 'superuser' && (
                    <NavbarItem>
                        <Dropdown placement="bottom-end">
                            <DropdownTrigger>
                                <Button size="sm" isIconOnly className="hidden md:inline-flex text-center justify-center items-center">
                                    <GearIcon className="w-5 h-5" />
                                </Button>
                            </DropdownTrigger>
                            <DropdownMenu
                                aria-label="Settings"
                                items={settings}
                                onAction={(path) => router.push(String(path))}
                            >
                                {(item) => (
                                    <DropdownItem key={item.path}>
                                        {item.title}
                                    </DropdownItem>
                                )}
                            </DropdownMenu>
                        </Dropdown>
                    </NavbarItem>
                )}
                <NavbarItem>
                    <Button size="sm" isIconOnly>
                        <ThemeSwitch />
                    </Button>
                </NavbarItem>
                {user && (
                    <NavbarItem className="ml-2">
                        <Dropdown placement="bottom-end" radius="sm">
                            <DropdownTrigger>
                                <Avatar
                                    isBordered
                                    as="button"
                                    className="transition-transform"
                                    src={`${user.image}`}
                                />
                            </DropdownTrigger>
                            <DropdownMenu aria-label="Profile Actions" variant="flat">
                                <DropdownItem key="profile" className="h-14 gap-2">
                                    <p className="font-semibold">{user.name}</p>
                                    <p className="font-normal">{user.email}</p>
                                </DropdownItem>
                                <DropdownItem
                                    key="logout"
                                    color="danger"
                                    onClick={() => signOut()}
                                    startContent={<LogoutIcon width="1.4em" height="1.4em" />}
                                >
                                    Log Out
                                </DropdownItem>
                            </DropdownMenu>
                        </Dropdown>
                    </NavbarItem>
                )}
            </NavbarContent>
        </Navbar>
    );
}

export default MainNavbar;