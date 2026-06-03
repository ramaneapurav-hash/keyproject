// ============================================================
//  KEY PROJECT ARCHITECTURE — admin.js
//  Admin panel, Firebase auth, projects, messages, branding
// ============================================================

'use strict';

// ============================================================
//  THEME SWITCHER
// ============================================================
function setTheme(theme, btn) {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('kpa_theme', theme);
  document.querySelectorAll('.theme-btn').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  // Save to Firebase
  if (window._db) {
    window._setDoc(window._doc(window._db, 'settings', 'site'), { theme }, { merge: true })
      .catch(e => console.log(e));
  }
}

function toggleThemeMenu() {
  document.getElementById('themeOptions').classList.toggle('open');
}

// Close theme menu when clicking outside
document.addEventListener('click', function(e) {
  const sw = document.getElementById('themeSwitcher');
  if (sw && !sw.contains(e.target)) {
    const to = document.getElementById('themeOptions');
    if (to) to.classList.remove('open');
  }
});

// ============================================================
//  FIREBASE AUTH — LOGIN / LOGOUT
// ============================================================
function doLogin() {
  const email = (document.getElementById('aUser') || {}).value || '';
  const pass = (document.getElementById('aPass') || {}).value || '';
  const err = document.getElementById('aErr');
  const btn = document.querySelector('.al-btn');
  if (btn) { btn.textContent = 'Signing in...'; btn.disabled = true; }
  if (!window._auth) {
    if (err) { err.textContent = 'Loading Firebase...'; err.style.display = 'block'; }
    if (btn) { btn.textContent = 'Sign In →'; btn.disabled = false; }
    return;
  }
  window._signIn(window._auth, email, pass).then(uc => {
    window._currentUser = uc.user;
    mountAdmin();
    loadAllFirebaseData();
    // Show theme switcher
    const ts = document.getElementById('themeSwitcher');
    if (ts) ts.classList.add('admin-visible');
  }).catch(() => {
    if (err) { err.textContent = 'Invalid credentials. Please try again.'; err.style.display = 'block'; }
    if (btn) { btn.textContent = 'Sign In →'; btn.disabled = false; }
  });
}

function doLogout() {
  if (window._auth) window._signOut(window._auth);
  const ts = document.getElementById('themeSwitcher');
  if (ts) ts.classList.remove('admin-visible');
  destroyAdmin();
}

// ============================================================
//  LOAD ALL FIREBASE DATA
// ============================================================
async function loadAllFirebaseData() {
  if (!window._db) return;

  // Load messages (real-time)
  try {
    const q = window._query(window._collection(window._db, 'messages'), window._orderBy('timestamp', 'desc'));
    window._onSnapshot(q, snap => {
      messages = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      localStorage.setItem('kpa_messages', JSON.stringify(messages));
      updateMsgBadge();
      const ml = document.getElementById('msgList');
      if (ml) renderMsgList();
    });
  } catch (e) { console.log('Messages error:', e); }

  // Load projects
  try {
    const snap = await window._getDocs(window._collection(window._db, 'projects'));
    if (!snap.empty) {
      projects = snap.docs.map(d => ({ fbId: d.id, ...d.data() }));
      renderProjects();
      renderAdminProjects();
    }
  } catch (e) { console.log('Projects error:', e); }

  // Load clients/brands
  try {
    const snap = await window._getDoc(window._doc(window._db, 'settings', 'clients'));
    if (snap.exists() && snap.data().data) {
      clients = snap.data().data;
      renderBrandSlider();
      renderAdminClients();
    }
  } catch (e) { console.log('Clients error:', e); }

  // Load blog posts
  loadBlogPosts();
  try {
    const snap = await window._getDoc(window._doc(window._db, 'settings', 'site'));
    if (snap.exists()) {
      const s = snap.data();
      if (s.theme) {
        document.documentElement.setAttribute('data-theme', s.theme);
        const btn = document.querySelector('[data-theme="' + s.theme + '"]');
        if (btn) { document.querySelectorAll('.theme-btn').forEach(b => b.classList.remove('active')); btn.classList.add('active'); }
      }
      if (s.logoData) {
        logoData = s.logoData;
        ['nlogoImg', 'fLogoImg'].forEach(id => { const el = document.getElementById(id); if (el) { el.src = logoData; el.style.display = 'block'; } });
      }
    }
  } catch (e) { console.log('Settings error:', e); }
}

// ============================================================
//  SAVE HELPERS
// ============================================================
async function fbSaveMessage(entry) {
  if (!window._db) return;
  try { await window._addDoc(window._collection(window._db, 'messages'), { ...entry, timestamp: Date.now(), read: false }); }
  catch (e) { console.log(e); }
}

async function fbSaveProject(p) {
  if (!window._db) return null;
  try {
    if (p.fbId) {
      await window._setDoc(window._doc(window._db, 'projects', p.fbId), p);
      return p.fbId;
    } else {
      const ref = await window._addDoc(window._collection(window._db, 'projects'), p);
      return ref.id;
    }
  } catch (e) { console.log(e); return null; }
}

async function fbDeleteProject(fbId) {
  if (!window._db || !fbId) return;
  try { await window._deleteDoc(window._doc(window._db, 'projects', fbId)); }
  catch (e) { console.log(e); }
}

async function fbSaveClients() {
  if (!window._db) return;
  try { await window._setDoc(window._doc(window._db, 'settings', 'clients'), { data: clients }); }
  catch (e) { console.log(e); }
}

async function fbSaveSettings(settings) {
  if (!window._db) return;
  try { await window._setDoc(window._doc(window._db, 'settings', 'site'), settings, { merge: true }); }
  catch (e) { console.log(e); }
}

// ============================================================
//  ADMIN MOUNT / DESTROY
// ============================================================
function mountAdmin() {
  const m = document.getElementById('adminMount');
  m.innerHTML = buildAdminHTML();
  bindAdminEvents();
  renderProjects();
  renderAdminProjects();
  renderAdminClients();
  updateMsgBadge();
  document.getElementById('sitenav').style.display = 'none';
  showOnly();
}

function destroyAdmin() {
  isLoggedIn = false;
  document.getElementById('adminMount').innerHTML = '';
  const nav = document.getElementById('sitenav');
  if (nav) nav.style.display = 'flex';
  ['privacy', 'terms'].forEach(id => { const el = document.getElementById(id); if (el) el.style.display = 'none'; });
  const site = document.getElementById('site');
  if (site) site.style.display = 'block';
  window.scrollTo(0, 0);
}

function mountLogin() {
  const m = document.getElementById('adminMount');
  m.innerHTML = `
  <div class="al-wrap">
    <div class="al-card">
      <div class="al-logo">
        ${logoData ? `<img src="${logoData}" style="height:30px;width:30px;object-fit:contain;">` : ''}
        <span id="alLogoTxt">KEY <span>PROJECT</span></span>
      </div>
      <p class="al-sub">Admin Portal — Restricted Access</p>
      <div class="al-field"><label>Email</label><input type="email" id="aUser" placeholder="Enter your email" autocomplete="email"></div>
      <div class="al-field"><label>Password</label><input type="password" id="aPass" placeholder="••••••••" autocomplete="current-password"></div>
      <button class="al-btn" onclick="doLogin()">Sign In →</button>
      <p class="al-err" id="aErr">Invalid credentials. Please try again.</p>
      <span class="al-back" onclick="destroyAdmin();goSite()">← Return to Website</span>
    </div>
  </div>`;
  document.getElementById('sitenav').style.display = 'none';
  showOnly();
  setTimeout(() => {
    const p = document.getElementById('aPass');
    if (p) p.addEventListener('keydown', e => { if (e.key === 'Enter') doLogin(); });
  }, 100);
}

