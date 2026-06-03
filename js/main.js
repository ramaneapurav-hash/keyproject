// ============================================================
//  KEY PROJECT ARCHITECTURE — main.js
//  Cursor, nav, scroll reveal, contact form, section routing
// ============================================================
'use strict';

// ============================================================
//  STATE (shared globally)
// ============================================================
window.isLoggedIn = false;
window.logoData = null;
window.messages = JSON.parse(localStorage.getItem('kpa_messages') || '[]');
window.projects = [
  {cat:'Residential',  name:'The Meridian Villa',  location:'Pune, Maharashtra',  img:null, imgs:[null,null,null], desc:'A contemporary residential bungalow crafted with brick and modern design elements.', fbId:null},
  {cat:'Industrial',   name:'HUF India Facility',  location:'Maharashtra',        img:null, imgs:[null,null,null], desc:'Landmark industrial facility designed with precision engineering and functional excellence.', fbId:null},
  {cat:'Healthcare',   name:'Healing Touch Hospital',location:'Pune',             img:null, imgs:[null,null,null], desc:'A multi-storey hospital designed for patient comfort and operational efficiency.', fbId:null},
  {cat:'Corporate',    name:'Corporate Office',     location:'Pune',               img:null, imgs:[null,null,null], desc:'Modern corporate workspace designed for productivity and professional aesthetics.', fbId:null},
  {cat:'Renovation',   name:'Heritage Bungalow',    location:'Pune',               img:null, imgs:[null,null,null], desc:'Careful renovation preserving heritage character while introducing modern upgrades.', fbId:null},
];
window.clients = [
  {name:'HUF India',        type:'Industrial',    img:null},
  {name:'Healing Touch',    type:'Healthcare',    img:null},
  {name:'TechCorp India',   type:'Corporate',     img:null},
  {name:'Meridian Homes',   type:'Residential',   img:null},
  {name:'Skyline Group',    type:'Commercial',    img:null},
  {name:'Atelier Ventures', type:'Mixed Use',     img:null},
  {name:'Pinnacle Realty',  type:'Real Estate',   img:null},
  {name:'Zenith Hotels',    type:'Hospitality',   img:null},
  {name:'Nakshatra Corp',   type:'Institutional', img:null},
  {name:'Veda Builders',    type:'Residential',   img:null},
  {name:'Kiran Properties', type:'Real Estate',   img:null},
  {name:'Studio Delta',     type:'Interior',      img:null},
  {name:'Omni Developers',  type:'Commercial',    img:null},
  {name:'Luminos Urban',    type:'Urban Planning',img:null},
  {name:'Regal Spaces',     type:'Residential',   img:null},
  {name:'BluVista Corp',    type:'Corporate',     img:null},
];

// Shortcuts
var projects = window.projects;
var clients  = window.clients;
var messages = window.messages;
var logoData = null;
var isLoggedIn = false;

// ============================================================
//  LOAD SAVED THEME
// ============================================================
(function(){
  const t = localStorage.getItem('kpa_theme') || 'dark-gold';
  document.documentElement.setAttribute('data-theme', t);
})();

// ============================================================
//  CURSOR
// ============================================================
const cur  = document.getElementById('cur');
const curf = document.getElementById('curf');
let mx=0, my=0, fx=0, fy=0;
document.addEventListener('mousemove', e => {
  mx = e.clientX; my = e.clientY;
  cur.style.left = mx+'px'; cur.style.top = my+'px';
});
(function loop(){
  fx += (mx-fx)*0.12; fy += (my-fy)*0.12;
  curf.style.left = fx+'px'; curf.style.top = fy+'px';
  requestAnimationFrame(loop);
})();
document.addEventListener('mouseover', e => {
  const is = e.target.matches('a,button,input,textarea,select,.pcard,.si,.sl,.lup,.abimgup,.pthumb,.csw,.addpbtn,.dsb-btn,.dnb');
  cur.classList.toggle('ex', is);
  curf.classList.toggle('ex', is);
});

// ============================================================
//  LOADER
// ============================================================
window.addEventListener('load', () => {
  setTimeout(() => {
    const l = document.getElementById('loader');
    if (l) { l.classList.add('done'); setTimeout(() => l.remove(), 800); }
  }, 2200);
});

