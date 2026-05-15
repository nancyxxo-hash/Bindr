/* ==========================================================================
   Bindr — prototype interactivity
   ========================================================================== */

// ---------- Mock dataset of swipe-able profiles ----------
const SAMPLE_PROFILES = [
  {
    id: 'p1', initials: 'AK', name: 'Aisha Kapoor',
    tagline: 'Senior Product Designer · Toronto',
    bio: 'Looking for a startup with strong design culture. 8 years in fintech. Available July.',
    chips: ['Design', 'Fintech', 'Remote-OK']
  },
  {
    id: 'p2', initials: 'NS', name: 'Northwood Studio',
    tagline: 'Boutique brand agency · NYC',
    bio: 'Hiring 2 senior designers and a writer. Equity available for early hires.',
    chips: ['Hiring', 'Brand', 'Series A']
  },
  {
    id: 'p3', initials: 'MV', name: 'Marco Velez',
    tagline: 'CS @ Waterloo · Class of 2027',
    bio: 'Looking for a summer internship in ML or systems. Past work: Shopify, Stripe.',
    chips: ['Student', 'ML', 'Internship']
  },
  {
    id: 'p4', initials: 'LM', name: 'Lumina Capital',
    tagline: 'Early-stage VC · San Francisco',
    bio: 'Investing $250k–$2M in pre-seed B2B SaaS. Looking for technical co-founders.',
    chips: ['Investor', 'B2B', 'Pre-seed']
  },
  {
    id: 'p5', initials: 'JT', name: 'Jules Thompson',
    tagline: 'Marketing Lead · Looking',
    bio: 'Open to fractional or full-time. 12 years in growth. Last role scaled to $40M ARR.',
    chips: ['Marketing', 'Growth', 'Fractional']
  },
  {
    id: 'p6', initials: 'RH', name: 'Rivera Health',
    tagline: 'Series B HealthTech · Austin',
    bio: 'Building the next-gen patient platform. Hiring eng, design, and ops.',
    chips: ['Hiring', 'Health', 'Series B']
  },
  {
    id: 'p7', initials: 'EO', name: 'Emeka Okafor',
    tagline: 'Full-stack engineer · Lagos',
    bio: '6 years building developer tools. Looking for remote roles in DevTools or AI infra.',
    chips: ['Engineering', 'Remote', 'DevTools']
  },
  {
    id: 'p8', initials: 'BC', name: 'Beacon College',
    tagline: 'Career services · Boston',
    bio: 'Connecting our 800 graduating students to startup opportunities each year.',
    chips: ['School', 'Partnerships', 'Talent']
  }
];

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
  getDeck() {
    try { return JSON.parse(localStorage.getItem('bindr.deck') || 'null'); }
    catch { return null; }
  },
  setDeck(arr) { localStorage.setItem('bindr.deck', JSON.stringify(arr)); },
  getUser() {
    try { return JSON.parse(localStorage.getItem('bindr.user') || 'null'); }
    catch { return null; }
  },
  setUser(u) { localStorage.setItem('bindr.user', JSON.stringify(u)); },
  resetDeck() {
    localStorage.removeItem('bindr.deck');
    localStorage.removeItem('bindr.matches');
  }
};

// ---------- Login page (binder cover) ----------
function initLoginPage() {
  const loginBtn = document.getElementById('btnShowLogin');
  const signupBtn = document.getElementById('btnShowSignup');
  const loginForm = document.getElementById('formLogin');
  const signupForm = document.getElementById('formSignup');

  if (loginBtn) {
    loginBtn.addEventListener('click', () => {
      loginForm?.classList.add('show');
      signupForm?.classList.remove('show');
    });
  }
  if (signupBtn) {
    signupBtn.addEventListener('click', () => {
      signupForm?.classList.add('show');
      loginForm?.classList.remove('show');
    });
  }
  loginForm?.addEventListener('submit', (e) => {
    e.preventDefault();
    const email = document.getElementById('loginEmail')?.value || 'demo@bindr.app';
    Bindr.setUser({ email, role: 'personal', name: email.split('@')[0] });
    window.location.href = 'home.html';
  });
  signupForm?.addEventListener('submit', (e) => {
    e.preventDefault();
    window.location.href = 'subscriptions.html';
  });
}