// ============================================================
//  ADMIN HTML BUILDER
// ============================================================
function buildAdminHTML() {
  return `
  <div class="adash" id="adash">
    <div class="dh">
      <div class="dh-logo">
        ${logoData ? `<img src="${logoData}" style="height:26px;width:26px;object-fit:contain;display:block;">` : ''}
        <span>KEY <span>PROJECT</span></span>
      </div>
      <div class="dnav">
        <button class="dnb on" onclick="showP('overview',this)">Overview</button>
        <button class="dnb" onclick="showP('messages',this)">Messages <span id="msg-badge" style="display:none;background:#e74c3c;color:#fff;font-size:10px;padding:1px 6px;border-radius:10px;margin-left:4px;"></span></button>
        <button class="dnb" onclick="showP('branding',this)">Branding</button>
        <button class="dnb" onclick="showP('content',this)">Content</button>
        <button class="dnb" onclick="showP('projects',this)">Projects</button>
        <button class="dnb" onclick="showP('clients',this)">Clients</button>
        <button class="dnb" onclick="showP('media',this)">Media</button>
        <button class="dnb" onclick="showP('social',this)">Social Links</button>
        <button class="dnb" onclick="showP('blog',this)">Blog</button>
        <button class="dnb" onclick="showP('settings',this)">Settings</button>
      </div>
      <div class="dh-act">
        <button class="dprev" onclick="destroyAdmin();goSite()">Preview Site ↗</button>
        <button class="dlout" onclick="doLogout()">Sign Out</button>
      </div>
    </div>
    <div class="dbody">
      <div class="dsb">
        <div class="dsb-lbl">Manage</div>
        <button class="dsb-btn on" onclick="showP('overview')"><span class="dsb-ico">⊞</span>Overview</button>
        <button class="dsb-btn" onclick="showP('messages');markAllRead()"><span class="dsb-ico">✉</span>Messages <span id="msg-badge-sb" style="display:none;background:#e74c3c;color:#fff;font-size:10px;padding:1px 6px;border-radius:10px;margin-left:auto;"></span></button>
        <button class="dsb-btn" onclick="showP('branding')"><span class="dsb-ico">◈</span>Branding & Logo</button>
        <button class="dsb-btn" onclick="showP('content')"><span class="dsb-ico">✏</span>Site Content</button>
        <button class="dsb-btn" onclick="showP('projects')"><span class="dsb-ico">◻</span>Projects</button>
        <button class="dsb-btn" onclick="showP('clients')"><span class="dsb-ico">★</span>Client Brands</button>
        <button class="dsb-btn" onclick="showP('media')"><span class="dsb-ico">⬡</span>Media & Images</button>
        <button class="dsb-btn" onclick="showP('social')"><span class="dsb-ico">◉</span>Social Links</button>
        <div class="dsb-lbl" style="margin-top:12px">System</div>
        <button class="dsb-btn" onclick="showP('blog')"><span class="dsb-ico">📝</span>Blog Manager</button>
        <button class="dsb-btn" onclick="showP('settings')"><span class="dsb-ico">⚙</span>Settings</button>
      </div>
      <div class="dmain">

        <!-- OVERVIEW -->
        <div class="dpanel on" id="dp-overview">
          <h2 class="ptitle">Dashboard <em>Overview</em></h2>
          <p class="psub">Welcome back. Here's a snapshot of your website.</p>
          <div class="ovstats">
            <div class="ovs" style="cursor:pointer" onclick="showP('messages');markAllRead()"><div class="ovs-n" id="ov-mc" style="color:#e74c3c">0</div><div class="ovs-l">New Messages</div></div>
            <div class="ovs"><div class="ovs-n" id="ov-pc">${projects.length}</div><div class="ovs-l">Projects</div></div>
            <div class="ovs"><div class="ovs-n" id="ov-cc">${clients.length}</div><div class="ovs-l">Client Brands</div></div>
            <div class="ovs"><div class="ovs-n" id="ov-tm">0</div><div class="ovs-l">Total Messages</div></div>
          </div>
          <div class="egrid">
            <div class="ecard">
              <div class="ectitle">Quick Actions</div>
              <div style="display:flex;flex-direction:column;gap:10px">
                <button class="sbtn" onclick="showP('messages');markAllRead()">📬 View Client Messages</button>
                <button class="sbtn gh" onclick="showP('branding')">Upload Logo / Change Name</button>
                <button class="sbtn gh" onclick="showP('content')">Edit Text Content</button>
                <button class="sbtn gh" onclick="showP('projects')">Manage Projects</button>
                <button class="sbtn gh" onclick="showP('clients')">Manage Client Brands</button>
                <button class="sbtn gh" onclick="showP('social')">Update Social Links</button>
              </div>
            </div>
            <div class="ecard">
              <div class="ectitle">Firm Info</div>
              <div style="display:flex;flex-direction:column;gap:10px">
                <div style="display:flex;justify-content:space-between;font-size:13px;border-bottom:1px solid rgba(201,169,110,.08);padding-bottom:10px"><span style="color:var(--gray)">Firm Name</span><span>Key Project Architecture</span></div>
                <div style="display:flex;justify-content:space-between;font-size:13px;border-bottom:1px solid rgba(201,169,110,.08);padding-bottom:10px"><span style="color:var(--gray)">Location</span><span>Ravet, Pune</span></div>
                <div style="display:flex;justify-content:space-between;font-size:13px;border-bottom:1px solid rgba(201,169,110,.08);padding-bottom:10px"><span style="color:var(--gray)">Founded</span><span>2003</span></div>
                <div style="display:flex;justify-content:space-between;font-size:13px"><span style="color:var(--gray)">Status</span><span style="color:#2ecc71">● Live</span></div>
              </div>
            </div>
          </div>
        </div>

        <!-- MESSAGES -->
        <div class="dpanel" id="dp-messages">
          <h2 class="ptitle">Client <em>Messages</em></h2>
          <p class="psub">All enquiries submitted through the contact form appear here in real-time.</p>
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;flex-wrap:wrap;gap:12px">
            <div style="display:flex;gap:8px;flex-wrap:wrap">
              <button class="msg-filter-btn on" onclick="filterMsgs('all',this)">All</button>
              <button class="msg-filter-btn" onclick="filterMsgs('unread',this)">Unread</button>
              <button class="msg-filter-btn" onclick="filterMsgs('read',this)">Read</button>
            </div>
            <div style="display:flex;gap:8px">
              <button class="sbtn gh" style="width:auto;margin:0" onclick="markAllRead()">Mark All Read</button>
              <button class="sbtn gh" style="width:auto;margin:0;border-color:rgba(231,76,60,.2);color:rgba(231,76,60,.5)" onclick="clearAllMsgs()">Clear All</button>
            </div>
          </div>
          <div id="msgList" style="display:flex;flex-direction:column;gap:10px"></div>
          <div id="msgModal" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,.8);z-index:9999;align-items:center;justify-content:center;padding:20px" onclick="if(event.target===this)closeMsgModal()">
            <div style="background:#0f0f0f;border:1px solid rgba(201,169,110,.2);max-width:600px;width:100%;max-height:80vh;overflow-y:auto;padding:32px;position:relative">
              <button onclick="closeMsgModal()" style="position:absolute;top:16px;right:16px;background:none;border:none;color:var(--gray);font-size:20px;cursor:pointer">✕</button>
              <div id="msgDetail"></div>
            </div>
          </div>
        </div>

        <!-- BRANDING -->
        <div class="dpanel" id="dp-branding">
          <h2 class="ptitle">Branding <em>& Logo</em></h2>
          <p class="psub">Upload your C05 logo and customise your brand identity.</p>
          <div class="egrid">
            <div class="ecard">
              <div class="ectitle">Logo Upload</div>
              <div class="lup">
                <input type="file" accept="image/*" onchange="uploadLogo(this)">
                <div class="lprev" id="lprev">${logoData ? `<img src="${logoData}">` : '<span style="font-size:28px;opacity:.2">⬡</span>'}</div>
                <div class="luptxt"><strong>Click to upload logo</strong><br>PNG, SVG — transparent background recommended</div>
              </div>
              <button class="sbtn gh" style="margin-top:12px" onclick="removeLogo()">Remove Logo</button>
            </div>
            <div class="ecard">
              <div class="ectitle">Firm Name</div>
              <div class="ef"><label>Navigation Name</label><input id="b-short" value="KEY PROJECT"></div>
              <div class="ef"><label>Accent Word (gold)</label><input id="b-accent" value="PROJECT"></div>
              <div class="ef"><label>Footer Description</label><textarea id="b-fdesc">Architecture & Interior Design firm based in Ravet, Pune. Crafting spaces that outlast trends since 2003.</textarea></div>
              <button class="sbtn" onclick="saveBranding()">Apply Across Site</button>
              <p class="ssucc" id="ss-brand">✓ Branding updated!</p>
            </div>
            <div class="ecard">
              <div class="ectitle">Theme</div>
              <p style="font-size:12px;color:var(--gray);margin-bottom:16px">Switch the website theme. Only visible to admin.</p>
              <div style="display:flex;flex-direction:column;gap:8px">
                <button class="theme-btn" data-theme="dark-gold" onclick="setTheme('dark-gold',this)" style="justify-content:flex-start"><div class="theme-dot" style="background:#c9a96e;border:2px solid #888"></div><span>Dark Gold (Default)</span></button>
                <button class="theme-btn" data-theme="light-ivory" onclick="setTheme('light-ivory',this)" style="justify-content:flex-start"><div class="theme-dot" style="background:#faf8f5;border:2px solid #8b6914"></div><span>Light Ivory</span></button>
                <button class="theme-btn" data-theme="midnight-blue" onclick="setTheme('midnight-blue',this)" style="justify-content:flex-start"><div class="theme-dot" style="background:#050d1a;border:2px solid #4d9fff"></div><span>Midnight Blue</span></button>
                <button class="theme-btn" data-theme="forest-green" onclick="setTheme('forest-green',this)" style="justify-content:flex-start"><div class="theme-dot" style="background:#061209;border:2px solid #4caf72"></div><span>Forest Green</span></button>
                <button class="theme-btn" data-theme="warm-burgundy" onclick="setTheme('warm-burgundy',this)" style="justify-content:flex-start"><div class="theme-dot" style="background:#120508;border:2px solid #c9506e"></div><span>Warm Burgundy</span></button>
              </div>
            </div>
            <div class="ecard">
              <div class="ectitle">Page Meta</div>
              <div class="ef"><label>Browser Tab Title</label><input id="b-title" value="Key Project Architecture"></div>
              <div class="ef"><label>Copyright Line</label><input id="b-copy" value="© 2026 Key Project Architecture. All rights reserved."></div>
              <button class="sbtn" onclick="saveMeta()">Save</button>
              <p class="ssucc" id="ss-meta">✓ Saved!</p>
            </div>
          </div>
        </div>

        <!-- CONTENT -->
        <div class="dpanel" id="dp-content">
          <h2 class="ptitle">Site <em>Content</em></h2>
          <p class="psub">Edit all text across the website. Changes apply live.</p>
          <div class="egrid">
            <div class="ecard">
              <div class="ectitle">Hero Section</div>
              <div class="ef"><label>Eyebrow</label><input id="c-ey" value="Architecture · Interior Design · Pune, India"></div>
              <div class="ef"><label>Headline</label><textarea id="c-ht" style="min-height:56px">Spaces Built for Living</textarea></div>
              <div class="ef"><label>Subtitle</label><textarea id="c-hs">We craft architectural experiences that transcend the ordinary — where structure meets soul, and design meets purpose.</textarea></div>
              <button class="sbtn" onclick="saveC('hero')">Save Hero</button>
              <p class="ssucc" id="ss-hero">✓ Updated!</p>
            </div>
            <div class="ecard">
              <div class="ectitle">Stats</div>
              <div class="er">
                <div class="ef"><label>Projects</label><input id="c-s1" value="150+"></div>
                <div class="ef"><label>Years</label><input id="c-s2" value="20+"></div>
                <div class="ef"><label>Awards</label><input id="c-s3" value="28"></div>
                <div class="ef"><label>Satisfaction</label><input id="c-s4" value="100%"></div>
              </div>
              <button class="sbtn" onclick="saveC('stats')">Save Stats</button>
              <p class="ssucc" id="ss-stats">✓ Updated!</p>
            </div>
            <div class="ecard">
              <div class="ectitle">About Section</div>
              <div class="ef"><label>Title</label><input id="c-at" value="Crafting Vision Into Reality"></div>
              <div class="ef"><label>Paragraph 1</label><textarea id="c-ap1">Founded in 2003, Key Project Architecture is a Pune-based practice dedicated to creating spaces that are as meaningful as they are beautiful.</textarea></div>
              <div class="ef"><label>Paragraph 2</label><textarea id="c-ap2">From intimate residences to ambitious industrial developments, we approach each project with the same rigour — listening deeply, designing thoughtfully, and building with integrity.</textarea></div>
              <button class="sbtn" onclick="saveC('about')">Save About</button>
              <p class="ssucc" id="ss-about">✓ Updated!</p>
            </div>
            <div class="ecard">
              <div class="ectitle">Contact Details</div>
              <div class="ef"><label>Address</label><input id="c-adr" value="Ravet, Pune, Maharashtra 412101"></div>
              <div class="ef"><label>Phone</label><input id="c-ph" value="+91 87673 74472"></div>
              <div class="ef"><label>Email</label><input id="c-em" value="admin@keyproject.in"></div>
              <div class="ef"><label>Section Description</label><textarea id="c-cd">Every great project starts with a conversation. Reach out to us today.</textarea></div>
              <button class="sbtn" onclick="saveC('contact')">Save Contact</button>
              <p class="ssucc" id="ss-contact">✓ Updated!</p>
            </div>
          </div>
        </div>

        <!-- PROJECTS -->
        <div class="dpanel" id="dp-projects">
          <h2 class="ptitle">Manage <em>Projects</em></h2>
          <p class="psub">Add up to 4 images per project. Slide 1 is the cover. All data saved to Firebase.</p>
          <div class="plist" id="adminPList"></div>
          <button class="addpbtn" onclick="addProject()">+ Add New Project</button>
          <div style="margin-top:20px;display:flex;gap:12px">
            <button class="sbtn" onclick="saveAllProjects()">Save All to Firebase</button>
            <button class="sbtn gh" onclick="renderProjects();renderAdminProjects();notify('Projects updated!')">Apply to Site</button>
          </div>
        </div>

        <!-- MEDIA -->
        <div class="dpanel" id="dp-media">
          <h2 class="ptitle">Media <em>& Images</em></h2>
          <p class="psub">Upload images for the About section.</p>
          <div class="egrid">
            <div class="ecard">
              <div class="ectitle">About — Main Image</div>
              <div class="abimgup">
                <input type="file" accept="image/*" onchange="setAboutImg(this,1)">
                <div id="abp1" class="abimgprev">🖼</div>
                <div class="luptxt"><strong>Click to upload</strong> main about image</div>
              </div>
            </div>
            <div class="ecard">
              <div class="ectitle">About — Accent Image</div>
              <div class="abimgup">
                <input type="file" accept="image/*" onchange="setAboutImg(this,2)">
                <div id="abp2" class="abimgprev">🖼</div>
                <div class="luptxt"><strong>Click to upload</strong> accent image</div>
              </div>
            </div>
          </div>
        </div>

        <!-- SOCIAL -->
        <div class="dpanel" id="dp-social">
          <h2 class="ptitle">Social <em>Links</em></h2>
          <p class="psub">Update your social media URLs.</p>
          <div class="egrid">
            <div class="ecard" style="grid-column:1/-1">
              <div class="ectitle">Platform URLs</div>
              <div class="soclist">
                <div class="socrow"><div class="socico">📷</div><div class="socname">Instagram</div><input class="socurl" id="soc-ig" value="https://instagram.com/keyproject2003_"></div>
                <div class="socrow"><div class="socico">💼</div><div class="socname">LinkedIn</div><input class="socurl" id="soc-li" value=""></div>
                <div class="socrow"><div class="socico">📘</div><div class="socname">Facebook</div><input class="socurl" id="soc-fb" value=""></div>
                <div class="socrow"><div class="socico">💬</div><div class="socname">WhatsApp</div><input class="socurl" id="soc-wa" value="+91 87673 74472"></div>
                <div class="socrow"><div class="socico">▶️</div><div class="socname">YouTube</div><input class="socurl" id="soc-yt" value=""></div>
              </div>
              <div style="margin-top:16px"><button class="sbtn" onclick="saveSocials()">Update Social Links</button><p class="ssucc" id="ss-soc">✓ Updated!</p></div>
            </div>
          </div>
        </div>

        <!-- CLIENTS -->
        <div class="dpanel" id="dp-clients">
          <h2 class="ptitle">Client <em>Brands</em></h2>
          <p class="psub">Add or remove companies from the brand panel. Data saved to Firebase.</p>
          <div class="ecard" style="margin-bottom:20px">
            <div class="ectitle">Add New Company</div>
            <div style="display:grid;grid-template-columns:1fr 1fr auto auto;gap:12px;align-items:end">
              <div class="ef" style="margin:0"><label>Company Name</label><input id="nc-name" placeholder="e.g. HUF India"></div>
              <div class="ef" style="margin:0"><label>Project Type</label><input id="nc-type" placeholder="e.g. Industrial"></div>
              <div class="ef" style="margin:0"><label>Logo</label>
                <div style="position:relative;width:52px;height:52px;background:#1a1a1a;border:1px dashed rgba(201,169,110,.2);border-radius:4px;overflow:hidden;cursor:pointer">
                  <input type="file" accept="image/*" id="nc-logo" style="position:absolute;inset:0;opacity:0;cursor:pointer;width:100%;height:100%">
                  <div id="nc-logo-prev" style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;font-size:18px;color:rgba(201,169,110,.3)">+</div>
                </div>
              </div>
              <button class="sbtn" style="white-space:nowrap;margin:0" onclick="addClient()">Add</button>
            </div>
          </div>
          <div class="ecard">
            <div class="ectitle">All Companies <span id="cl-count" style="font-size:11px;color:var(--gray);margin-left:8px"></span></div>
            <div id="clientAdminList" style="display:flex;flex-direction:column;gap:10px;margin-top:4px"></div>
          </div>
          <div style="margin-top:16px;display:flex;gap:12px">
            <button class="sbtn" onclick="applyClients()">Apply to Site</button>
            <button class="sbtn gh" onclick="fbSaveClients();notify('Brands saved to Firebase!')">Save to Firebase</button>
          </div>
        </div>

        <!-- BLOG -->
        <div class="dpanel" id="dp-blog">
          <h2 class="ptitle">Blog <em>Manager</em></h2>
          <p class="psub">Write and publish blog posts. They appear on your blog page automatically.</p>
          <!-- Add new post -->
          <div class="ecard" style="margin-bottom:20px">
            <div class="ectitle">Write New Post</div>
            <div class="ef"><label>Post Title</label><input id="bl-title" placeholder="e.g. 5 Things to Consider Before Building Your Home"></div>
            <div class="ef"><label>Category</label>
              <select id="bl-cat">
                <option value="Residential">Residential</option>
                <option value="Commercial">Commercial</option>
                <option value="Industrial">Industrial</option>
                <option value="Healthcare">Healthcare</option>
                <option value="Interior Design">Interior Design</option>
                <option value="Guide">Guide</option>
              </select>
            </div>
            <div class="ef"><label>Short Excerpt (shown on blog page)</label><textarea id="bl-excerpt" placeholder="Brief description of the blog post..."></textarea></div>
            <div class="ef"><label>Full Content</label><textarea id="bl-content" style="min-height:160px" placeholder="Write your full blog post here..."></textarea></div>
            <div class="ef"><label>Cover Image (optional)</label>
              <div style="position:relative;border:1px dashed rgba(201,169,110,.2);padding:16px;cursor:pointer;display:flex;align-items:center;gap:12px;">
                <input type="file" accept="image/*" id="bl-img" style="position:absolute;inset:0;opacity:0;cursor:pointer;width:100%;height:100%;" onchange="previewBlogImg(this)">
                <div id="bl-img-prev" style="width:60px;height:60px;background:#111;display:flex;align-items:center;justify-content:center;font-size:24px;overflow:hidden;flex-shrink:0;border-radius:4px;">🖼</div>
                <span style="font-size:12px;color:var(--gray)">Click to upload cover image</span>
              </div>
            </div>
            <div style="display:flex;gap:8px;margin-top:8px">
              <button class="sbtn" onclick="publishBlogPost()">Publish Post</button>
              <button class="sbtn gh" onclick="clearBlogForm()">Clear Form</button>
            </div>
            <p class="ssucc" id="ss-blog">✓ Post published!</p>
          </div>
          <!-- All posts -->
          <div class="ecard">
            <div class="ectitle">All Posts <span id="blog-count" style="font-size:11px;color:var(--gray);margin-left:8px"></span></div>
            <div id="blogAdminList" style="display:flex;flex-direction:column;gap:10px;margin-top:12px"></div>
          </div>
        </div>

        <!-- SETTINGS -->
        <div class="dpanel" id="dp-settings">
          <h2 class="ptitle">Account <em>Settings</em></h2>
          <p class="psub">Manage your admin credentials via Firebase console.</p>
          <div class="egrid">
            <div class="ecard">
              <div class="ectitle">Admin Email</div>
              <p style="font-size:13px;color:var(--gray);line-height:1.7">Your admin email is: <strong style="color:var(--gold)">admin@keyproject.in</strong><br>To change password, use Firebase Console → Authentication.</p>
            </div>
            <div class="ecard">
              <div class="ectitle">Danger Zone</div>
              <p style="font-size:12px;color:var(--gray);margin-bottom:16px;line-height:1.7">Resets all unsaved changes on this page.</p>
              <button class="sbtn gh" style="border-color:rgba(231,76,60,.3);color:rgba(231,76,60,.7);width:100%" onclick="if(confirm('Reset everything to defaults?'))location.reload()">Reset All to Defaults</button>
            </div>
          </div>
        </div>

      </div>
    </div>
  </div>`;
}

