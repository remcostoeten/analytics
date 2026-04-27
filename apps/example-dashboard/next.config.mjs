/** @type {import('next').NextConfig} */
const nextConfig = {
	experimental: {
		optimizePackageInputs: true,
	},
	typescript: {
		ignoreBuildErrors: true,
	},
	images: {
		unoptimized: true,
	},
	cache: {
		directory: '.next/cache',
	},
};

export default nextConfig;
