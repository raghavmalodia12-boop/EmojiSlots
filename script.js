(() => {
  'use strict';

  /* ---------- Data ---------- */
  const ICONS = {
    cherry: '<path d="M23 36C25 22 31 14 40 9M43 38C42 26 41 17 40 9" fill="none" stroke="#4f8a6a" stroke-width="3" stroke-linecap="round"/><path d="M40 9c8-3 14 0 17 5-8 2-14 0-17-5z" fill="#5f9c7a"/><circle cx="22" cy="46" r="12" fill="#d4503f"/><circle cx="44" cy="48" r="12" fill="#b93a2b"/><circle cx="18" cy="42" r="3.2" fill="#fff" opacity=".35"/><circle cx="40" cy="44" r="3.2" fill="#fff" opacity=".3"/>',
    lemon: '<ellipse cx="32" cy="34" rx="24" ry="17" transform="rotate(-25 32 34)" fill="#ecd35c"/><path d="M9 45l-5 4 7 0zM55 23l5-4-7 0z" fill="#c9ae3a"/><ellipse cx="25" cy="28" rx="8" ry="3" transform="rotate(-25 25 28)" fill="#fff" opacity=".4"/>',
    bell: '<path d="M32 8a4 4 0 0 1 4 4v2c9 2 14 10 14 20v8l6 6H8l6-6v-8c0-10 5-18 14-20v-2a4 4 0 0 1 4-4z" fill="#e0ae52"/><circle cx="32" cy="54" r="5" fill="#a97a2c"/><path d="M20 32c0-6 3-10 8-12" stroke="#fff" stroke-opacity=".45" stroke-width="3" fill="none" stroke-linecap="round"/>',
    clover: '<circle cx="32" cy="19" r="10" fill="#5fa386"/><circle cx="32" cy="43" r="10" fill="#5fa386"/><circle cx="20" cy="31" r="10" fill="#5fa386"/><circle cx="44" cy="31" r="10" fill="#5fa386"/><circle cx="32" cy="31" r="6" fill="#4a8a6f"/><path d="M34 42q4 10 12 16" stroke="#4a8a6f" stroke-width="4" fill="none" stroke-linecap="round"/>',
    star: '<polygon points="32,5 39.5,23 59,24.5 44,37 48.5,56 32,46 15.5,56 20,37 5,24.5 24.5,23" fill="#e0ae52" stroke="#a97a2c" stroke-width="2.5" stroke-linejoin="round"/><polygon points="32,15 36,26 32,32 28,26" fill="#fff" opacity=".35"/>',
    diamond: '<path d="M18 10h28l14 16-28 30L4 26z" fill="#8fd0e6"/><path d="M4 26h56M18 10l-6 16 20 30M46 10l6 16-20 30M32 10l-8 16 8 30 8-30z" fill="none" stroke="#fff" stroke-opacity=".65" stroke-width="2" stroke-linejoin="round"/>',
    seven: '<text x="32" y="52" text-anchor="middle" font-family="Bricolage Grotesque,system-ui,sans-serif" font-size="58" font-weight="800" fill="#d4503f" stroke="#8c2a20" stroke-width="1.5">7</text>'
  };
  const svg = id => `<svg viewBox="0 0 64 64" aria-hidden="true">${ICONS[id]}</svg>`;
  const SYM = [
    { id:'cherry',  name:'Cherry',  pl:'Cherries', w:28, pair:1, triple:7 },
    { id:'lemon',   name:'Lemon',   pl:'Lemons',   w:24, pair:1, triple:9 },
    { id:'bell',    name:'Bell',    pl:'Bells',    w:18, pair:1, triple:12 },
    { id:'clover',  name:'Clover',  pl:'Clovers',  w:14, pair:1, triple:20 },
    { id:'star',    name:'Star',    pl:'Stars',    w: 9, pair:2, triple:40 },
    { id:'diamond', name:'Diamond', pl:'Diamonds', w: 5, pair:3, triple:80 },
    { id:'seven',   name:'Seven',   pl:'Sevens',   w: 2, pair:5, triple:200 }
  ];
  const BY = Object.fromEntries(SYM.map(s => [s.id, s]));
  const BETS = [{v:10,l:1},{v:25,l:1},{v:50,l:1},{v:100,l:2},{v:250,l:4},{v:500,l:6},{v:1000,l:9}];
  const START = 1000;
  const need = l => 80 + 40 * l;
  const GOALS = [
    { id:'streak', text:'Win 3 spins in a row', target:3, reward:150, step:(p,e) => e.win ? p + 1 : 0 },
    { id:'wins',   text:'Win 6 spins',          target:6, reward:200, step:(p,e) => p + (e.win ? 1 : 0) },
    { id:'triple', text:'Land three of a kind', target:1, reward:300, step:(p,e) => e.triple ? 1 : p },
    { id:'big',    text:'Win 400 or more in one spin', target:1, reward:400, step:(p,e) => e.payout >= 400 ? 1 : p },
    { id:'play',   text:'Play 20 spins',        target:20, reward:120, step:p => p + 1 }
  ];

  /* ---------- State ---------- */
  const KEY = 'emojislots.v2';
  const saved = (() => { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { return {}; } })();
  const state = {
    balance: saved.balance > 0 || saved.balance === 0 ? saved.balance : START,
    betIndex: saved.betIndex ?? 1, level: saved.level || 1, xp: saved.xp || 0,
    best: saved.best || 0, spins: saved.spins || 0,
    goal: saved.goal && GOALS.find(g => g.id === saved.goal.id) ? saved.goal : null,
    music: saved.music !== false, sound: saved.sound !== false,
    spinning: false, auto: false, shown: [[], [], []]
  };
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify({
    balance: state.balance, betIndex: state.betIndex, level: state.level, xp: state.xp, best: state.best,
    spins: state.spins, goal: state.goal, music: state.music, sound: state.sound })); } catch (e) {} };

  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = id => document.getElementById(id);
  const reels = [...document.querySelectorAll('.reel')];
  const strips = reels.map(r => r.querySelector('.strip'));
  const fmt = n => Math.round(n).toLocaleString('en-US');
  const bet = () => BETS[state.betIndex].v;
  const goalDef = () => GOALS.find(g => g.id === state.goal.id);

  function pick() {
    let r = Math.random() * 100;
    for (const s of SYM) { if ((r -= s.w) < 0) return s.id; }
    return SYM[0].id;
  }

  /* ---------- Audio: generative music + effects ---------- */
  const Snd = (() => {
    let ctx, bus, mus, sfx, verb, delay, nbuf, timer, step = 0, next = 0, playing = false;
    const BPM = 88, S = 60 / BPM / 4, mtof = m => 440 * 2 ** ((m - 69) / 12);
    const CH = [ { r:45, n:[57,60,64,67,71] }, { r:41, n:[53,57,60,64] }, { r:48, n:[55,59,64,67] }, { r:43, n:[55,59,62,64] } ];

    function init() {
      if (ctx) return true;
      const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return false;
      ctx = new AC();
      const comp = ctx.createDynamicsCompressor(); bus = ctx.createGain(); bus.gain.value = .9;
      bus.connect(comp); comp.connect(ctx.destination);
      mus = ctx.createGain(); mus.gain.value = 0; mus.connect(bus);
      sfx = ctx.createGain(); sfx.gain.value = .9; sfx.connect(bus);
      const len = ctx.sampleRate * 2.4, ir = ctx.createBuffer(2, len, ctx.sampleRate);
      for (let c = 0; c < 2; c++) { const d = ir.getChannelData(c); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.6); }
      verb = ctx.createConvolver(); verb.buffer = ir; const vg = ctx.createGain(); vg.gain.value = .5; verb.connect(vg); vg.connect(bus);
      delay = ctx.createDelay(1); delay.delayTime.value = S * 3;
      const fb = ctx.createGain(); fb.gain.value = .36, lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 2200;
      delay.connect(lp); lp.connect(fb); fb.connect(delay); lp.connect(mus); lp.connect(verb);
      nbuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
      const nd = nbuf.getChannelData(0); for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
      return true;
    }
    function voice(f, t, d, o = {}) {
      const osc = ctx.createOscillator(), g = ctx.createGain(); osc.type = o.type || 'sine'; osc.frequency.setValueAtTime(f, t);
      if (o.to) osc.frequency.exponentialRampToValueAtTime(o.to, t + d);
      if (o.det) osc.detune.value = o.det;
      let n = osc; if (o.lp) { const fl = ctx.createBiquadFilter(); fl.type = 'lowpass'; fl.frequency.value = o.lp; osc.connect(fl); n = fl; }
      g.gain.setValueAtTime(.0001, t); g.gain.linearRampToValueAtTime(o.vol || .1, t + (o.a || .01)); g.gain.exponentialRampToValueAtTime(.0001, t + d);
      n.connect(g); g.connect(o.dest || sfx); (o.sends || []).forEach(s => g.connect(s));
      osc.start(t); osc.stop(t + d + .05);
    }
    function noise(t, d, o) {
      const s = ctx.createBufferSource(); s.buffer = nbuf; const f = ctx.createBiquadFilter(); f.type = o.type || 'highpass';
      f.frequency.setValueAtTime(o.f, t); if (o.f1) f.frequency.exponentialRampToValueAtTime(o.f1, t + d); f.Q.value = o.q || .7;
      const g = ctx.createGain(); g.gain.setValueAtTime(.0001, t); g.gain.linearRampToValueAtTime(o.vol || .05, t + (o.a || .005)); g.gain.exponentialRampToValueAtTime(.0001, t + d);
      s.connect(f); f.connect(g); g.connect(o.dest || sfx); if (o.verb) g.connect(verb); s.start(t, Math.random() * .4); s.stop(t + d + .05);
    }
    function bell(f, t, v = .08) {
      voice(f, t, 1.2, { vol: v, a: .003, sends: [verb] });
      voice(f * 2.76, t, .45, { vol: v * .3, a: .003 });
    }
    function play(st, t) {
      const s = st % 16, c = CH[Math.floor(st / 16) % 4];
      if (s === 0) c.n.forEach((m, i) => voice(mtof(m), t, S * 16, { type:'sawtooth', vol:.017, a:.8, lp:900, det: i % 2 ? 7 : -7, dest:mus, sends:[verb] }));
      if (s === 0 || s === 10) voice(mtof(c.r), t, S * (s ? 4 : 9), { vol:.24, a:.02, dest:mus });
      if (s % 2 === 0 && (s === 0 || Math.random() > .18)) {
        const idx = [0,1,2,3,2,1,3,2][(s / 2) % 8], m = c.n[idx % c.n.length] + 12;
        voice(mtof(m), t, .55, { type:'triangle', vol:.07, a:.004, lp:3200, dest:mus, sends:[delay, verb] });
      }
      if (s === 6 || s === 14) if (Math.random() > .55) voice(mtof(c.n[c.n.length - 1] + 12), t, 1, { vol:.04, a:.01, dest:mus, sends:[delay, verb] });
      if (s === 0 || s === 8) voice(130, t, .3, { to:42, vol:.38, a:.002, dest:mus });
      if (s === 4 || s === 12) noise(t, .14, { type:'bandpass', f:1800, vol:.035, dest:mus, verb:true });
      if (s % 4 === 2) noise(t, .05, { f:7000, vol:.018, dest:mus });
    }
    function tick() { while (next < ctx.currentTime + .25) { play(step, next); next += S; step++; } }
    function music(on) {
      if (!init()) return;
      if (on) {
        if (ctx.state === 'suspended') ctx.resume();
        mus.gain.cancelScheduledValues(ctx.currentTime); mus.gain.setTargetAtTime(.8, ctx.currentTime, .5);
        if (!playing) { playing = true; next = ctx.currentTime + .1; timer = setInterval(tick, 60); }
      } else if (playing) {
        mus.gain.setTargetAtTime(0, ctx.currentTime, .25); playing = false;
        setTimeout(() => { if (!playing) clearInterval(timer); }, 1200);
      }
    }
    const fx = fn => (...a) => { if (!state.sound || !init()) return; if (ctx.state === 'suspended') ctx.resume(); fn(ctx.currentTime + .01, ...a); };
    const N = [523.25, 587.33, 659.25, 783.99, 880, 1046.5, 1174.66, 1318.5];
    document.addEventListener('visibilitychange', () => { if (!ctx) return; if (document.hidden) ctx.suspend(); else if (playing || state.sound) ctx.resume(); });
    return {
      music,
      click: fx(t => voice(900, t, .04, { type:'square', vol:.03 })),
      start: fx(t => noise(t, .5, { type:'bandpass', f:300, f1:2600, q:1.2, vol:.06 })),
      stop:  fx((t, i) => { voice(170 + i * 25, t, .14, { to:70, vol:.22, a:.002 }); noise(t, .03, { f:3000, vol:.05 }); }),
      lose:  fx(t => voice(180, t, .35, { to:110, vol:.07 })),
      win:   fx((t, type) => { const n = type === 'pair' ? 2 : type === 'triple' ? 5 : 8;
        for (let i = 0; i < n; i++) bell(N[i], t + i * .09, .08);
        if (type !== 'pair') voice(130.8, t, 1.4, { type:'triangle', vol:.12, a:.02 }); }),
      level: fx(t => [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => bell(f, t + i * .12, .08))),
      goal:  fx(t => { bell(880, t, .08); bell(1318.5, t + .13, .08); })
    };
  })();

  /* ---------- Rendering ---------- */
  function cellEl(id) { const d = document.createElement('div'); d.className = 'cell'; d.innerHTML = svg(id); return d; }
  function setStrip(i, ids) { strips[i].replaceChildren(...ids.map(cellEl)); state.shown[i] = ids; }
  function setMsg(text, cls = '') { $('msg').textContent = text; $('msg').className = 'msg ' + cls; }
  const setNote = t => { $('note').textContent = t; };

  function tweenBalance(from, to) {
    const el = $('balance');
    if (reduced || from === to) { el.textContent = fmt(to); return; }
    const t0 = performance.now(), d = 600;
    (function f(t) {
      const p = Math.min(1, (t - t0) / d);
      el.textContent = fmt(from + (to - from) * (1 - Math.pow(1 - p, 3)));
      if (p < 1) requestAnimationFrame(f); else el.textContent = fmt(to);
    })(t0);
  }

  function renderProgress() {
    $('lvl').textContent = 'Level ' + state.level;
    $('xp').textContent = state.xp + ' / ' + need(state.level) + ' XP';
    $('xpbar').style.width = (state.xp / need(state.level) * 100) + '%';
    const g = goalDef();
    $('goal').textContent = g.text;
    $('goalp').textContent = Math.min(state.goal.p, g.target) + ' of ' + g.target + ' · ' + g.reward + ' credits';
    $('gbar').style.width = (state.goal.p / g.target * 100) + '%';
  }

  function syncControls() {
    while (state.betIndex > 0 && bet() > state.balance) state.betIndex--;
    while (BETS[state.betIndex].l > state.level) state.betIndex--;
    $('bet').textContent = fmt(bet());
    const last = state.betIndex === BETS.length - 1;
    $('minus').disabled = state.spinning || state.betIndex === 0;
    $('plus').disabled = state.spinning || last || BETS[state.betIndex + 1].v > state.balance;
    $('spin').disabled = state.spinning || state.balance < BETS[0].v;
    $('reset').disabled = state.spinning;
  }

  /* ---------- Game logic ---------- */
  function evaluate(r) {
    const [a, b, c] = r;
    if (a === b && b === c) return { type: a === 'seven' ? 'jackpot' : 'triple', sym: BY[a], mult: BY[a].triple, hit: [0,1,2] };
    const pair = a === b ? [0,1] : b === c ? [1,2] : a === c ? [0,2] : null;
    return pair ? { type:'pair', sym: BY[r[pair[0]]], mult: BY[r[pair[0]]].pair, hit: pair } : { type:'none', mult:0, hit:[] };
  }

  function runReel(i, result) {
    const h = reels[i].querySelector('.cell')?.offsetHeight || 100, len = 12 + i * 6;
    const strip = [...state.shown[i], ...Array.from({ length: len - 6 }, pick), pick(), result, pick()];
    strips[i].replaceChildren(...strip.map(cellEl));
    reels[i].classList.add('moving');
    const anim = strips[i].animate(
      [{ transform: 'translateY(0)' }, { transform: `translateY(${-(strip.length - 3) * h}px)` }],
      { duration: reduced ? 150 : 1000 + i * 450, easing: 'cubic-bezier(.2,.75,.25,1.04)', fill: 'forwards' });
    return anim.finished.then(() => { setStrip(i, strip.slice(-3)); anim.cancel(); reels[i].classList.remove('moving'); Snd.stop(i); });
  }

  function newGoal(prev) {
    const pool = GOALS.filter(g => g.id !== prev);
    state.goal = { id: pool[Math.floor(Math.random() * pool.length)].id, p: 0 };
  }

  function progress(e, notes) {
    state.spins++;
    state.xp += 8 + Math.round(e.stake / 10) + (e.win ? 6 : 0);
    while (state.xp >= need(state.level)) {
      state.xp -= need(state.level); state.level++;
      const bonus = 100 * state.level; state.balance += bonus;
      const unlocked = BETS.find(b => b.l === state.level);
      notes.push(`Level ${state.level}: +${bonus} credits` + (unlocked ? `, bet ${fmt(unlocked.v)} unlocked` : ''));
      Snd.level();
    }
    const g = goalDef(); state.goal.p = g.step(state.goal.p, e);
    if (state.goal.p >= g.target) {
      state.balance += g.reward; notes.push(`Goal complete: +${g.reward} credits`); Snd.goal(); newGoal(g.id);
    }
    if (e.payout > state.best) state.best = e.payout;
  }

  async function spin() {
    if (state.spinning || $('pay').open) return;
    if (state.balance < BETS[0].v) { setMsg('Out of credits. Press Reset to refill.', 'lose'); return; }
    const stake = bet(), before = state.balance;
    state.balance -= stake; state.spinning = true;
    tweenBalance(before, state.balance); syncControls();
    reels.forEach(r => r.classList.remove('win', 'dim'));
    setMsg('Good luck…'); setNote(''); Snd.start();

    const result = [pick(), pick(), pick()];
    await Promise.all(result.map((s, i) => runReel(i, s)));

    const out = evaluate(result), payout = stake * out.mult, notes = [];
    const big = out.type === 'triple' || out.type === 'jackpot';
    if (out.type === 'none') {
      reels.forEach(r => r.classList.add('dim')); setMsg('No match', 'lose'); Snd.lose();
    } else {
      state.balance += payout;
      out.hit.forEach(i => reels[i].classList.add('win'));
      const label = out.type === 'jackpot' ? 'Jackpot' : out.type === 'triple' ? 'Three ' + out.sym.pl : 'Pair of ' + out.sym.pl;
      setMsg(out.mult === 1 && out.type === 'pair' ? `${label}: bet returned` : `${label}: you won ${fmt(payout)}`, big ? 'win big' : 'win');
      Snd.win(out.type);
      if (big) confetti(out.type === 'jackpot' ? 220 : 120);
    }
    progress({ stake, payout, win: payout > stake, triple: big, type: out.type }, notes);
    tweenBalance(before - stake, state.balance);
    setNote(notes.join(' · ')); renderProgress();
    state.spinning = false; syncControls(); save();

    if (state.balance < BETS[0].v) {
      state.auto = false; $('auto').setAttribute('aria-pressed', 'false');
      setMsg('Out of credits. Press Reset to refill.', 'lose'); return;
    }
    if (state.auto) setTimeout(() => { if (state.auto) spin(); }, big || notes.length ? 2400 : 900);
  }

  function resetCredits() {
    if (state.spinning) return;
    state.balance = START; state.betIndex = 1; state.auto = false;
    $('auto').setAttribute('aria-pressed', 'false');
    reels.forEach(r => r.classList.remove('win', 'dim'));
    $('balance').textContent = fmt(START);
    for (let i = 0; i < 3; i++) setStrip(i, [pick(), pick(), pick()]);
    setMsg('Credits reset to ' + fmt(START)); setNote('Your level and records are kept'); syncControls(); save();
  }

  /* ---------- Confetti ---------- */
  const cv = $('fx'), g2 = cv.getContext('2d');
  function confetti(n) {
    if (reduced) return;
    const dpr = devicePixelRatio || 1; cv.width = innerWidth * dpr; cv.height = innerHeight * dpr; g2.scale(dpr, dpr);
    const colors = ['#e0ae52', '#f2e9d6', '#d4503f', '#7fb8a4'], rect = $('window').getBoundingClientRect();
    const ps = Array.from({ length: n }, () => ({ x: rect.left + rect.width / 2, y: rect.top + rect.height / 2,
      vx: (Math.random() - .5) * 16, vy: -Math.random() * 14 - 3, s: 5 + Math.random() * 6, r: Math.random() * 6,
      vr: (Math.random() - .5) * .4, c: colors[Math.floor(Math.random() * colors.length)] }));
    let life = 0;
    (function f() {
      g2.clearRect(0, 0, innerWidth, innerHeight); life++;
      ps.forEach(p => { p.vy += .3; p.vx *= .99; p.x += p.vx; p.y += p.vy; p.r += p.vr;
        g2.save(); g2.translate(p.x, p.y); g2.rotate(p.r); g2.fillStyle = p.c; g2.globalAlpha = Math.max(0, 1 - life / 110);
        g2.fillRect(-p.s / 2, -p.s / 3, p.s, p.s * .6); g2.restore(); });
      if (life < 110) requestAnimationFrame(f); else g2.clearRect(0, 0, innerWidth, innerHeight);
    })();
  }

  /* ---------- Paytable ---------- */
  $('paybody').innerHTML = SYM.map(s => `<tr><td>${svg(s.id)}${s.id === 'seven' ? 'Seven (jackpot)' : s.name}</td><td>×${s.pair}</td><td>×${s.triple}</td></tr>`).join('');

  /* ---------- Events ---------- */
  $('spin').addEventListener('click', spin);
  $('minus').addEventListener('click', () => { if (state.betIndex > 0) { state.betIndex--; Snd.click(); syncControls(); save(); } });
  $('plus').addEventListener('click', () => {
    const nx = BETS[state.betIndex + 1];
    if (nx.l > state.level) { setMsg(`Bet ${fmt(nx.v)} unlocks at level ${nx.l}`, 'lose'); return; }
    if (nx.v <= state.balance) { state.betIndex++; Snd.click(); syncControls(); save(); }
  });
  $('reset').addEventListener('click', resetCredits);
  $('auto').addEventListener('click', () => {
    state.auto = !state.auto; $('auto').setAttribute('aria-pressed', state.auto);
    if (state.auto && !state.spinning) spin();
  });
  const label = (btn, on, name) => { btn.setAttribute('aria-pressed', on); btn.textContent = name + (on ? ' on' : ' off'); };
  $('music').addEventListener('click', () => { state.music = !state.music; label($('music'), state.music, 'Music'); Snd.music(state.music); save(); });
  $('sound').addEventListener('click', () => { state.sound = !state.sound; label($('sound'), state.sound, 'Sound'); save(); });
  $('paybtn').addEventListener('click', () => {
    state.auto = false; $('auto').setAttribute('aria-pressed', 'false');
    $('rbest').textContent = fmt(state.best); $('rspins').textContent = fmt(state.spins); $('pay').showModal();
  });
  $('payclose').addEventListener('click', () => $('pay').close());
  addEventListener('keydown', e => {
    if (e.code !== 'Space' || $('pay').open) return;
    e.preventDefault(); if (!e.repeat) spin();
  });
  addEventListener('keyup', e => { if (e.code === 'Space' && !$('pay').open) e.preventDefault(); });
  ['pointerdown', 'keydown'].forEach(ev => addEventListener(ev, () => { if (state.music) Snd.music(true); }, { once: true }));

  /* ---------- Init ---------- */
  if (!state.goal) newGoal();
  label($('music'), state.music, 'Music'); label($('sound'), state.sound, 'Sound');
  $('balance').textContent = fmt(state.balance);
  for (let i = 0; i < 3; i++) setStrip(i, [pick(), pick(), pick()]);
  syncControls(); renderProgress();
})();