function bindAdminEvents() {}

// ============================================================
//  ADMIN PANEL SWITCHING
// ============================================================
function showP(id, btn) {
  document.querySelectorAll('.dpanel').forEach(p => p.classList.remove('on'));
  document.querySelectorAll('.dnb,.dsb-btn').forEach(b => b.classList.remove('on'));
  const p = document.getElementById('dp-' + id);
  if (p) p.classList.add('on');
  document.querySelectorAll('.dnb').forEach(b => { if (b.textContent.toLowerCase().trim().startsWith(id.slice(0, 5))) b.classList.add('on'); });
  document.querySelectorAll('.dsb-btn').forEach(b => { if (b.textContent.toLowerCase().trim().startsWith(id.slice(0, 5))) b.classList.add('on'); });
  if (btn) btn.classList.add('on');
  if (id === 'messages') { renderMsgList(); updateMsgBadge(); }
  if (id === 'blog') { renderBlogAdmin(); }
}

// ============================================================
//  PROJECTS
// ============================================================
function renderProjects() {
  const g = document.getElementById('pgrid'); if (!g) return;
  g.innerHTML = projects.map((p, i) => {
    const allImgs = [p.img, ...(p.imgs || [])].filter(Boolean);
    const hasImgs = allImgs.length > 0;
    return `<div class="pcard" onclick="openPGallery(${i})" title="Click to view project">
      ${hasImgs ? `<img src="${allImgs[0]}" class="pimg" alt="${p.name}">` : `<div class="pph"><svg width="${i < 2 ? 36 : 24}" height="${i < 2 ? 36 : 24}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg>${i < 2 ? 'Upload Image' : 'Upload'}</div>`}
      ${allImgs.length > 1 ? `<div class="pcard-slide-indicator">${allImgs.map((_, di) => `<div class="pcard-dot${di === 0 ? ' active' : ''}"></div>`).join('')}</div>` : ''}
      <div class="pov">
        <div class="pcat">${p.cat}</div>
        <div class="pname">${p.name}</div>
        <div class="ploc">${p.location}</div>
        <div class="pview-btn">View Gallery →</div>
      </div>
    </div>`;
  }).join('');
  const oc = document.getElementById('ov-pc'); if (oc) oc.textContent = projects.length;
  if (window.initCardAutoSlide) initCardAutoSlide();
}

function renderAdminProjects() {
  const list = document.getElementById('adminPList'); if (!list) return;
  list.innerHTML = projects.map((p, i) => `
    <div class="prow">
      <p style="font-size:11px;color:var(--gray);margin-bottom:6px;letter-spacing:1px">PROJECT ${i + 1} — 4 IMAGE SLOTS</p>
      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin-bottom:8px;">
        ${[0, 1, 2, 3].map(si => {
          const src = si === 0 ? p.img : (p.imgs && p.imgs[si - 1] ? p.imgs[si - 1] : null);
          return `<div class="pthumb" title="Slide ${si + 1} — click to upload" style="height:70px;flex-direction:column;gap:4px;">
            <input type="file" accept="image/*" onchange="uploadPSlide(this,${i},${si})">
            ${src ? `<img src="${src}" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;">` : `<div class="pthumb-ph">📷</div><span style="font-size:9px;color:rgba(201,169,110,.4);letter-spacing:1px">SLIDE ${si + 1}</span>`}
          </div>`;
        }).join('')}
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-bottom:8px;">
        <input class="pinput" value="${p.cat}" placeholder="Category" onchange="projects[${i}].cat=this.value;renderProjects()">
        <input class="pinput" value="${p.name}" placeholder="Project Name" onchange="projects[${i}].name=this.value;renderProjects()">
        <input class="pinput" value="${p.location}" placeholder="Location" onchange="projects[${i}].location=this.value">
      </div>
      <input class="pinput" value="${p.desc || ''}" placeholder="Project description..." onchange="projects[${i}].desc=this.value" style="width:100%;margin-bottom:8px;">
      <div style="display:flex;gap:8px;">
        <button class="sbtn" style="margin:0;width:auto" onclick="saveSingleProject(${i})">Save to Firebase</button>
        <button class="delbtn" onclick="removeProject(${i})">Remove</button>
      </div>
    </div>`).join('');
}

function compressImage(dataUrl, callback) {
  const img = new Image();
  img.onload = function() {
    const canvas = document.createElement('canvas');
    const maxW = 1200, maxH = 1200;
    let w = img.width, h = img.height;
    if (w > maxW) { h = Math.round(h * maxW / w); w = maxW; }
    if (h > maxH) { w = Math.round(w * maxH / h); h = maxH; }
    canvas.width = w; canvas.height = h;
    canvas.getContext('2d').drawImage(img, 0, 0, w, h);
    callback(canvas.toDataURL('image/jpeg', 0.85));
  };
  img.src = dataUrl;
}

function uploadPSlide(input, projIdx, slideIdx) {
  const file = input.files[0]; if (!file) return;
  const r = new FileReader();
  r.onload = e => {
    compressImage(e.target.result, function(compressed) {
      if (slideIdx === 0) { projects[projIdx].img = compressed; }
      else {
        if (!projects[projIdx].imgs) projects[projIdx].imgs = [null, null, null];
        projects[projIdx].imgs[slideIdx - 1] = compressed;
      }
      renderAdminProjects();
      renderProjects();
    });
  };
  r.readAsDataURL(file);
}

function addProject() {
  projects.push({ cat: 'New Category', name: 'New Project', location: 'Pune', img: null, imgs: [null, null, null], desc: '' });
  renderAdminProjects();
  renderProjects();
}

function removeProject(i) {
  if (!confirm('Remove "' + projects[i].name + '"?')) return;
  if (projects[i].fbId) fbDeleteProject(projects[i].fbId);
  projects.splice(i, 1);
  renderAdminProjects();
  renderProjects();
  notify('Project removed!');
}

async function saveSingleProject(i) {
  const p = projects[i];
  const id = await fbSaveProject(p);
  if (id) { projects[i].fbId = id; notify('Project saved to Firebase!'); }
  else notify('Error saving project.');
}

async function fbDeleteProject(fbId) {
  if (!window._db || !fbId) return;
  try { await window._deleteDoc(window._doc(window._db, 'projects', fbId)); }
  catch (e) { console.log(e); }
}

async function saveAllProjects() {
  for (let i = 0; i < projects.length; i++) {
    const id = await fbSaveProject(projects[i]);
    if (id) projects[i].fbId = id;
  }
  notify('All projects saved to Firebase!');
}

// ============================================================
//  MESSAGES
// ============================================================
let msgFilter = 'all';

function updateMsgBadge() {
  const unread = messages.filter(m => !m.read).length;
  ['msg-badge', 'msg-badge-sb'].forEach(id => {
    const el = document.getElementById(id);
    if (el) { el.textContent = unread; el.style.display = unread > 0 ? 'inline' : 'none'; }
  });
  const mc = document.getElementById('ov-mc'); if (mc) mc.textContent = unread;
  const tm = document.getElementById('ov-tm'); if (tm) tm.textContent = messages.length;
}

function filterMsgs(f, btn) {
  msgFilter = f;
  document.querySelectorAll('.msg-filter-btn').forEach(b => b.classList.remove('on'));
  if (btn) btn.classList.add('on');
  renderMsgList();
}

function renderMsgList() {
  const list = document.getElementById('msgList'); if (!list) return;
  let filtered = messages;
  if (msgFilter === 'unread') filtered = messages.filter(m => !m.read);
  if (msgFilter === 'read') filtered = messages.filter(m => m.read);
  if (!filtered.length) {
    list.innerHTML = '<div class="msg-empty"><div class="msg-empty-icon">📭</div>No messages found.</div>';
    return;
  }
  list.innerHTML = filtered.map(m => `
    <div class="msg-card ${m.read ? '' : 'unread'}" onclick="openMsg('${m.id}')">
      <div class="msg-card-inner">
        <div>
          <div class="msg-header">
            <div class="msg-avatar">${initials(m.name || 'NA')}</div>
            <div class="msg-name">${m.name || 'Unknown'}</div>
            ${!m.read ? '<div class="msg-unread-dot"></div>' : ''}
            ${m.type ? `<span class="msg-type-tag">${m.type}</span>` : ''}
          </div>
          <div class="msg-meta"><span>${m.email || ''}</span>${m.phone ? `<span>${m.phone}</span>` : ''}</div>
          <div class="msg-preview">${m.message || ''}</div>
        </div>
        <div class="msg-date">${m.timestamp ? new Date(m.timestamp).toLocaleDateString('en-IN') : ''}</div>
      </div>
    </div>`).join('');
}

function openMsg(id) {
  const m = messages.find(x => String(x.id) === String(id)); if (!m) return;
  // Mark as read in Firebase
  if (!m.read && window._db && m.id) {
    window._updateDoc(window._doc(window._db, 'messages', String(m.id)), { read: true }).catch(e => console.log(e));
  }
  m.read = true;
  renderMsgList();
  updateMsgBadge();
  const detail = document.getElementById('msgDetail');
  if (detail) detail.innerHTML = `
    <div style="margin-bottom:24px">
      <div style="font-family:var(--fd);font-size:24px;margin-bottom:4px">${m.name || 'Unknown'}</div>
      <div style="font-size:11px;color:var(--gray);letter-spacing:1px">${m.timestamp ? new Date(m.timestamp).toLocaleString('en-IN') : ''}</div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:20px">
      <div class="md-item"><div class="md-item-label">Email</div><div class="md-item-val">${m.email || '-'}</div></div>
      <div class="md-item"><div class="md-item-label">Phone</div><div class="md-item-val">${m.phone || '-'}</div></div>
      <div class="md-item"><div class="md-item-label">Project Type</div><div class="md-item-val">${m.type || '-'}</div></div>
    </div>
    <div style="background:#111;padding:20px;border-radius:2px;font-size:14px;line-height:1.8;color:var(--white)">${m.message || 'No message provided.'}</div>
    <div style="margin-top:16px;display:flex;gap:8px">
      <a href="mailto:${m.email}?subject=Re: Your Enquiry — Key Project Architecture&body=Dear ${m.name},%0A%0AThank you for reaching out to Key Project Architecture.%0A%0A" class="sbtn" style="text-decoration:none;text-align:center;">Reply via Email →</a>
      <button class="sbtn gh" onclick="deleteMsg('${m.id}')">Delete</button>
    </div>`;
  const modal = document.getElementById('msgModal');
  if (modal) modal.style.display = 'flex';
}

function closeMsgModal() {
  const modal = document.getElementById('msgModal');
  if (modal) modal.style.display = 'none';
}

function markAllRead() {
  messages.forEach(m => {
    if (!m.read && window._db && m.id) {
      window._updateDoc(window._doc(window._db, 'messages', String(m.id)), { read: true }).catch(e => console.log(e));
    }
    m.read = true;
  });
  updateMsgBadge();
  renderMsgList();
}

function deleteMsg(id) {
  if (!confirm('Delete this message?')) return;
  if (window._db && id) window._deleteDoc(window._doc(window._db, 'messages', String(id))).catch(e => console.log(e));
  messages = messages.filter(m => String(m.id) !== String(id));
  closeMsgModal();
  renderMsgList();
  updateMsgBadge();
  notify('Message deleted.');
}

function clearAllMsgs() {
  if (!confirm('Delete ALL messages? This cannot be undone.')) return;
  messages.forEach(m => {
    if (window._db) window._deleteDoc(window._doc(window._db, 'messages', m.id)).catch(e => console.log(e));
  });
  messages = [];
  renderMsgList();
  updateMsgBadge();
  notify('All messages cleared.');
}

// ============================================================
//  LOGO
// ============================================================
function uploadLogo(input) {
  const file = input.files[0]; if (!file) return;
  const r = new FileReader();
  r.onload = e => {
    compressImage(e.target.result, function(compressed) {
      logoData = compressed;
      const prev = document.getElementById('lprev');
      if (prev) prev.innerHTML = `<img src="${logoData}">`;
      ['nlogoImg', 'fLogoImg'].forEach(id => { const el = document.getElementById(id); if (el) { el.src = logoData; el.style.display = 'block'; } });
      fbSaveSettings({ logoData });
      notify('Logo uploaded and saved!');
    });
  };
  r.readAsDataURL(file);
}

function removeLogo() {
  logoData = null;
  const prev = document.getElementById('lprev');
  if (prev) prev.innerHTML = '<span style="font-size:28px;opacity:.2">⬡</span>';
  ['nlogoImg', 'fLogoImg'].forEach(id => { const el = document.getElementById(id); if (el) el.style.display = 'none'; });
  notify('Logo removed.');
}

// ============================================================
//  BRANDING
// ============================================================
function saveBranding() {
  const short = document.getElementById('b-short').value;
  const acc = document.getElementById('b-accent').value;
  const pre = short.replace(acc, '').trim();
  const html = pre + (pre ? ' ' : '') + '<b style="color:var(--t-accent);font-weight:500">' + acc + '</b>';
  ['nlogoTxt', 'fLogoTxt'].forEach(id => { const el = document.getElementById(id); if (el) el.innerHTML = html; });
  const fd = document.getElementById('s-fd'); if (fd) fd.textContent = document.getElementById('b-fdesc').value;
  succ('brand'); notify('Branding applied!');
}

function setColor(hex, el) {
  document.documentElement.style.setProperty('--gold', hex);
  document.documentElement.style.setProperty('--t-accent', hex);
  document.querySelectorAll('.csw').forEach(s => s.classList.remove('on'));
  if (el) el.classList.add('on');
  notify('Colour updated!');
}

function saveMeta() {
  const t = document.getElementById('b-title'); if (t) document.title = t.value;
  const c = document.getElementById('b-copy');
  const el = document.getElementById('s-cr'); if (el && c) el.textContent = c.value;
  succ('meta'); notify('Meta saved!');
}

// ============================================================
//  CONTENT
// ============================================================
function saveC(section) {
  if (section === 'hero') {
    const ey = document.getElementById('s-ey'); if (ey) ey.textContent = document.getElementById('c-ey').value;
    const ht = document.getElementById('s-ht'); if (ht) ht.innerHTML = document.getElementById('c-ht').value.replace(/\n/g, '<br>');
    const hs = document.getElementById('s-hs'); if (hs) hs.textContent = document.getElementById('c-hs').value;
  }
  if (section === 'stats') {
    ['s1','s2','s3','s4'].forEach((id,i) => { const el = document.getElementById('s-'+id); if(el) el.textContent = document.getElementById('c-'+id).value; });
    ['f1','f2','f3','f4'].forEach((id,i) => { const el = document.getElementById('s-'+id); if(el) el.textContent = document.getElementById('c-s'+(i+1)).value; });
  }
  if (section === 'about') {
    const at = document.getElementById('s-at'); if (at) at.innerHTML = document.getElementById('c-at').value;
    const ap1 = document.getElementById('s-ap1'); if (ap1) ap1.textContent = document.getElementById('c-ap1').value;
    const ap2 = document.getElementById('s-ap2'); if (ap2) ap2.textContent = document.getElementById('c-ap2').value;
  }
  if (section === 'contact') {
    const adr = document.getElementById('s-adr'); if (adr) adr.textContent = document.getElementById('c-adr').value;
    const ph = document.getElementById('s-ph'); if (ph) ph.textContent = document.getElementById('c-ph').value;
    const em = document.getElementById('s-em'); if (em) em.textContent = document.getElementById('c-em').value;
    const cd = document.getElementById('s-cd'); if (cd) cd.textContent = document.getElementById('c-cd').value;
  }
  succ(section); notify('Content updated!');
}

// ============================================================
//  ABOUT IMAGES
// ============================================================
function setAboutImg(input, n) {
  const file = input.files[0]; if (!file) return;
  const r = new FileReader();
  r.onload = e => {
    const prev = document.getElementById('abp' + n); if (prev) prev.innerHTML = `<img src="${e.target.result}">`;
    const aim = document.getElementById('aim' + n); if (aim) aim.innerHTML = `<img src="${e.target.result}" style="width:100%;height:100%;object-fit:cover;">`;
  };
  r.readAsDataURL(file);
}

// ============================================================
//  SOCIALS
// ============================================================
function saveSocials() {
  const ig = (document.getElementById('soc-ig') || {}).value || '';
  const links = document.querySelectorAll('.sl');
  // Update instagram link if exists
  succ('soc'); notify('Social links updated!');
}

// ============================================================
//  CLIENTS
// ============================================================
let newClientLogoData = null;

function initials(name) {
  const w = name.trim().split(' ');
  return w.length >= 2 ? (w[0][0] + w[w.length - 1][0]).toUpperCase() : name.slice(0, 2).toUpperCase();
}

function renderAdminClients() {
  const list = document.getElementById('clientAdminList');
  const count = document.getElementById('cl-count');
  if (!list) return;
  if (count) count.textContent = clients.length + ' companies';
  list.innerHTML = clients.map((c, i) => `
    <div style="display:grid;grid-template-columns:52px 1fr 1fr auto;gap:12px;align-items:center;background:#111;border:1px solid rgba(201,169,110,.08);padding:12px 16px;border-radius:2px">
      <div style="width:52px;height:52px;background:#1a1a1a;border:1px dashed rgba(201,169,110,.15);border-radius:4px;overflow:hidden;position:relative;cursor:pointer">
        <input type="file" accept="image/*" onchange="changeClientLogo(this,${i})" style="position:absolute;inset:0;opacity:0;cursor:pointer;width:100%;height:100%">
        ${c.img ? `<img src="${c.img}" style="width:100%;height:100%;object-fit:contain;padding:6px">` : `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;font-family:var(--fd);font-size:18px;color:var(--gold)">${initials(c.name)}</div>`}
      </div>
      <input class="pinput" value="${c.name}" placeholder="Company name" onchange="clients[${i}].name=this.value">
      <input class="pinput" value="${c.type}" placeholder="Project type" onchange="clients[${i}].type=this.value">
      <button class="delbtn" onclick="removeClient(${i})">Remove</button>
    </div>`).join('');
}

function renderBrandSlider() {
  const t1 = document.getElementById('brandTrack1');
  const t2 = document.getElementById('brandTrack2');
  if (!t1 || !t2) return;
  const half = Math.ceil(clients.length / 2);
  function ensureEnough(arr) { if (!arr.length) return []; while (arr.length < 8) arr = [...arr, ...arr]; return arr; }
  const t1data = ensureEnough([...clients.slice(0, half)]);
  const t2data = ensureEnough([...clients.slice(half)]);
  function cardHTML(c) {
    return `<div class="brand-card">
      <div class="brand-logo-box">${c.img ? `<img src="${c.img}" style="width:100%;height:100%;object-fit:contain;padding:8px">` : `<span class="brand-initials">${initials(c.name)}</span>`}</div>
      <div class="brand-name">${c.name}</div>
      <div class="brand-type">${c.type}</div>
    </div>`;
  }
  t1.innerHTML = [...t1data, ...t1data].map(cardHTML).join('');
  t2.innerHTML = [...t2data, ...t2data].map(cardHTML).join('');
}

function addClient() {
  const name = (document.getElementById('nc-name') || {}).value || '';
  const type = (document.getElementById('nc-type') || {}).value || '';
  if (!name.trim()) { notify('Please enter a company name.'); return; }
  clients.push({ name: name.trim(), type: type.trim() || 'Client', img: newClientLogoData });
  newClientLogoData = null;
  const nn = document.getElementById('nc-name'); if (nn) nn.value = '';
  const nt = document.getElementById('nc-type'); if (nt) nt.value = '';
  const prev = document.getElementById('nc-logo-prev'); if (prev) prev.innerHTML = '+';
  renderAdminClients();
  notify('Company added! Click "Apply to Site" to go live.');
}

function removeClient(i) {
  if (!confirm('Remove "' + clients[i].name + '"?')) return;
  clients.splice(i, 1);
  renderAdminClients();
  notify('Removed. Click "Apply to Site" to update.');
}

function changeClientLogo(input, idx) {
  const file = input.files[0]; if (!file) return;
  const r = new FileReader();
  r.onload = e => { clients[idx].img = e.target.result; renderAdminClients(); };
  r.readAsDataURL(file);
}

function applyClients() {
  renderBrandSlider();
  notify('Brand panel updated!');
}

document.addEventListener('change', function(e) {
  if (e.target && e.target.id === 'nc-logo') {
    const file = e.target.files[0]; if (!file) return;
    const r = new FileReader();
    r.onload = ev => {
      newClientLogoData = ev.target.result;
      const prev = document.getElementById('nc-logo-prev');
      if (prev) prev.innerHTML = `<img src="${ev.target.result}" style="width:100%;height:100%;object-fit:contain;padding:4px">`;
    };
    r.readAsDataURL(file);
  }
});

// ============================================================
//  BLOG MANAGER
// ============================================================
let blogPosts = [];
let blogImgData = null;

function previewBlogImg(input) {
  const file = input.files[0]; if (!file) return;
  const r = new FileReader();
  r.onload = e => {
    compressImage(e.target.result, function(compressed) {
      blogImgData = compressed;
      const prev = document.getElementById('bl-img-prev');
      if (prev) prev.innerHTML = `<img src="${blogImgData}" style="width:100%;height:100%;object-fit:cover;">`;
    });
  };
  r.readAsDataURL(file);
}

async function publishBlogPost() {
  const title   = (document.getElementById('bl-title')   || {}).value || '';
  const cat     = (document.getElementById('bl-cat')     || {}).value || 'General';
  const excerpt = (document.getElementById('bl-excerpt') || {}).value || '';
  const content = (document.getElementById('bl-content') || {}).value || '';
  if (!title.trim()) { notify('Please enter a post title.'); return; }
  if (!excerpt.trim()) { notify('Please enter a short excerpt.'); return; }
  const post = {
    title: title.trim(),
    cat,
    excerpt: excerpt.trim(),
    content: content.trim(),
    img: blogImgData || null,
    date: new Date().toLocaleDateString('en-IN', {day:'2-digit', month:'short', year:'numeric'}),
    timestamp: Date.now(),
  };
  // Save to Firebase
  if (window._db) {
    try {
      const ref = await window._addDoc(window._collection(window._db, 'blogPosts'), post);
      post.fbId = ref.id;
      notify('Post published successfully!');
    } catch(e) { console.log(e); notify('Error saving post.'); return; }
  }
  blogPosts.unshift(post);
  clearBlogForm();
  renderBlogAdmin();
  succ('blog');
}

function clearBlogForm() {
  ['bl-title','bl-excerpt','bl-content'].forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
  const prev = document.getElementById('bl-img-prev'); if (prev) prev.innerHTML = '🖼';
  const cat = document.getElementById('bl-cat'); if (cat) cat.value = 'Residential';
  blogImgData = null;
}

async function deleteBlogPost(fbId, idx) {
  if (!confirm('Delete this blog post?')) return;
  if (window._db && fbId) {
    try { await window._deleteDoc(window._doc(window._db, 'blogPosts', fbId)); }
    catch(e) { console.log(e); }
  }
  blogPosts.splice(idx, 1);
  renderBlogAdmin();
  notify('Post deleted.');
}

function renderBlogAdmin() {
  const list = document.getElementById('blogAdminList');
  const count = document.getElementById('blog-count');
  if (!list) return;
  if (count) count.textContent = blogPosts.length + ' posts';
  if (!blogPosts.length) {
    list.innerHTML = '<p style="color:var(--gray);font-size:13px;padding:20px 0">No posts yet. Write your first post above!</p>';
    return;
  }
  list.innerHTML = blogPosts.map((p, i) => `
    <div style="display:grid;grid-template-columns:60px 1fr auto;gap:12px;align-items:center;background:#111;border:1px solid rgba(201,169,110,.08);padding:14px 16px;border-radius:2px">
      <div style="width:60px;height:60px;background:#1a1a1a;border-radius:4px;overflow:hidden;display:flex;align-items:center;justify-content:center;font-size:20px">
        ${p.img ? `<img src="${p.img}" style="width:100%;height:100%;object-fit:cover">` : '📝'}
      </div>
      <div>
        <div style="font-size:13px;font-weight:500;color:var(--white);margin-bottom:4px">${p.title}</div>
        <div style="font-size:11px;color:var(--gold);letter-spacing:1px;text-transform:uppercase">${p.cat} · ${p.date}</div>
        <div style="font-size:12px;color:var(--gray);margin-top:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:400px">${p.excerpt}</div>
      </div>
      <button class="delbtn" onclick="deleteBlogPost('${p.fbId || ''}', ${i})">Delete</button>
    </div>`).join('');
}

async function loadBlogPosts() {
  if (!window._db) return;
  try {
    const q = window._query(window._collection(window._db, 'blogPosts'), window._orderBy('timestamp', 'desc'));
    const snap = await window._getDocs(q);
    blogPosts = snap.docs.map(d => ({ fbId: d.id, ...d.data() }));
    renderBlogAdmin();
  } catch(e) { console.log(e); }
}

// Expose blog globals
window.previewBlogImg = previewBlogImg;
window.publishBlogPost = publishBlogPost;
window.clearBlogForm = clearBlogForm;
window.deleteBlogPost = deleteBlogPost;
window.renderBlogAdmin = renderBlogAdmin;
window.loadBlogPosts = loadBlogPosts;

// ============================================================
function notify(msg) {
  const n = document.getElementById('notif');
  n.textContent = msg; n.classList.add('show');
  setTimeout(() => n.classList.remove('show'), 3500);
}

function succ(id) {
  const el = document.getElementById('ss-' + id);
  if (!el) return;
  el.style.display = 'block';
  setTimeout(() => el.style.display = 'none', 2500);
}

// Expose globally
window.doLogin = doLogin;
window.doLogout = doLogout;
window.mountLogin = mountLogin;
window.mountAdmin = mountAdmin;
window.destroyAdmin = destroyAdmin;
window.setTheme = setTheme;
window.toggleThemeMenu = toggleThemeMenu;
window.showP = showP;
window.notify = notify;
window.succ = succ;
window.renderProjects = renderProjects;
window.renderAdminProjects = renderAdminProjects;
window.renderAdminClients = renderAdminClients;
window.renderBrandSlider = renderBrandSlider;
window.uploadPSlide = uploadPSlide;
window.addProject = addProject;
window.removeProject = removeProject;
window.saveSingleProject = saveSingleProject;
window.saveAllProjects = saveAllProjects;
window.updateMsgBadge = updateMsgBadge;
window.renderMsgList = renderMsgList;
window.filterMsgs = filterMsgs;
window.openMsg = openMsg;
window.closeMsgModal = closeMsgModal;
window.markAllRead = markAllRead;
window.deleteMsg = deleteMsg;
window.clearAllMsgs = clearAllMsgs;
window.uploadLogo = uploadLogo;
window.removeLogo = removeLogo;
window.saveBranding = saveBranding;
window.setColor = setColor;
window.saveMeta = saveMeta;
window.saveC = saveC;
window.setAboutImg = setAboutImg;
window.saveSocials = saveSocials;
window.addClient = addClient;
window.removeClient = removeClient;
window.changeClientLogo = changeClientLogo;
window.applyClients = applyClients;
window.fbSaveClients = fbSaveClients;
window.initials = initials;
