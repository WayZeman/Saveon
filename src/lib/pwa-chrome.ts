export function applyPwaChrome(resolved: "dark" | "light") {
  if (typeof document === "undefined") return;

  const statusBar = document.querySelector('meta[name="apple-mobile-web-app-status-bar-style"]');
  if (statusBar) {
    statusBar.setAttribute("content", resolved === "light" ? "default" : "black-translucent");
  }

  let themeColor = document.querySelector('meta[name="theme-color"][data-app-theme]') as HTMLMetaElement | null;
  if (!themeColor) {
    themeColor = document.createElement("meta");
    themeColor.setAttribute("name", "theme-color");
    themeColor.setAttribute("data-app-theme", "true");
    document.head.appendChild(themeColor);
  }
  themeColor.setAttribute("content", resolved === "light" ? "#f8fbff" : "#050507");
}
