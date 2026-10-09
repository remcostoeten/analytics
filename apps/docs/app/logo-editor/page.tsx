import type { Metadata } from "next";

import { LogoEditor } from "@/components/logo-editor/logo-editor";

export const metadata: Metadata = {
  title: "Logo editor",
  robots: { index: false, follow: false },
};

export default function LogoEditorPage() {
  return <LogoEditor />;
}
