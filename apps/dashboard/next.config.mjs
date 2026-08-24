/** @type {import('next').NextConfig} */
const nextConfig = {
	cacheComponents: true,
	reactCompiler: true,
	typedRoutes: true,
	experimental: {
		inlineCss: true,
	},
	images: {
		unoptimized: true,
	},
};

export default nextConfig;
