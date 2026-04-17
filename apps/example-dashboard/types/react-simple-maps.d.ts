declare module "react-simple-maps" {
	import { ComponentType, ReactNode, CSSProperties } from "react";

	interface ProjectionConfig {
		rotate?: [number, number, number];
		center?: [number, number];
		scale?: number;
	}

	interface ComposableMapProps {
		projectionConfig?: ProjectionConfig;
		width?: number;
		height?: number;
		style?: CSSProperties;
		children?: ReactNode;
	}

	interface GeographiesProps {
		geography: string | object;
		children: (props: { geographies: Geography[] }) => ReactNode;
	}

	interface Geography {
		id: string | number;
		rsmKey: string;
		properties: {
			name?: string;
			[key: string]: unknown;
		};
	}

	interface GeographyProps {
		geography: Geography;
		key?: string;
		fill?: string;
		stroke?: string;
		strokeWidth?: number;
		style?: {
			default?: CSSProperties;
			hover?: CSSProperties;
			pressed?: CSSProperties;
		};
		onMouseEnter?: (event: React.MouseEvent) => void;
		onMouseMove?: (event: React.MouseEvent) => void;
		onMouseLeave?: () => void;
		onClick?: () => void;
	}

	export const ComposableMap: ComponentType<ComposableMapProps>;
	export const Geographies: ComponentType<GeographiesProps>;
	export const Geography: ComponentType<GeographyProps>;
}
