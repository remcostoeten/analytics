import type { Metadata } from "next";
import { Analytics } from "./analytics";

export const metadata: Metadata = {
	title: "Analytics Example",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
	return (
		<html lang="en">
			<body>
				{children}
				{/* Automatic: pageviews, web vitals, scroll depth, time on page */}
				<Analytics projectId="example-app" debug={process.env.NODE_ENV === "development"} />
			</body>
		</html>
	);
}
