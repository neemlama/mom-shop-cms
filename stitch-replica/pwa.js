/* Registers SW + handles Android install prompt. Include on every page. */
(function () {
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(function () {});
  let deferred = null;
  window.addEventListener('beforeinstallprompt', function (e) {
    e.preventDefault();
    deferred = e;
    document.querySelectorAll('[data-install-btn]').forEach(function (b) { b.style.display = ''; });
  });
  window.addEventListener('appinstalled', function () { deferred = null; });
  window.momShopInstall = function () {
    if (deferred) { deferred.prompt(); return; }
    location.href = '/install.html';
  };
})();
