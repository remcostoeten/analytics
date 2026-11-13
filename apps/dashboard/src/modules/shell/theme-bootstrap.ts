export const themeStorageKey = "theme";
const legacyThemeStorageKey = "spoar.theme";
export const themeAttribute = "data-theme";

export const themeBootstrap = `try{var s=null;try{s=localStorage.getItem("${themeStorageKey}");var o=localStorage.getItem("${legacyThemeStorageKey}");if(o!==null){if(s===null&&(o==="light"||o==="dark")){localStorage.setItem("${themeStorageKey}",o);s=o}localStorage.removeItem("${legacyThemeStorageKey}")}}catch(e){}var t=s==="light"||s==="dark"?s:matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light";var d=document.documentElement;d.classList.remove("light","dark");d.classList.add(t);d.setAttribute("${themeAttribute}",t);d.style.colorScheme=t}catch(e){}`;
