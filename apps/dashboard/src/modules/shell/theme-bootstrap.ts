export const themeStorageKey = "spoar.theme";
export const themeAttribute = "data-theme";

export const themeBootstrap = `try{var t=null;try{t=localStorage.getItem("${themeStorageKey}")}catch(e){}if(t!=="light"&&t!=="dark")t=matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light";document.documentElement.setAttribute("${themeAttribute}",t)}catch(e){}`;
