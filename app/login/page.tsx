"use client";

import GoogleLogo from "@/components/icon/GoogleLogo";
import LamdamIcon from "@/components/icon/LamdamIcon";
import NUSidLogo from "@/components/icon/NUSidLogo";
import { ThemeSwitch } from "@/components/theme-switch";
import { Button } from "@nextui-org/button";
import { Spinner } from "@nextui-org/react";
import { BuiltInProviderType } from "next-auth/providers";
import { ClientSafeProvider, LiteralUnion, getProviders, signIn } from "next-auth/react";
import { useEffect, useState } from "react";

export default function Login() {
    const [providers, setProviders] = useState<Record<LiteralUnion<BuiltInProviderType>, ClientSafeProvider> | null>(null)

    useEffect(() => {
        async function fetchProviders() {
            const _providers = await getProviders()
            setProviders(_providers)
        }
        fetchProviders()
    }, [])

    return (
        <div className="w-full h-screen flex items-center justify-center">
            <div className="w-[502px] flex flex-col space-y-8">
                <div className="shadow-md rounded-2xl border-2 border-gray-200 relative px-8 py-12">
                    <div className="text-current text-4xl font-bold inline-flex space-x-3 items-center justify-center w-full mb-12">
                        <LamdamIcon width={30} height={40} />
                        <span>Lamdam</span>
                    </div>
                    <div className="flex flex-col space-y-2">
                        {!providers && (
                            <Spinner />
                        )}
                        {providers && Object.values(providers).map((provider) => {
                            return (
                                <Button
                                    key={provider.name}
                                    radius="sm"
                                    size="lg"
                                    variant="bordered"
                                    onClick={() => signIn(provider.id, { callbackUrl: '/' })}
                                    startContent={(() => {
                                        if (provider.id === 'nu.id') {
                                            return <NUSidLogo width={22} height={24} />
                                        } else if (provider.id === 'google') {
                                            return <GoogleLogo width={22} height={22} />
                                        }
                                    })()}
                                    fullWidth
                                >
                                    {`Masuk dengan ${provider.name}`}
                                </Button>
                            )
                        })}
                    </div>
                </div>
                <div className="text-center">
                    <div className="mb-4 opacity-90 text-xs font-normal leading-none text-center">
                        Powered by{" "}
                        <span className="opacity-80 text-xs font-medium">Neuversity</span>
                    </div>
                    <Button size="sm" isIconOnly>
                        <ThemeSwitch />
                    </Button>
                </div>
            </div>
        </div>
    );
}