// ---------- Swipe / home page ----------
function initSwipePage() {
  const stage = document.getElementById('swipeStage');
  if (!stage) return;

  let deck = Bindr.getDeck();
  if (!deck) {
    deck = [...SAMPLE_PROFILES];
    Bindr.setDeck(deck);
  }

  const cardEl = document.getElementById('swipeCard');
  const banner = document.getElementById('matchBanner');
  const empty = document.getElementById('swipeEmpty');

  function render() {
    if (!deck.length) {
      cardEl.style.display = 'none';
      empty.style.display = 'block';
      return;
    }
    const p = deck[0];
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

  function swipe(direction) {
    if (!deck.length) return;
    const p = deck[0];
    cardEl.classList.add(direction === 'right' ? 'swipe-right' : 'swipe-left');
    if (direction === 'right') {
      Bindr.addMatch(p);
      // 50% chance of "match" feedback animation
      if (Math.random() > 0.4) {
        banner.classList.add('show');
        banner.querySelector('.match-name').textContent = p.name;
        setTimeout(() => banner.classList.remove('show'), 1800);
      }
    }
    setTimeout(() => {
      deck.shift();
      Bindr.setDeck(deck);
      render();
    }, 320);
  }

  document.getElementById('btnPass')?.addEventListener('click', () => swipe('left'));
  document.getElementById('btnMatch')?.addEventListener('click', () => swipe('right'));
  document.getElementById('btnReset')?.addEventListener('click', () => {
    Bindr.resetDeck();
    deck = [...SAMPLE_PROFILES];
    Bindr.setDeck(deck);
    empty.style.display = 'none';
    render();
  });

  // Keyboard arrows
  document.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight') swipe('right');
    if (e.key === 'ArrowLeft') swipe('left');
  });

  render();
}

// ---------- Matches page ----------
function initMatchesPage() {
  const grid = document.getElementById('matchGrid');
  if (!grid) return;

  const matches = Bindr.getMatches();
  const empty = document.getElementById('matchesEmpty');

  if (!matches.length) {
    if (empty) empty.style.display = 'block';
    return;
  }

  grid.innerHTML = matches.map(p => `
    <div class="match-card" data-id="${p.id}">
      <div class="mc-photo">${p.initials}</div>
      <div class="mc-info">
        <div class="mc-name">${p.name}</div>
        <div class="mc-role">${p.tagline}</div>
      </div>
    </div>
  `).join('');

  // Clicking a match card sends you to messages (demo)
  grid.querySelectorAll('.match-card').forEach(c => {
    c.addEventListener('click', () => { window.location.href = 'messages.html'; });
  });
}

// ---------- Profile photo upload prompt (demo) ----------
function initProfilePhotoPrompt() {
  document.querySelectorAll('.profile-photo, [data-upload-photo]').forEach(el => {
    el.addEventListener('click', () => {
      const ok = confirm('Upload a new profile photo?');
      if (ok) alert('In the live app this would open a file picker.');
    });
  });
}

// ---------- Edit-field — update DOM and persist to localStorage ----------
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
          // Refresh any sidebar elements that mirror this field
          document.querySelectorAll(`[data-field="${fieldKey}"]`).forEach(el => {
            if (el !== valEl) el.textContent = next.trim();
          });
          if (fieldKey === 'firstName' || fieldKey === 'lastName') {
            document.querySelectorAll('[data-field="name"]').forEach(el => { el.textContent = user.name; });
            document.querySelectorAll('[data-field="initials"]').forEach(el => { el.textContent = user.initials || user.name.slice(0,2).toUpperCase(); });
          }
        }
      }
    });
  });
}

