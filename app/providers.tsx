"use client";

import { ModalProvider } from "@/components/hooks/useModal";
import { NextUIProvider } from "@nextui-org/system";
import { Session } from "next-auth";
import { SessionProvider } from "next-auth/react";
import { ThemeProvider as NextThemesProvider } from "next-themes";
import { ThemeProviderProps } from "next-themes/dist/types";
import * as React from "react";

export interface ProvidersProps {
	children: React.ReactNode;
	themeProps?: ThemeProviderProps;
	session: Session | null;
}

export function Providers({ children, themeProps, session }: ProvidersProps) {
	const [loaded, setLoaded] = React.useState(false)

	React.useEffect(() => {
		setLoaded(true)
	}, [])

	if (!loaded) {
		return <div />
	}
	return (
		<SessionProvider session={session}>
			<NextUIProvider>
				<NextThemesProvider {...themeProps}>
					<ModalProvider>
						{children}
					</ModalProvider>
				</NextThemesProvider>
			</NextUIProvider>
		</SessionProvider>
	);
}
