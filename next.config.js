/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  publicRuntimeConfig: {
    approvalMode: process.env.APPROVAL_MODE === "true",
  },
};

module.exports = nextConfig;
