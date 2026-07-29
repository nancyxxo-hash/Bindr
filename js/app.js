/* ==========================================================================
   Bindr — prototype interactivity
   ========================================================================== */

// ---------- Supabase config — replace these two values ----------
const SUPABASE_URL = 'https://mluibhoubrzsjegpwvao.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_z6gjS1GPnwRQnA_qNbe2Tw_50xULmsA';

async function sbFetch(path, options = {}) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    method: options.method || 'GET',
    headers: {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': options.prefer || 'return=representation',
      ...(options.headers || {})
    },
    body: options.body
  });
  const text = await res.text();
  if (!res.ok) {
    console.error(`Supabase error [${res.status}] on ${options.method || 'GET'} ${path}:`, text);
    throw new Error(`Supabase ${res.status}: ${text}`);
  }
  try { return text ? JSON.parse(text) : []; }
  catch { return []; }
}

// ---------- Supabase data helpers ----------
async function saveProfileToSupabase(data) {
  const result = await sbFetch('profiles', {
    method: 'POST',
    prefer: 'return=representation,resolution=merge-duplicates',
    body: JSON.stringify({
      email: data.email || '',
      role: data.role || 'personal',
      name: data.name || '',
      initials: data.initials || '',
      profile_data: data
    })
  });
  return Array.isArray(result) ? result[0] : result;
}

async function loadProfileFromSupabase(email) {
  const results = await sbFetch(`profiles?email=eq.${encodeURIComponent(email)}`);
  return Array.isArray(results) ? results[0] : null;
}

async function fetchSwipeableProfiles(currentUserId) {
  const swiped = await sbFetch(`swipes?swiper_id=eq.${currentUserId}&select=swiped_id`);
  const swipedIds = swiped.map(s => s.swiped_id);
  const profiles = await sbFetch(`profiles?id=neq.${currentUserId}`);
  return profiles.filter(p => !swipedIds.includes(p.id));
}

async function recordSwipe(swiperId, swipedId, direction) {
  await sbFetch('swipes', {
    method: 'POST',
    prefer: 'return=minimal,resolution=merge-duplicates',
    body: JSON.stringify({ swiper_id: swiperId, swiped_id: swipedId, direction })
  });
}

async function checkMutualMatch(swiperId, swipedId) {
  const results = await sbFetch(
    `swipes?swiper_id=eq.${swipedId}&swiped_id=eq.${swiperId}&direction=eq.right`
  );
  return Array.isArray(results) && results.length > 0;
}

async function fetchMatchedProfiles(currentUserId) {
  const myRightSwipes = await sbFetch(
    `swipes?swiper_id=eq.${currentUserId}&direction=eq.right&select=swiped_id`
  );
  const myRightIds = myRightSwipes.map(s => s.swiped_id);
  if (!myRightIds.length) return [];

  const theirRightSwipes = await sbFetch(
    `swipes?swiper_id=in.(${myRightIds.join(',')})&swiped_id=eq.${currentUserId}&direction=eq.right&select=swiper_id`
  );
  const matchedIds = theirRightSwipes.map(s => s.swiper_id);
  if (!matchedIds.length) return [];

  return sbFetch(`profiles?id=in.(${matchedIds.join(',')})`);
}

// ---------- Utility: localStorage state ----------
const Bindr = {
  getMatches() {
    try { return JSON.parse(localStorage.getItem('bindr.matches') || '[]'); }
    catch { return []; }
  },
  setMatches(arr) { localStorage.setItem('bindr.matches', JSON.stringify(arr)); },
  addMatch(profile) {
    const list = this.getMatches();
    if (!list.find(p => p.id === profile.id)) {
      list.push(profile);
      this.setMatches(list);
    }
  },
  getUser() {
    try { return JSON.parse(localStorage.getItem('bindr.user') || 'null'); }
    catch { return null; }
  },
  setUser(u) { localStorage.setItem('bindr.user', JSON.stringify(u)); },
  getActiveConvos() {
    try { return JSON.parse(localStorage.getItem('bindr.activeConvos') || '[]'); }
    catch { return []; }
  },
  addActiveConvo(threadName) {
    const list = this.getActiveConvos();
    if (!list.includes(threadName)) {
      list.push(threadName);
      localStorage.setItem('bindr.activeConvos', JSON.stringify(list));
    }
  },
  getPendingEmail() { return localStorage.getItem('bindr.pendingEmail') || ''; },
  setPendingEmail(email) { localStorage.setItem('bindr.pendingEmail', email); },
  clearPendingEmail() { localStorage.removeItem('bindr.pendingEmail'); },
  getFilters() {
    try { return JSON.parse(localStorage.getItem('bindr.filters') || 'null') || {}; }
    catch { return {}; }
  },
  setFilters(f) { localStorage.setItem('bindr.filters', JSON.stringify(f)); },
  getSavedFilters() {
    try { return JSON.parse(localStorage.getItem('bindr.savedFilters') || '[]'); }
    catch { return []; }
  },
  setSavedFilters(arr) { localStorage.setItem('bindr.savedFilters', JSON.stringify(arr)); }
};

