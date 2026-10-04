export type FontStyle = "geist" | "mono" | "system" | "serif" | "pixel";

export const fontStyles: { value: FontStyle; label: string }[] = [
  { value: "geist", label: "Geist" },
  { value: "mono", label: "Mono" },
  { value: "system", label: "System" },
  { value: "serif", label: "Serif" },
  { value: "pixel", label: "Pixel" },
];

export const fontStorageKey = "spoar-docs-font";

export const fontScript = `try{var f=localStorage.getItem(${JSON.stringify(fontStorageKey)});if(f&&f!=="geist")document.documentElement.dataset.font=f}catch(e){}`;
