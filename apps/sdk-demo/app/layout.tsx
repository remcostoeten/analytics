import type { Metadata } from "next";
import { Analytics } from "./analytics";
import { Nav } from "@/shared/ui";

export const metadata: Metadata = {
	title: "Analytics SDK Demo",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
	return (
		<html lang="en">
			<body style={{ margin: 0 }}>
				<Nav />
				{children}
				<Analytics
					projectId="sdk-demo"
					debug={process.env.NODE_ENV === "development"}
					trackClicks
					trackOutbound
					trackForms
					trackErrors
				/>
			</body>
		</html>
	);
}
