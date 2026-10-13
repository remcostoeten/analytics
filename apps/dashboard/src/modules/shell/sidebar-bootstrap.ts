export const sidebarStorageKey = "spoar.sidebar";
export const sidebarAttribute = "data-sidebar";

export const sidebarBootstrap = `try{if(localStorage.getItem("${sidebarStorageKey}")==="collapsed")document.documentElement.setAttribute("${sidebarAttribute}","collapsed")}catch(e){}`;
