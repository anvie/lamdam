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
	approvalMode: process.env.APPROVAL_MODE === "true",
};