// ---------- Build swipe card display data from a Supabase profile row ----------
function profileToCardData(p) {
  const pd = p.profile_data || {};
  let tagline = '', bio = '', chips = [];

  if (p.role === 'corporate') {
    tagline = [pd.industry, pd.yearFounded ? `Est. ${pd.yearFounded}` : ''].filter(Boolean).join(' · ');
    bio = pd.description || (pd.listings || '').split('\n')[0] || '';
    chips = ['Company', pd.industry].filter(Boolean);
  } else if (p.role === 'student') {
    tagline = [pd.school, pd.major].filter(Boolean).join(' · ');
    bio = pd.searchingFor || '';
    chips = ['Student', pd.school].filter(Boolean);
  } else {
    tagline = [pd.jobTitle, pd.education].filter(Boolean).join(' · ');
    bio = pd.searchingFor || '';
    chips = ['Professional', pd.jobTitle].filter(Boolean);
  }

  return {
    id: p.id,
    initials: p.initials || (p.name ? p.name.slice(0, 2).toUpperCase() : '?'),
    name: p.name || 'Unknown',
    tagline,
    bio,
    chips: chips.filter(Boolean)
  };
}

// ---------- Login page ----------
function initLoginPage() {
  const loginBtn = document.getElementById('btnShowLogin');
  const signupBtn = document.getElementById('btnShowSignup');
  const loginForm = document.getElementById('formLogin');
  const signupForm = document.getElementById('formSignup');

  loginBtn?.addEventListener('click', () => {
    loginForm?.classList.add('show');
    signupForm?.classList.remove('show');
  });
  signupBtn?.addEventListener('click', () => {
    signupForm?.classList.add('show');
    loginForm?.classList.remove('show');
  });

  loginForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('loginEmail')?.value.trim() || '';
    const btn = loginForm.querySelector('[type="submit"]');
    btn.textContent = 'Signing in…';
    btn.disabled = true;

    try {
      const profile = await loadProfileFromSupabase(email);
      if (profile) {
        Bindr.setUser({
          ...profile.profile_data,
          role: profile.role,
          name: profile.name,
          initials: profile.initials,
          supabaseId: profile.id,
          email
        });
        window.location.href = 'home.html';
      } else {
        alert('No account found with that email. Please sign up first.');
        btn.textContent = 'Log In →';
        btn.disabled = false;
      }
    } catch (err) {
      console.error('Login error:', err);
      btn.textContent = 'Log In →';
      btn.disabled = false;
      alert('Could not connect. Check your internet and try again.');
    }
  });

  signupForm?.addEventListener('submit', (e) => {
    e.preventDefault();
    const email = document.getElementById('signupEmail')?.value.trim() || '';
    Bindr.setPendingEmail(email);
    window.location.href = 'account-type.html';
  });
}

// ---------- Swipe / home page ----------
async function initSwipePage() {
  const stage = document.getElementById('swipeStage');
  if (!stage) return;

  const user = Bindr.getUser();
  const cardEl = document.getElementById('swipeCard');
  const banner = document.getElementById('matchBanner');
  const empty = document.getElementById('swipeEmpty');

  if (!user || !user.supabaseId) {
    cardEl.style.display = 'none';
    empty.style.display = 'block';
    return;
  }

  cardEl.querySelector('.photo').textContent = '…';
  cardEl.querySelector('h2').textContent = 'Loading profiles';
  cardEl.querySelector('.tagline').textContent = '';
  cardEl.querySelector('.bio').textContent = '';
  cardEl.querySelector('.chips').innerHTML = '';

  let deck = [];
  async function loadDeck() {
    try {
      let profiles = await fetchSwipeableProfiles(user.supabaseId);
      deck = applyFilters(profiles, Bindr.getFilters());
    } catch (err) {
      console.error('Failed to load profiles:', err);
    }
  }
  await loadDeck();

  document.addEventListener('bindr:filtersChanged', async () => {
    await loadDeck();
    if (empty) empty.style.display = 'none';
    render();
  });

  function render() {
    if (!deck.length) {
      cardEl.style.display = 'none';
      empty.style.display = 'block';
      return;
    }
    const p = profileToCardData(deck[0]);
    cardEl.style.display = 'block';
    cardEl.classList.remove('swipe-left', 'swipe-right');
    cardEl.querySelector('.photo').textContent = p.initials;
    cardEl.querySelector('h2').textContent = p.name;
    cardEl.querySelector('.tagline').textContent = p.tagline;
    cardEl.querySelector('.bio').textContent = p.bio;
    const chipsWrap = cardEl.querySelector('.chips');
    chipsWrap.innerHTML = '';
    p.chips.forEach(c => {
      const span = document.createElement('span');
      span.className = 'chip';
      span.textContent = c;
      chipsWrap.appendChild(span);
    });
  }

  async function swipe(direction) {
    if (!deck.length) return;
    const profile = deck[0];
    const cardData = profileToCardData(profile);
    cardEl.classList.add(direction === 'right' ? 'swipe-right' : 'swipe-left');

    try {
      await recordSwipe(user.supabaseId, profile.id, direction);
      if (direction === 'right') {
        const isMatch = await checkMutualMatch(user.supabaseId, profile.id);
        if (isMatch) {
          Bindr.addMatch(cardData);
          banner.classList.add('show');
          banner.querySelector('.match-name').textContent = cardData.name;
          setTimeout(() => banner.classList.remove('show'), 1800);
        }
      }
    } catch (err) {
      console.error('Swipe error:', err);
    }

    setTimeout(() => { deck.shift(); render(); }, 320);
  }

  document.getElementById('btnPass')?.addEventListener('click', () => swipe('left'));
  document.getElementById('btnMatch')?.addEventListener('click', () => swipe('right'));
  document.getElementById('btnReset')?.addEventListener('click', async () => {
    try {
      await loadDeck();
      empty.style.display = 'none';
      render();
    } catch (err) { console.error(err); }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight') swipe('right');
    if (e.key === 'ArrowLeft') swipe('left');
  });

  render();
}

