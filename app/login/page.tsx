"use client";

import GoogleLogo from "@/components/icon/GoogleLogo";
import LamdamIcon from "@/components/icon/LamdamIcon";
import NUSidLogo from "@/components/icon/NUSidLogo";
import { ThemeSwitch } from "@/components/theme-switch";
import { Button } from "@nextui-org/button";
import { Spinner } from "@nextui-org/react";
import { BuiltInProviderType } from "next-auth/providers";
import { ClientSafeProvider, LiteralUnion, getProviders, signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { HiOutlineInformationCircle } from "react-icons/hi2";

export default function Login() {
    const searchParams = useSearchParams()
    const failedReason = searchParams?.get('reason')
    const error = searchParams?.get('error')
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
                    {failedReason?.toLowerCase() === 'blocked' && (
                        <div className="w-full px-4 py-3.5 bg-rose-100 rounded-lg justify-start items-start gap-2 flex flex-col mb-4 text-red-700">
                            <div className="self-stretch justify-start items-center gap-2 inline-flex ">
                                <HiOutlineInformationCircle className="w-6 h-6 text-red-700" />
                                <div className="grow shrink basis-0 text-red-700 text-base font-semibold leading-normal">Your Account has been Blocked</div>
                            </div>
                            <div className="text-sm font-normal leading-tight">Please contact Administrator!</div>
                        </div>
                    )}
                    {error === "OAuthAccountNotLinked" && (
                        <div className="w-full px-4 py-3.5 bg-orange-100 rounded-lg justify-start items-start gap-2 flex flex-col mb-4 text-orange-700">
                            <div className="self-stretch justify-start items-center gap-2 inline-flex ">
                                <HiOutlineInformationCircle className="w-6 h-6 text-orange-700" />
                                <div className="grow shrink basis-0 text-orange-700 text-base font-semibold leading-normal">Account is not Linked</div>
                            </div>
                            <div className="text-sm font-normal leading-tight">The selected provider is not linked with any accounts</div>
                        </div>
                    )}
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
