// ============================================================
//  KEY PROJECT ARCHITECTURE — gallery.js
//  Project gallery modal with sliding animations
// ============================================================

var pgCurSlide = 0;
var pgImages = [];
var pgAutoTimer = null;
var cardSlideTimers = {};

// ============================================================
//  OPEN GALLERY
// ============================================================
function openPGallery(idx) {
  var p = window.projects[idx];
  var modal = document.getElementById('pgalleryModal');
  if (!modal) return;

  // Collect all images — cover + up to 3 extra slides
  pgImages = [];
  if (p.img) pgImages.push(p.img);
  if (p.imgs) p.imgs.forEach(function(i) { if (i) pgImages.push(i); });

  // If no images, show 4 placeholders
  if (!pgImages.length) pgImages = [null, null, null, null];

  pgCurSlide = 0;

  // Set info
  var title = document.getElementById('pgTitle');
  var meta = document.getElementById('pgMeta');
  if (title) title.textContent = p.name;
  if (meta) meta.textContent = (p.cat || '') + ' · ' + (p.location || '');

  // Build slides
  var track = document.getElementById('pgTrack');
  if (track) {
    track.innerHTML = pgImages.map(function(src) {
      return '<div class="pgallery-slide">' +
        (src ? '<img src="' + src + '" alt="' + p.name + '">' : '<div class="pg-ph">🏛️</div>') +
        '</div>';
    }).join('');
  }

  pgUpdateSlider();
  modal.classList.add('open');
  document.body.style.overflow = 'hidden';

  // Auto advance every 3.5 seconds
  clearInterval(pgAutoTimer);
  pgAutoTimer = setInterval(pgNext, 3500);
}

// ============================================================
//  CLOSE GALLERY
// ============================================================
function closePGallery() {
  var modal = document.getElementById('pgalleryModal');
  if (modal) modal.classList.remove('open');
  document.body.style.overflow = '';
  clearInterval(pgAutoTimer);
}

// ============================================================
//  NAVIGATION
// ============================================================
function pgPrev() {
  pgCurSlide = (pgCurSlide - 1 + pgImages.length) % pgImages.length;
  pgUpdateSlider();
  clearInterval(pgAutoTimer);
  pgAutoTimer = setInterval(pgNext, 3500);
}

function pgNext() {
  pgCurSlide = (pgCurSlide + 1) % pgImages.length;
  pgUpdateSlider();
}

function pgGoTo(idx) {
  pgCurSlide = idx;
  pgUpdateSlider();
  clearInterval(pgAutoTimer);
  pgAutoTimer = setInterval(pgNext, 3500);
}

function pgUpdateSlider() {
  var track = document.getElementById('pgTrack');
  if (track) track.style.transform = 'translateX(-' + pgCurSlide + '00%)';

  var dots = document.getElementById('pgDots');
  if (dots) {
    dots.innerHTML = pgImages.map(function(_, i) {
      return '<div class="pgallery-dot' + (i === pgCurSlide ? ' active' : '') +
        '" onclick="pgGoTo(' + i + ')" aria-label="Slide ' + (i + 1) + '"></div>';
    }).join('');
  }

  var counter = document.getElementById('pgCounter');
  if (counter) counter.textContent = (pgCurSlide + 1) + ' / ' + pgImages.length;
}

// ============================================================
//  KEYBOARD & TOUCH
// ============================================================
document.addEventListener('keydown', function(e) {
  var modal = document.getElementById('pgalleryModal');
  if (!modal || !modal.classList.contains('open')) return;
  if (e.key === 'ArrowLeft') pgPrev();
  if (e.key === 'ArrowRight') pgNext();
  if (e.key === 'Escape') closePGallery();
});

var pgTouchX = 0;
document.addEventListener('touchstart', function(e) {
  var modal = document.getElementById('pgalleryModal');
  if (!modal || !modal.classList.contains('open')) return;
  pgTouchX = e.touches[0].clientX;
});
document.addEventListener('touchend', function(e) {
  var modal = document.getElementById('pgalleryModal');
  if (!modal || !modal.classList.contains('open')) return;
  var diff = pgTouchX - e.changedTouches[0].clientX;
  if (Math.abs(diff) > 50) { diff > 0 ? pgNext() : pgPrev(); }
});

// Close on backdrop click
document.addEventListener('DOMContentLoaded', function() {
  var modal = document.getElementById('pgalleryModal');
  if (modal) modal.addEventListener('click', function(e) {
    if (e.target === this) closePGallery();
  });
});

// ============================================================
//  CARD AUTO-SLIDE ON HOVER
// ============================================================
function initCardAutoSlide() {
  document.querySelectorAll('.pcard').forEach(function(card, idx) {
    var p = window.projects[idx];
    if (!p) return;
    var allImgs = [p.img].concat(p.imgs || []).filter(Boolean);
    if (allImgs.length < 2) return;

    var cur = 0;
    card.addEventListener('mouseenter', function() {
      cardSlideTimers[idx] = setInterval(function() {
        cur = (cur + 1) % allImgs.length;
        var img = card.querySelector('.pimg');
        if (img) {
          img.style.opacity = '0';
          setTimeout(function() {
            img.src = allImgs[cur];
            img.style.opacity = '1';
          }, 300);
        }
        var dots = card.querySelectorAll('.pcard-dot');
        dots.forEach(function(d, di) { d.classList.toggle('active', di === cur); });
      }, 1500);
    });

    card.addEventListener('mouseleave', function() {
      clearInterval(cardSlideTimers[idx]);
      cur = 0;
      var img = card.querySelector('.pimg');
      if (img) { img.src = allImgs[0]; img.style.opacity = '1'; }
      card.querySelectorAll('.pcard-dot').forEach(function(d, di) {
        d.classList.toggle('active', di === 0);
      });
    });
  });
}

// Expose globally
window.openPGallery = openPGallery;
window.closePGallery = closePGallery;
window.pgPrev = pgPrev;
window.pgNext = pgNext;
window.pgGoTo = pgGoTo;
window.initCardAutoSlide = initCardAutoSlide;
