// Language: English at /, Spanish at /es/. Loaded in <head> before anything paints (a classic
// script, not inline, so the Content-Security-Policy stays 'self').
// - First visit to an English page with a Spanish browser (or Spanish chosen before) → /es/ twin.
// - An explicit /es/ URL is always respected. The switch remembers the choice in the key the client
//   portal uses too (client/src/i18n/config.js), so /client/ opens in the same language.
(function () {
  var KEY = "pba-client-lang";
  var path = location.pathname;
  var onEs = /^\/es(\/|$)/.test(path);
  var saved = null;
  try { saved = localStorage.getItem(KEY); } catch (e) {}
  var wantsEs = saved ? saved.indexOf("es") === 0 : (navigator.languages || [navigator.language || ""]).some(function (l) { return /^es\b/i.test(l); });
  if (!onEs && wantsEs) {
    location.replace("/es" + (path === "/" ? "/" : path) + location.search + location.hash);
    return;
  }
  document.addEventListener("click", function (ev) {
    var a = ev.target && ev.target.closest && ev.target.closest("[data-set-lang]");
    if (!a) return;
    try { localStorage.setItem(KEY, a.getAttribute("data-set-lang")); } catch (e) {}
  });
})();