// ---------- Matches page ----------
async function initMatchesPage() {
  const grid = document.getElementById('matchGrid');
  if (!grid) return;

  const user = Bindr.getUser();
  const empty = document.getElementById('matchesEmpty');

  if (!user || !user.supabaseId) {
    if (empty) empty.style.display = 'block';
    return;
  }

  try {
    const matches = await fetchMatchedProfiles(user.supabaseId);
    if (!matches.length) {
      if (empty) empty.style.display = 'block';
      return;
    }

    grid.innerHTML = matches.map(p => {
      const cd = profileToCardData(p);
      return `
        <div class="match-card" data-id="${p.id}">
          <div class="mc-photo">${cd.initials}</div>
          <div class="mc-info">
            <div class="mc-name">${cd.name}</div>
            <div class="mc-role">${cd.tagline}</div>
          </div>
        </div>`;
    }).join('');

    grid.querySelectorAll('.match-card').forEach(c => {
      c.addEventListener('click', () => {
        window.location.href = `messages.html?with=${c.getAttribute('data-id')}`;
      });
    });
  } catch (err) {
    console.error('Failed to load matches:', err);
    if (empty) empty.style.display = 'block';
  }
}

// ---------- Profile photo upload prompt ----------
function initProfilePhotoPrompt() {
  document.querySelectorAll('.profile-photo, [data-upload-photo]').forEach(el => {
    el.addEventListener('click', () => {
      if (confirm('Upload a new profile photo?')) {
        alert('In the live app this would open a file picker.');
      }
    });
  });
}

// ---------- Header user name ----------
function initUserHeader() {
  const user = Bindr.getUser();
  if (!user) return;
  const display = user.firstName
    ? `${user.firstName} ${(user.lastName || '').charAt(0)}.`.trim()
    : user.name || 'Profile';
  document.querySelectorAll('[data-user-name]').forEach(el => { el.textContent = display; });
}

// ---------- Profile stats ----------
function initProfileStats() {
  const matchCount = Bindr.getMatches().length;
  const activeCount = Bindr.getActiveConvos().length;
  const replyPct = matchCount > 0 ? Math.round((activeCount / matchCount) * 100) : 0;
  const matchEl = document.querySelector('[data-stat="matches"]');
  const activeEl = document.querySelector('[data-stat="active"]');
  const replyEl = document.querySelector('[data-stat="reply"]');
  if (matchEl) matchEl.textContent = matchCount;
  if (activeEl) activeEl.textContent = activeCount;
  if (replyEl) replyEl.textContent = replyPct + '%';
}

