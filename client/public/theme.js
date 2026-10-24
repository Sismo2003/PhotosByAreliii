// Dark mode follows the device setting, before the first paint (no white flash). A file, not an
// inline script, so the Content-Security-Policy can stay script-src 'self'.
if (window.matchMedia("(prefers-color-scheme: dark)").matches) document.documentElement.classList.add("dark");
