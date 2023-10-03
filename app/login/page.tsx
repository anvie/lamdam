"use client";

import LamdamIcon from "@/components/icon/LamdamIcon";
import NUSidLogo from "@/components/icon/NUSidLogo";
import { ThemeSwitch } from "@/components/theme-switch";
import { Button } from "@nextui-org/button";
import { signIn } from "next-auth/react";

export default function Login() {
  return (
    <div className="w-full h-full flex items-center justify-center">
      <div className="w-[502px] flex flex-col space-y-8">
        <div className="shadow-md rounded-2xl border-2 border-gray-200 relative px-8 py-12">
          <div className="text-current text-4xl font-bold inline-flex space-x-3 items-center justify-center w-full mb-12">
            <LamdamIcon width={30} height={40} />
            <span>Lamdam</span>
          </div>
          <Button
            radius="sm"
            size="lg"
            variant="bordered"
            onClick={() => signIn("nu.id", { callbackUrl: "/" })}
            startContent={<NUSidLogo width={22} height={24} />}
            fullWidth
          >
            Masuk dengan NU.ID
          </Button>
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
