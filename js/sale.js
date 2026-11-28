(function () {
  var START = Date.UTC(2026, 10, 28, 13, 0, 0);
  var END = Date.UTC(2026, 11, 1, 13, 0, 0);
  var CODE = 'BSKCYBERMON50';

  var boxes = document.querySelectorAll('.cyber-strip');
  var side = document.querySelector('.panel-promo');
  var sideHref = side ? side.getAttribute('href') : '';
  var sideHtml = side ? side.innerHTML : '';
  if (!boxes.length && !side) return;

  function pad(n) { return (n < 10 ? '0' : '') + n; }

  function left(ms, withSeconds) {
    var s = Math.max(0, Math.floor(ms / 1000));
    var d = Math.floor(s / 86400);
    var h = Math.floor((s % 86400) / 3600);
    var m = Math.floor((s % 3600) / 60);
    var out = (d ? d + 'd ' : '') + h + 'h ' + pad(m) + 'm';
    return withSeconds ? out + ' ' + pad(s % 60) + 's' : out;
  }

  function linkHtml(box) {
    var href = box.getAttribute('data-link');
    return href ? ' &middot; <a href="' + href + '">See the apps &rarr;</a>' : '';
  }

  function build(mode) {
    for (var i = 0; i < boxes.length; i++) {
      var box = boxes[i];
      if (mode === 'soon') {
        box.innerHTML = '<div class="cyber-head">CYBER MONDAY SALE STARTS IN</div>' +
          '<div class="cyber-clock"></div>' +
          '<div class="cyber-line">50% off all apps for 3 days' + linkHtml(box) + '</div>';
        box.hidden = false;
      } else if (mode === 'live') {
        box.innerHTML = '<div class="cyber-head">CYBER MONDAY - 50% OFF ALL APPS</div>' +
          '<div class="cyber-line">Use code <span class="cyber-code">' + CODE + '</span> at checkout &middot; <span class="cyber-ends"></span>' + linkHtml(box) + '</div>';
        box.hidden = false;
      } else {
        box.hidden = true;
        box.innerHTML = '';
      }
    }
    if (side) {
      if (mode === 'live') {
        side.setAttribute('href', 'https://bskapps.com/');
        side.innerHTML = 'Cyber Monday: <b>50% off all BSK apps</b>';
      } else {
        side.setAttribute('href', sideHref);
        side.innerHTML = sideHtml;
      }
    }
  }

  function fill(selector, text) {
    var els = document.querySelectorAll(selector);
    for (var i = 0; i < els.length; i++) els[i].textContent = text;
  }

  var mode = '';
  var timer = null;

  function tick() {
    var now = Date.now();
    var next = now < START ? 'soon' : now < END ? 'live' : 'over';
    if (next !== mode) { mode = next; build(mode); }
    if (mode === 'soon') fill('.cyber-clock', left(START - now, true));
    else if (mode === 'live') fill('.cyber-ends', 'Ends in ' + left(END - now, false));
    else if (timer) { clearInterval(timer); timer = null; }
  }

  tick();
  if (mode !== 'over') timer = setInterval(tick, 1000);
})();