// ---------- Messages page (mock conversation) ----------
function initMessagesPage() {
  const conv = document.getElementById('msgConvBody');
  const input = document.getElementById('msgInput');
  const sendBtn = document.getElementById('msgSend');
  if (!conv || !input || !sendBtn) return;

  function send() {
    const v = input.value.trim();
    if (!v) return;
    const div = document.createElement('div');
    div.className = 'bubble me';
    div.textContent = v;
    conv.appendChild(div);
    input.value = '';
    conv.scrollTop = conv.scrollHeight;

    // Auto-reply demo
    setTimeout(() => {
      const reply = document.createElement('div');
      reply.className = 'bubble them';
      reply.textContent = randomReply();
      conv.appendChild(reply);
      conv.scrollTop = conv.scrollHeight;
    }, 700);
  }

  sendBtn.addEventListener('click', send);
  input.addEventListener('keydown', (e) => { if (e.key === 'Enter') send(); });

  // Switching threads
  document.querySelectorAll('.msg-thread-item').forEach(item => {
    item.addEventListener('click', () => {
      document.querySelectorAll('.msg-thread-item').forEach(i => i.classList.remove('active'));
      item.classList.add('active');
      const name = item.querySelector('.nm').textContent;
      document.querySelectorAll('.msg-conv-name').forEach(el => { el.textContent = name; });
    });
  });
}

function randomReply() {
  const replies = [
    'Sounds good — let me check our calendar.',
    'Happy to chat! What times work for you?',
    'Thanks for reaching out. Are you free for a quick intro call?',
    'Interesting — could you share a portfolio link?',
    'Looking forward to it. Talk soon.'
  ];
  return replies[Math.floor(Math.random() * replies.length)];
}

// ---------- Pricing card "select" => signup ----------
function initPricingCards() {
  document.querySelectorAll('[data-tier]').forEach(card => {
    card.addEventListener('click', () => {
      const tier = card.getAttribute('data-tier');
      // route based on tier
      if (tier === 'student') window.location.href = 'signup-student.html';
      else if (tier === 'corporate') window.location.href = 'signup-corporate.html';
      else window.location.href = 'signup-personal.html';
    });
  });
}

// ---------- Map: drop pins for sample profiles ----------
function initMapPage() {
  const stage = document.getElementById('mapStage');
  if (!stage) return;

  // Pseudo-random but deterministic locations across the rectangle
  const positions = [
    { l: '14%', t: '32%' }, { l: '22%', t: '52%' }, { l: '31%', t: '38%' },
    { l: '40%', t: '60%' }, { l: '48%', t: '28%' }, { l: '55%', t: '46%' },
    { l: '63%', t: '34%' }, { l: '70%', t: '58%' }, { l: '78%', t: '40%' },
    { l: '86%', t: '52%' }, { l: '36%', t: '70%' }, { l: '58%', t: '70%' }
  ];
  positions.forEach((p, i) => {
    const pin = document.createElement('div');
    pin.className = 'map-pin';
    pin.style.left = p.l;
    pin.style.top = p.t;
    pin.title = SAMPLE_PROFILES[i % SAMPLE_PROFILES.length].name;
    stage.appendChild(pin);
  });
}

// ---------- Form submit — save all named fields ----------
function initSignupForms() {
  document.querySelectorAll('form[data-signup-flow]').forEach(form => {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
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
      Bindr.setUser(data);
      window.location.href = 'home.html';
    });
  });
}

// ---------- Profile page — populate from localStorage ----------
function initProfilePage() {
  const user = Bindr.getUser();
  if (!user) return;

  document.querySelectorAll('[data-field]').forEach(el => {
    const key = el.getAttribute('data-field');
    if (user[key] !== undefined && user[key] !== '') {
      el.textContent = user[key];
    }
  });
}

// ---------- Boot all initializers (each is a no-op if its DOM isn't present) ----------
document.addEventListener('DOMContentLoaded', () => {
  initLoginPage();
  initSwipePage();
  initMatchesPage();
  initProfilePhotoPrompt();
  initProfilePage();
  initEditableFields();
  initMessagesPage();
  initPricingCards();
  initMapPage();
  initSignupForms();
});