// ---------- Profile page ----------
function initProfilePage() {
  const user = Bindr.getUser();
  if (!user) return;

  const role = user.role || 'personal';

  document.querySelectorAll('[data-role-grid]').forEach(grid => {
    grid.style.display = grid.getAttribute('data-role-grid') === role ? '' : 'none';
  });

  document.querySelectorAll('[data-field]').forEach(el => {
    const key = el.getAttribute('data-field');
    if (user[key] !== undefined && user[key] !== '') el.textContent = user[key];
  });

  const subtitleEl = document.getElementById('profileSubtitle');
  const metaEl = document.getElementById('profileMeta');
  const crumbEl = document.getElementById('profileCrumb');
  const editBtn = document.getElementById('editProfileBtn');

  if (role === 'corporate') {
    if (subtitleEl) subtitleEl.textContent = user.industry || '—';
    if (metaEl) metaEl.textContent = user.yearFounded ? `Est. ${user.yearFounded}` : '';
    if (crumbEl) crumbEl.textContent = 'Profile · Corporate';
    if (editBtn) editBtn.href = 'signup-corporate.html';
  } else if (role === 'student') {
    if (subtitleEl) subtitleEl.textContent = user.school || '—';
    if (metaEl) metaEl.textContent = [user.major, user.graduatingYear ? `Class of ${user.graduatingYear}` : ''].filter(Boolean).join(' · ');
    if (crumbEl) crumbEl.textContent = 'Profile · Student';
    if (editBtn) editBtn.href = 'signup-student.html';
  } else {
    if (subtitleEl) subtitleEl.textContent = user.jobTitle || '—';
    if (metaEl) metaEl.textContent = user.pronouns || '';
    if (crumbEl) crumbEl.textContent = 'Profile · Personal';
    if (editBtn) editBtn.href = 'signup-personal.html';
  }
}

// ---------- Editable fields ----------
function initEditableFields() {
  document.querySelectorAll('.info-block .edit').forEach(btn => {
    btn.addEventListener('click', () => {
      const block = btn.closest('.info-block');
      const valEl = block.querySelector('.v');
      const fieldKey = valEl.getAttribute('data-field');
      const current = valEl.textContent === '—' ? '' : valEl.textContent;
      const next = prompt('Edit value:', current);
      if (next !== null && next.trim()) {
        valEl.textContent = next.trim();
        if (fieldKey) {
          const user = Bindr.getUser() || {};
          user[fieldKey] = next.trim();
          if (fieldKey === 'firstName' || fieldKey === 'lastName') {
            user.name = `${user.firstName || ''} ${user.lastName || ''}`.trim();
            if (user.firstName && user.lastName) {
              user.initials = user.firstName[0].toUpperCase() + user.lastName[0].toUpperCase();
            }
          }
          Bindr.setUser(user);
          if (user.supabaseId) {
            sbFetch(`profiles?id=eq.${user.supabaseId}`, {
              method: 'PATCH',
              prefer: 'return=minimal',
              body: JSON.stringify({ name: user.name, initials: user.initials, profile_data: user })
            }).catch(console.error);
          }
          document.querySelectorAll(`[data-field="${fieldKey}"]`).forEach(el => {
            if (el !== valEl) el.textContent = next.trim();
          });
          if (fieldKey === 'firstName' || fieldKey === 'lastName') {
            document.querySelectorAll('[data-field="name"]').forEach(el => { el.textContent = user.name; });
            document.querySelectorAll('[data-field="initials"]').forEach(el => {
              el.textContent = user.initials || user.name.slice(0, 2).toUpperCase();
            });
          }
        }
      }
    });
  });
}