// ============================================================
//  NAV SCROLL
// ============================================================
window.addEventListener('scroll', () => {
  const nav = document.getElementById('sitenav');
  if (nav) nav.classList.toggle('sc', scrollY > 60);
});

// ============================================================
//  SCROLL REVEAL
// ============================================================
const rvObs = new IntersectionObserver(entries => {
  entries.forEach(e => {
    if (e.isIntersecting) { e.target.classList.add('vi'); rvObs.unobserve(e.target); }
  });
}, { threshold: 0.1 });
document.querySelectorAll('.rv').forEach(el => rvObs.observe(el));

// ============================================================
//  MOBILE MENU
// ============================================================
let mOpen = false;
function toggleM() {
  mOpen = !mOpen;
  document.getElementById('mmenu').classList.toggle('open', mOpen);
  const spans = document.querySelectorAll('#hbg span');
  if (mOpen) {
    spans[0].style.transform = 'rotate(45deg) translate(4px,4px)';
    spans[1].style.opacity = '0';
    spans[2].style.transform = 'rotate(-45deg) translate(4px,-4px)';
  } else {
    spans.forEach(s => { s.style.transform = ''; s.style.opacity = ''; });
  }
}
function closeM() { if (mOpen) toggleM(); }
window.toggleM = toggleM;
window.closeM = closeM;

// ============================================================
//  SECTION ROUTING
// ============================================================
function showOnly(...ids) {
  ['site','privacy','terms'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = 'none';
  });
  const nav = document.getElementById('sitenav');
  if (nav) nav.style.display = ids.includes('admin') ? 'none' : 'flex';
  ids.forEach(id => { const el = document.getElementById(id); if (el) el.style.display = 'block'; });
  window.scrollTo(0,0);
}
function goSite()    { showOnly('site'); }
function goPrivacy() { showOnly('privacy'); }
function goTerms()   { showOnly('terms'); }
function goAdmin() {
  if (window.isLoggedIn) { if(window.mountAdmin) window.mountAdmin(); }
  else { if(window.mountLogin) window.mountLogin(); }
}
window.showOnly = showOnly;
window.goSite   = goSite;
window.goPrivacy= goPrivacy;
window.goTerms  = goTerms;
window.goAdmin  = goAdmin;

// Secret admin route: hash #admin
if (window.location.hash === '#admin') {
  window.addEventListener('load', () => setTimeout(goAdmin, 2400));
}

// Secret: click footer copyright 7 times
let tapCount = 0, tapTimer = null;
document.addEventListener('click', e => {
  if (e.target && e.target.id === 's-cr') {
    tapCount++;
    clearTimeout(tapTimer);
    tapTimer = setTimeout(() => tapCount = 0, 2000);
    if (tapCount >= 7) { tapCount = 0; goAdmin(); }
  }
});

