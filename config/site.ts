export type SiteConfig = typeof siteConfig;

export const siteConfig = {
	name: "Lamdam",
	description: "LLM Data Manager",
	navItems: [

	],
	navMenuItems: [

	],
	links: {

	},
	approvalMode: process.env.NEXT_PUBLIC_APPROVAL_MODE === "true",
};