// ---------- Messages page ----------
async function initMessagesPage() {
  const threadList = document.getElementById('msgThreadList');
  if (!threadList) return;

  const user = Bindr.getUser();
  if (!user || !user.supabaseId) {
    threadList.innerHTML = '<div style="padding:16px;color:var(--muted);font-size:0.9rem;">Please log in to view messages.</div>';
    return;
  }

  const convEmpty  = document.getElementById('msgConvEmpty');
  const convActive = document.getElementById('msgConvActive');
  const convHeader = document.getElementById('msgConvHeader');
  const convBody   = document.getElementById('msgConvBody');
  const input      = document.getElementById('msgInput');
  const sendBtn    = document.getElementById('msgSend');

  let activeMatchId   = null;
  let activeMatchName = '';
  let pollInterval    = null;
  let lastMsgCount    = 0;

  // ---------- Load thread list ----------
  async function loadThreads() {
    let matches = [];
    try { matches = await fetchMatchedProfiles(user.supabaseId); }
    catch (err) { console.error('Thread load error:', err); }

    if (!matches.length) {
      threadList.innerHTML = '<div style="padding:16px;color:var(--muted);font-size:0.9rem;">No matches yet — start swiping!</div>';
      return;
    }

    // Fetch last message for each match in parallel
    const threads = await Promise.all(matches.map(async m => {
      let lastMsg = null;
      try {
        const msgs = await sbFetch(
          `messages?or=(and(sender_id.eq.${user.supabaseId},receiver_id.eq.${m.id}),and(sender_id.eq.${m.id},receiver_id.eq.${user.supabaseId}))&order=created_at.desc&limit=1`
        );
        lastMsg = msgs[0] || null;
      } catch {}
      return { profile: m, lastMsg };
    }));

    // Sort: conversations with messages first, then by most recent
    threads.sort((a, b) => {
      if (!a.lastMsg && !b.lastMsg) return 0;
      if (!a.lastMsg) return 1;
      if (!b.lastMsg) return -1;
      return new Date(b.lastMsg.created_at) - new Date(a.lastMsg.created_at);
    });

    threadList.innerHTML = threads.map(({ profile, lastMsg }) => {
      const cd = profileToCardData(profile);
      const preview = lastMsg
        ? escapeHtml(lastMsg.content.length > 40 ? lastMsg.content.slice(0, 40) + '…' : lastMsg.content)
        : 'New match — say hello! 👋';
      return `
        <div class="msg-thread-item" data-match-id="${profile.id}" data-initials="${cd.initials}" data-name="${escapeHtml(cd.name)}">
          <div class="av">${cd.initials}</div>
          <div class="info">
            <div class="nm">${escapeHtml(cd.name)}</div>
            <div class="preview">${preview}</div>
          </div>
        </div>`;
    }).join('');

    threadList.querySelectorAll('.msg-thread-item').forEach(item => {
      item.addEventListener('click', () => {
        threadList.querySelectorAll('.msg-thread-item').forEach(i => i.classList.remove('active'));
        item.classList.add('active');
        openConversation(
          item.getAttribute('data-match-id'),
          item.getAttribute('data-name'),
          item.getAttribute('data-initials')
        );
      });
    });

    // Auto-open from URL param (?with=PROFILE_ID)
    const withId = new URLSearchParams(window.location.search).get('with');
    if (withId) {
      const item = threadList.querySelector(`[data-match-id="${withId}"]`);
      if (item) item.click();
    }
  }

  // ---------- Open a conversation ----------
  function openConversation(matchId, name, initials) {
    activeMatchId   = matchId;
    activeMatchName = name;
    lastMsgCount    = 0;

    convHeader.innerHTML = `
      <div class="av" style="width:40px;height:40px;border-radius:50%;background:linear-gradient(135deg,var(--purple-300),var(--purple-600));display:grid;place-items:center;color:white;font-weight:700;flex-shrink:0;">${initials}</div>
      <div>
        <div style="font-weight:600;">${escapeHtml(name)}</div>
        <div style="color:var(--muted);font-size:0.84rem;">Bindr match</div>
      </div>`;

    convEmpty.style.display  = 'none';
    convActive.style.display = '';
    input.disabled           = false;
    input.placeholder        = `Message ${name}…`;
    sendBtn.disabled         = false;

    loadMessages();

    if (pollInterval) clearInterval(pollInterval);
    pollInterval = setInterval(() => loadMessages(true), 3000);
  }

  // ---------- Load messages ----------
  async function loadMessages(silent = false) {
    if (!activeMatchId) return;
    let msgs = [];
    try {
      msgs = await sbFetch(
        `messages?or=(and(sender_id.eq.${user.supabaseId},receiver_id.eq.${activeMatchId}),and(sender_id.eq.${activeMatchId},receiver_id.eq.${user.supabaseId}))&order=created_at.asc`
      );
    } catch (err) {
      console.error('Message load error:', err);
      return;
    }

    if (silent && msgs.length === lastMsgCount) return;
    lastMsgCount = msgs.length;

    const atBottom = convBody.scrollHeight - convBody.scrollTop <= convBody.clientHeight + 60;

    convBody.innerHTML = msgs.length
      ? msgs.map(m => `<div class="bubble ${m.sender_id === user.supabaseId ? 'me' : 'them'}">${escapeHtml(m.content)}</div>`).join('')
      : '<div style="text-align:center;color:var(--muted);padding:40px 20px;font-size:0.9rem;">No messages yet — say hello!</div>';

    if (!silent || atBottom) convBody.scrollTop = convBody.scrollHeight;

    // Update thread preview with latest message
    if (msgs.length) {
      const last = msgs[msgs.length - 1];
      const preview = threadList.querySelector(`[data-match-id="${activeMatchId}"] .preview`);
      if (preview) preview.textContent = last.content.length > 40 ? last.content.slice(0, 40) + '…' : last.content;
    }
  }

  // ---------- Send a message ----------
  async function sendMessage() {
    const content = input.value.trim();
    if (!content || !activeMatchId) return;
    input.value   = '';
    sendBtn.disabled = true;
    try {
      await sbFetch('messages', {
        method: 'POST',
        prefer: 'return=minimal',
        body: JSON.stringify({ sender_id: user.supabaseId, receiver_id: activeMatchId, content })
      });
      Bindr.addActiveConvo(activeMatchId);
      await loadMessages();
    } catch (err) {
      console.error('Send error:', err);
      input.value = content;
    } finally {
      sendBtn.disabled = false;
      input.focus();
    }
  }

  sendBtn?.addEventListener('click', sendMessage);
  input?.addEventListener('keydown', e => { if (e.key === 'Enter') sendMessage(); });
  window.addEventListener('beforeunload', () => { if (pollInterval) clearInterval(pollInterval); });

  await loadThreads();
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ---------- Pricing cards ----------
function initPricingCards() {
  document.querySelectorAll('[data-tier]').forEach(card => {
    card.addEventListener('click', () => {
      const tier = card.getAttribute('data-tier');
      if (tier === 'student') window.location.href = 'signup-student.html';
      else if (tier === 'corporate') window.location.href = 'signup-corporate.html';
      else window.location.href = 'signup-personal.html';
    });
  });
}

// ---------- Map ----------
function initMapPage() {
  const stage = document.getElementById('mapStage');
  if (!stage) return;
  const positions = [
    { l: '14%', t: '32%' }, { l: '22%', t: '52%' }, { l: '31%', t: '38%' },
    { l: '40%', t: '60%' }, { l: '48%', t: '28%' }, { l: '55%', t: '46%' },
    { l: '63%', t: '34%' }, { l: '70%', t: '58%' }, { l: '78%', t: '40%' },
    { l: '86%', t: '52%' }, { l: '36%', t: '70%' }, { l: '58%', t: '70%' }
  ];
  positions.forEach(p => {
    const pin = document.createElement('div');
    pin.className = 'map-pin';
    pin.style.left = p.l;
    pin.style.top = p.t;
    stage.appendChild(pin);
  });
}

// ---------- Signup forms ----------
async function initSignupForms() {
  document.querySelectorAll('form[data-signup-flow]').forEach(form => {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const submitBtn = form.querySelector('[type="submit"]');
      const originalText = submitBtn.textContent;
      submitBtn.textContent = 'Creating profile…';
      submitBtn.disabled = true;

      const role = form.getAttribute('data-signup-flow');
      const data = { role };
      form.querySelectorAll('[name]').forEach(input => {
        if (input.value.trim()) data[input.name] = input.value.trim();
      });

      if (data.firstName || data.lastName) {
        data.name = `${data.firstName || ''} ${data.lastName || ''}`.trim();
      } else if (data.companyName) {
        data.name = data.companyName;
      }
      if (data.firstName && data.lastName) {
        data.initials = data.firstName[0].toUpperCase() + data.lastName[0].toUpperCase();
      } else if (data.companyName) {
        data.initials = data.companyName.slice(0, 2).toUpperCase();
      }

      const pendingEmail = Bindr.getPendingEmail();
      if (pendingEmail) data.email = pendingEmail;

      try {
        const profile = await saveProfileToSupabase(data);
        if (!profile || !profile.id) throw new Error('No profile returned from Supabase');
        data.supabaseId = profile.id;
        Bindr.setUser(data);
        Bindr.clearPendingEmail();
        window.location.href = 'home.html';
      } catch (err) {
        console.error('Signup error:', err);
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
        alert(`Signup failed: ${err.message}\n\nCheck the browser console (F12) for details.`);
      }
    });
  });
}