// ============================================================
//  CONTACT FORM SUBMIT
// ============================================================
function submitForm() {
  const name  = (document.getElementById('fn')  || {}).value || '';
  const email = (document.getElementById('fe')  || {}).value || '';
  const phone = (document.querySelector('#contact input[type=tel]') || {}).value || '';
  const type  = (document.querySelector('#contact select')          || {}).value || '';
  const msg   = (document.querySelector('#contact textarea')        || {}).value || '';

  if (!name.trim() || !email.trim()) {
    if(window.notify) window.notify('Please fill in your name and email.');
    return;
  }

  const entry = {
    id: Date.now(),
    name: name.trim(),
    email: email.trim(),
    phone: phone.trim(),
    type: type || 'Not specified',
    message: msg.trim(),
    date: new Date().toLocaleString('en-IN', {day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'}),
    read: false,
  };

  messages.unshift(entry);
  localStorage.setItem('kpa_messages', JSON.stringify(messages));

  // Save to Firebase
  if (window._db) {
    window._addDoc(window._collection(window._db,'messages'), { ...entry, timestamp: Date.now(), read: false })
      .catch(e => console.log(e));
  }

  // EmailJS
  if (typeof emailjs !== 'undefined') {
    emailjs.send('service_mt8o7f8','template_sio4gu5',{
      from_name: name.trim(),
      from_email: email.trim(),
      phone: phone.trim(),
      project_type: type || 'Not specified',
      message: msg.trim(),
    }).catch(e => console.log('EmailJS error:', e));
  }

  // Clear form
  ['fn','fe'].forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
  const tel = document.querySelector('#contact input[type=tel]'); if (tel) tel.value = '';
  const sel = document.querySelector('#contact select');          if (sel) sel.value = '';
  const ta  = document.querySelector('#contact textarea');        if (ta)  ta.value = '';

  if(window.notify) window.notify('Thank you, '+name+'! We\'ll be in touch within 24 hours.');
  if(window.updateMsgBadge) window.updateMsgBadge();
}
window.submitForm = submitForm;

// ============================================================
//  INIT — render projects + brands on page load
// ============================================================
document.addEventListener('DOMContentLoaded', async () => {
  // Render defaults first
  if (window.renderProjects)    window.renderProjects();
  if (window.renderBrandSlider) window.renderBrandSlider();

  // Then load from Firebase (overwrites defaults if data exists)
  window._onAuthReady = async function() {
    // Already handled in admin.js loadAllFirebaseData
  };

  // Load projects publicly (no auth needed for reading)
  if (window._db) {
    try {
      const snap = await window._getDocs(window._collection(window._db, 'projects'));
      if (!snap.empty) {
        window.projects = snap.docs.map(d => ({ fbId: d.id, ...d.data() }));
        if (window.renderProjects) window.renderProjects();
      }
    } catch(e) { console.log('Load projects error:', e); }

    // Load brands
    try {
      const snap = await window._getDoc(window._doc(window._db, 'settings', 'clients'));
      if (snap.exists() && snap.data().data) {
        window.clients = snap.data().data;
        if (window.renderBrandSlider) window.renderBrandSlider();
      }
    } catch(e) { console.log('Load brands error:', e); }

    // Load settings (theme + logo)
    try {
      const snap = await window._getDoc(window._doc(window._db, 'settings', 'site'));
      if (snap.exists()) {
        const s = snap.data();
        if (s.theme) {
          document.documentElement.setAttribute('data-theme', s.theme);
          localStorage.setItem('kpa_theme', s.theme);
        }
        if (s.logoData) {
          window.logoData = s.logoData;
          ['nlogoImg', 'fLogoImg'].forEach(id => {
            const el = document.getElementById(id);
            if (el) { el.src = s.logoData; el.style.display = 'block'; }
          });
        }
      }
    } catch(e) { console.log('Load settings error:', e); }
  }

  // Wait for Firebase to be ready then load
  const waitForDb = setInterval(() => {
    if (window._db && window._getDocs) {
      clearInterval(waitForDb);
      loadPublicData();
    }
  }, 500);
});

async function loadPublicData() {
  // Show loading state in projects grid
  const g = document.getElementById('pgrid');
  if (g) g.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:60px;color:var(--t-muted);font-size:13px;letter-spacing:2px;text-transform:uppercase;">Loading Projects...</div>`;

  // Load projects
  try {
    const snap = await window._getDocs(window._collection(window._db, 'projects'));
    if (!snap.empty) {
      window.projects = snap.docs.map(d => ({ fbId: d.id, ...d.data() }));
    }
  } catch(e) { console.log(e); }

  // Load brands
  try {
    const snap = await window._getDoc(window._doc(window._db, 'settings', 'clients'));
    if (snap.exists() && snap.data().data) {
      window.clients = snap.data().data;
    }
  } catch(e) { console.log(e); }

  // Load settings
  try {
    const snap = await window._getDoc(window._doc(window._db, 'settings', 'site'));
    if (snap.exists()) {
      const s = snap.data();
      if (s.theme) {
        document.documentElement.setAttribute('data-theme', s.theme);
        localStorage.setItem('kpa_theme', s.theme);
      }
      if (s.logoData) {
        window.logoData = s.logoData;
        ['nlogoImg', 'fLogoImg'].forEach(id => {
          const el = document.getElementById(id);
          if (el) { el.src = s.logoData; el.style.display = 'block'; }
        });
      }
    }
  } catch(e) { console.log(e); }

  // Render everything after all data loaded
  if (window.renderProjects)    window.renderProjects();
  if (window.renderBrandSlider) window.renderBrandSlider();
}