// ---------- Filter logic ----------
function applyFilters(profiles, filters) {
  if (!filters || !Object.keys(filters).length) return profiles;

  return profiles.filter(p => {
    const pd = p.profile_data || {};

    // Role / profile type
    if (filters.role && filters.role.length) {
      if (!filters.role.includes(p.role)) return false;
    }

    // Industry — match against profile_data.industry (corporate) or any text for personal/student
    if (filters.industry && filters.industry.length) {
      const pdIndustry = (pd.industry || '').toLowerCase();
      const haystack = [pd.industry, pd.jobTitle, pd.searchingFor, pd.description, pd.listings, pd.major]
        .filter(Boolean).join(' ').toLowerCase();
      const matched = filters.industry.some(ind => {
        const indLower = ind.toLowerCase();
        return pdIndustry.includes(indLower) || haystack.includes(indLower);
      });
      if (!matched) return false;
    }

    // Location text search
    if (filters.locationText) {
      const q = filters.locationText.toLowerCase();
      const hay = [pd.contact, pd.searchingFor, pd.description, pd.jobTitle, pd.school, pd.city, pd.location]
        .filter(Boolean).join(' ').toLowerCase();
      if (!hay.includes(q)) return false;
    }

    // Remote only
    if (filters.remoteOnly) {
      const hay = [pd.contact, pd.searchingFor, pd.description, pd.listings]
        .filter(Boolean).join(' ').toLowerCase();
      if (!hay.includes('remote')) return false;
    }

    // Salary min/max
    if ((filters.salaryMin || filters.salaryMax) && pd.salary) {
      const num = parseInt(String(pd.salary).replace(/[^\d]/g, ''), 10);
      if (!isNaN(num)) {
        if (filters.salaryMin && num < filters.salaryMin) return false;
        if (filters.salaryMax && num > filters.salaryMax) return false;
      }
    }

    // Skills / keyword match (all terms must appear somewhere in the profile)
    if (filters.skillsKeywords) {
      const kws = filters.skillsKeywords.split(',').map(k => k.trim().toLowerCase()).filter(Boolean);
      if (kws.length) {
        const hay = [pd.searchingFor, pd.description, pd.jobTitle, pd.major, pd.listings, pd.skills, pd.coverLetter]
          .filter(Boolean).join(' ').toLowerCase();
        if (!kws.every(kw => hay.includes(kw))) return false;
      }
    }

    // Employment type — soft match against free-text fields
    if (filters.empType && filters.empType.length) {
      const hay = [pd.searchingFor, pd.listings, pd.description]
        .filter(Boolean).join(' ').toLowerCase();
      const aliasMap = { 'full-time': ['full time', 'full-time', 'fulltime'], 'part-time': ['part time', 'part-time', 'parttime'], 'contract': ['contract'], 'internship': ['intern', 'co-op', 'coop'], 'freelance': ['freelance', 'freelancer'], 'seasonal': ['seasonal'] };
      const matched = filters.empType.some(et => (aliasMap[et] || [et]).some(alias => hay.includes(alias)));
      if (!matched && hay.length > 0) return false;
    }

    // Matching preferences (resume / portfolio / cover letter)
    if (filters.matchPref && filters.matchPref.length) {
      if (filters.matchPref.includes('with-resume') && !pd.resume) return false;
      if (filters.matchPref.includes('with-cover-letter') && !pd.coverLetter) return false;
      if (filters.matchPref.includes('with-portfolio') && !pd.portfolioLink) return false;
    }

    return true;
  });
}

// ---------- Filter panel UI ----------
function initFilterPanel() {
  const panel = document.getElementById('filterPanel');
  if (!panel) return;

  const overlay  = document.getElementById('filterOverlay');
  const filterBtn = document.getElementById('btnFilters');
  const closeBtn  = document.getElementById('filterClose');
  const applyBtn  = document.getElementById('btnApplyFilters');
  const clearBtn  = document.getElementById('btnClearFilters');
  const saveBtn   = document.getElementById('btnSaveFilter');

  const CHECKBOX_GROUPS = ['role', 'industry', 'empType', 'expLevel', 'compSize', 'compAttr', 'availability', 'intent', 'matchPref'];

  function openPanel() {
    panel.classList.add('open');
    overlay.classList.add('show');
    document.body.style.overflow = 'hidden';
  }
  function closePanel() {
    panel.classList.remove('open');
    overlay.classList.remove('show');
    document.body.style.overflow = '';
  }

  filterBtn?.addEventListener('click', openPanel);
  closeBtn?.addEventListener('click', closePanel);
  overlay?.addEventListener('click', closePanel);

  // Collapsible section headers
  document.querySelectorAll('#filterPanel .filter-section-title[data-toggle]').forEach(title => {
    const group = document.getElementById(title.getAttribute('data-toggle'));
    if (!group) return;
    title.addEventListener('click', () => {
      const isCollapsed = group.classList.toggle('collapsed');
      title.classList.toggle('collapsed', isCollapsed);
    });
  });

  // Industry search — hide non-matching labels and their group headers
  const industrySearch = document.getElementById('filterIndustrySearch');
  industrySearch?.addEventListener('input', () => {
    const q = industrySearch.value.trim().toLowerCase();
    const scroll = document.getElementById('filterIndustryScroll');
    if (!scroll) return;
    const headers = scroll.querySelectorAll('.filter-industry-header');
    const labels  = scroll.querySelectorAll('label.filter-sub');

    labels.forEach(lbl => {
      const text = lbl.textContent.toLowerCase();
      lbl.classList.toggle('hidden', q.length > 0 && !text.includes(q));
    });

    // Hide group headers that have no visible labels following them
    headers.forEach(hdr => {
      let sib = hdr.nextElementSibling;
      let anyVisible = false;
      while (sib && !sib.classList.contains('filter-industry-header')) {
        if (!sib.classList.contains('hidden')) anyVisible = true;
        sib = sib.nextElementSibling;
      }
      hdr.classList.toggle('hidden', !anyVisible && q.length > 0);
    });
  });

  function readFiltersFromPanel() {
    const f = {};
    CHECKBOX_GROUPS.forEach(name => {
      const checked = [...panel.querySelectorAll(`[name="${name}"]:checked`)].map(cb => cb.value);
      if (checked.length) f[name] = checked;
    });
    if (panel.querySelector('[name="remoteOnly"]:checked')) f.remoteOnly = true;
    if (panel.querySelector('[name="equityOk"]:checked')) f.equityOk = true;
    const loc = document.getElementById('filterLocationInput')?.value.trim();
    if (loc) f.locationText = loc;
    const skills = document.getElementById('filterSkillsInput')?.value.trim();
    if (skills) f.skillsKeywords = skills;
    const salMin = document.getElementById('filterSalMin')?.value.trim();
    if (salMin) f.salaryMin = parseInt(salMin, 10);
    const salMax = document.getElementById('filterSalMax')?.value.trim();
    if (salMax) f.salaryMax = parseInt(salMax, 10);
    return f;
  }

  function loadFiltersIntoPanel(f) {
    f = f || {};
    CHECKBOX_GROUPS.forEach(name => {
      panel.querySelectorAll(`[name="${name}"]`).forEach(cb => {
        cb.checked = (f[name] || []).includes(cb.value);
      });
    });
    const remCb = panel.querySelector('[name="remoteOnly"]');
    if (remCb) remCb.checked = !!f.remoteOnly;
    const eqCb = panel.querySelector('[name="equityOk"]');
    if (eqCb) eqCb.checked = !!f.equityOk;
    const locEl = document.getElementById('filterLocationInput');
    if (locEl) locEl.value = f.locationText || '';
    const skillEl = document.getElementById('filterSkillsInput');
    if (skillEl) skillEl.value = f.skillsKeywords || '';
    const salMinEl = document.getElementById('filterSalMin');
    if (salMinEl) salMinEl.value = f.salaryMin || '';
    const salMaxEl = document.getElementById('filterSalMax');
    if (salMaxEl) salMaxEl.value = f.salaryMax || '';
  }

  function countActiveFilters(f) {
    if (!f) return 0;
    let n = 0;
    CHECKBOX_GROUPS.forEach(k => { if (f[k] && f[k].length) n += f[k].length; });
    if (f.remoteOnly) n++;
    if (f.equityOk) n++;
    if (f.locationText) n++;
    if (f.skillsKeywords) n++;
    if (f.salaryMin) n++;
    if (f.salaryMax) n++;
    return n;
  }

  function updateBadge(f) {
    const badge = document.getElementById('filterBadge');
    if (!badge) return;
    const n = countActiveFilters(f);
    badge.textContent = n;
    badge.style.display = n > 0 ? 'inline-grid' : 'none';
  }

  function renderSavedFilters() {
    const list = document.getElementById('savedFiltersList');
    if (!list) return;
    const saved = Bindr.getSavedFilters();
    if (!saved.length) {
      list.innerHTML = '<div class="filter-empty-saved">No saved filters yet.</div>';
      return;
    }
    list.innerHTML = saved.map((s, i) => `
      <div class="saved-filter-chip">
        <span class="sfc-name" data-idx="${i}">${escapeHtml(s.name)}</span>
        <span class="sfc-del" data-idx="${i}" title="Delete">✕</span>
      </div>`).join('');

    list.querySelectorAll('.sfc-name').forEach(el => {
      el.addEventListener('click', () => {
        const sf = Bindr.getSavedFilters()[parseInt(el.getAttribute('data-idx'))];
        if (sf) loadFiltersIntoPanel(sf.filters);
      });
    });
    list.querySelectorAll('.sfc-del').forEach(el => {
      el.addEventListener('click', () => {
        const arr = Bindr.getSavedFilters();
        arr.splice(parseInt(el.getAttribute('data-idx')), 1);
        Bindr.setSavedFilters(arr);
        renderSavedFilters();
      });
    });
  }

  saveBtn?.addEventListener('click', () => {
    const nameInput = document.getElementById('saveFilterName');
    const name = nameInput?.value.trim();
    if (!name) { nameInput?.focus(); return; }
    const arr = Bindr.getSavedFilters();
    arr.push({ name, filters: readFiltersFromPanel() });
    Bindr.setSavedFilters(arr);
    if (nameInput) nameInput.value = '';
    renderSavedFilters();
  });

  applyBtn?.addEventListener('click', () => {
    const f = readFiltersFromPanel();
    Bindr.setFilters(f);
    updateBadge(f);
    closePanel();
    document.dispatchEvent(new CustomEvent('bindr:filtersChanged'));
  });

  clearBtn?.addEventListener('click', () => {
    loadFiltersIntoPanel({});
  });

  // Init from saved state
  const existing = Bindr.getFilters();
  loadFiltersIntoPanel(existing);
  updateBadge(existing);
  renderSavedFilters();
}

// ---------- Boot ----------
document.addEventListener('DOMContentLoaded', () => {
  initLoginPage();
  initUserHeader();
  initSwipePage();
  initMatchesPage();
  initProfilePhotoPrompt();
  initProfilePage();
  initProfileStats();
  initEditableFields();
  initMessagesPage();
  initPricingCards();
  initMapPage();
  initSignupForms();
  initFilterPanel();
});
