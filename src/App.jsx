import React, { useState, useEffect } from 'react';
import { Users, Calendar, Trophy, Check, X, DollarSign, Plus, Trash2, Shield, Target, MessageCircle, ChevronLeft, Loader2, Footprints, Award, Clock, Lock, Unlock, Camera, Shuffle, Star, Crown, KeyRound, Swords, TrendingDown, Medal, Flame, Share2, ArrowUp, Sparkles, CheckCircle2 } from 'lucide-react';
import { cloudGet, cloudSet, localGet, localSet } from './firebase';

const uid = () => Math.random().toString(36).slice(2, 10);
const genPin = () => String(Math.floor(1000 + Math.random() * 9000));

const fmtDate = (iso) => {
  const d = new Date(iso + 'T12:00:00');
  return d.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' });
};

const AVATAR_COLORS = ['bg-emerald-600', 'bg-amber-600', 'bg-sky-700', 'bg-rose-600', 'bg-violet-600', 'bg-teal-600', 'bg-orange-600', 'bg-indigo-600'];
const colorFor = (id) => AVATAR_COLORS[[...id].reduce((a, c) => a + c.charCodeAt(0), 0) % AVATAR_COLORS.length];

const POINTS = { gol: 2, assist: 1, defesa: 2, sofrido: -1, penalti: 3, mvp: 3 };

const LINHA_ATTRS = [
  { key: 'finalizacao', label: 'Finalização' },
  { key: 'marcacao', label: 'Marcação' },
  { key: 'velocidade', label: 'Velocidade' },
  { key: 'drible', label: 'Drible' },
  { key: 'passe', label: 'Passe' },
];
const GOLEIRO_ATTRS = [
  { key: 'reflexo', label: 'Reflexo' },
  { key: 'posicionamento', label: 'Posicionamento' },
  { key: 'defesa', label: 'Defesa' },
  { key: 'agilidade', label: 'Agilidade' },
  { key: 'impulsao', label: 'Impulsão' },
];
const attrsFor = (position) => (position === 'goleiro' ? GOLEIRO_ATTRS : LINHA_ATTRS);
const defaultAttrs = (position) => {
  const o = {};
  attrsFor(position).forEach(a => { o[a.key] = 50; });
  return o;
};

function overallOf(player) {
  const attrs = attrsFor(player.position);
  const vals = attrs.map(a => Number(player.attrs?.[a.key]) || 50);
  return Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
}

function cardTier(overall) {
  if (overall <= 35) return { grad: 'from-rose-800 via-rose-700 to-rose-900', text: 'text-rose-50', accent: 'text-rose-200', name: 'Bronze' };
  if (overall <= 50) return { grad: 'from-yellow-400 via-amber-400 to-yellow-500', text: 'text-amber-900', accent: 'text-amber-800', name: 'Prata' };
  if (overall <= 70) return { grad: 'from-emerald-600 via-emerald-500 to-emerald-700', text: 'text-emerald-50', accent: 'text-emerald-100', name: 'Ouro' };
  if (overall <= 85) return { grad: 'from-slate-300 via-slate-100 to-slate-400', text: 'text-slate-800', accent: 'text-slate-600', name: 'Platina' };
  return { grad: 'from-cyan-300 via-sky-200 to-indigo-300', text: 'text-indigo-900', accent: 'text-indigo-700', name: 'Diamante' };
}

function tierColorHex(overall) {
  if (overall <= 35) return ['#be123c', '#4c0519'];
  if (overall <= 50) return ['#facc15', '#d97706'];
  if (overall <= 70) return ['#10b981', '#065f46'];
  if (overall <= 85) return ['#e2e8f0', '#64748b'];
  return ['#67e8f9', '#4f46e5'];
}

function resizeImage(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const size = 200;
        const canvas = document.createElement('canvas');
        canvas.width = size; canvas.height = size;
        const ctx = canvas.getContext('2d');
        const scale = Math.max(size / img.width, size / img.height);
        const w = img.width * scale, h = img.height * scale;
        ctx.drawImage(img, (size - w) / 2, (size - h) / 2, w, h);
        resolve(canvas.toDataURL('image/jpeg', 0.65));
      };
      img.onerror = reject;
      img.src = e.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function computeGamePoints(player, game) {
  const s = (game.stats && game.stats[player.id]) || {};
  let pts = (Number(s.gols) || 0) * POINTS.gol
    + (Number(s.assist) || 0) * POINTS.assist
    + (Number(s.defesas) || 0) * POINTS.defesa
    + (Number(s.sofridos) || 0) * POINTS.sofrido
    + (Number(s.penaltis) || 0) * POINTS.penalti;
  if (game.mvp === player.id) pts += POINTS.mvp;
  return pts;
}

function snakeDistribute(sortedList, numTeams) {
  const groups = Array.from({ length: numTeams }, () => []);
  let team = 0, dir = 1;
  sortedList.forEach(item => {
    groups[team].push(item);
    if (dir === 1 && team === numTeams - 1) dir = -1;
    else if (dir === -1 && team === 0) dir = 1;
    else team += dir;
  });
  return groups;
}

function shuffleArr(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function sortTeams(confirmedPlayers) {
  const goleiros = shuffleArr(confirmedPlayers.filter(p => p.position === 'goleiro')).sort((a, b) => overallOf(b) - overallOf(a));
  const linha = shuffleArr(confirmedPlayers.filter(p => p.position !== 'goleiro')).sort((a, b) => overallOf(b) - overallOf(a));
  const letters = ['A', 'B', 'C'];
  const gGroups = snakeDistribute(goleiros, 3);
  const lGroups = snakeDistribute(linha, 3);
  const teams = {};
  letters.forEach((l, i) => { teams[l] = [...gGroups[i], ...lGroups[i]].map(p => p.id); });
  return teams;
}

function teamsEqual(t1, t2) {
  if (!t1 || !t2) return false;
  const setsOf = (t) => Object.values(t).map(ids => [...ids].sort().join(',')).sort();
  const a = setsOf(t1), b = setsOf(t2);
  return a.length === b.length && a.every((v, i) => v === b[i]);
}

function shareCanvas(canvas, filename) {
  canvas.toBlob(async (blob) => {
    if (!blob) return;
    try {
      const file = new File([blob], filename, { type: 'image/png' });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: filename });
        return;
      }
    } catch (e) {}
    try {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = filename;
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 3000);
    } catch (e) {}
  }, 'image/png');
}

function drawPlayerCardCanvas(player, extra, done) {
  const W = 640, H = 800;
  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d');
  const overall = overallOf(player);
  const [c1, c2] = tierColorHex(overall);
  const grad = ctx.createLinearGradient(0, 0, W, H);
  grad.addColorStop(0, c1); grad.addColorStop(1, c2);
  ctx.fillStyle = grad; ctx.fillRect(0, 0, W, H);

  const finish = () => {
    ctx.textAlign = 'center';
    ctx.fillStyle = '#0f172a';
    ctx.font = '900 100px sans-serif';
    ctx.fillText(String(overall), W / 2, 420);
    ctx.font = '700 42px sans-serif';
    ctx.fillText(player.name, W / 2, 480);
    ctx.font = '700 22px sans-serif';
    ctx.fillText(player.position === 'goleiro' ? 'GOLEIRO' : 'LINHA', W / 2, 512);
    const attrs = attrsFor(player.position);
    ctx.textAlign = 'left';
    ctx.font = '600 26px sans-serif';
    let y = 580;
    attrs.forEach(a => {
      const v = player.attrs?.[a.key] ?? 50;
      ctx.fillStyle = 'rgba(15,23,42,0.85)';
      ctx.fillText(a.label, 90, y);
      ctx.textAlign = 'right';
      ctx.fillText(String(v), W - 90, y);
      ctx.textAlign = 'left';
      y += 38;
    });
    ctx.textAlign = 'center';
    ctx.font = '700 22px sans-serif';
    ctx.fillStyle = 'rgba(15,23,42,0.7)';
    ctx.fillText(`${extra.pts} pts · ${extra.jogos} jogos · ${extra.mvpCount} MVP`, W / 2, y + 18);
    ctx.font = '700 20px sans-serif';
    ctx.fillText('Racha do Grupo', W / 2, H - 30);
    done(canvas);
  };

  if (player.foto) {
    const img = new Image();
    img.onload = () => {
      ctx.save();
      ctx.beginPath();
      ctx.arc(W / 2, 220, 150, 0, Math.PI * 2);
      ctx.closePath();
      ctx.clip();
      ctx.drawImage(img, W / 2 - 150, 70, 300, 300);
      ctx.restore();
      finish();
    };
    img.onerror = finish;
    img.src = player.foto;
  } else {
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.beginPath(); ctx.arc(W / 2, 220, 150, 0, Math.PI * 2); ctx.fill();
    finish();
  }
}

function drawCompareCanvas(a, b, rA, rB, done) {
  const W = 800, H = 700;
  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#0c4a3e';
  ctx.fillRect(0, 0, W, H);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#fff';
  ctx.font = '900 28px sans-serif';
  ctx.fillText(`${a.name} vs ${b.name}`, W / 2, 60);

  const rows = [
    ['Overall', overallOf(a), overallOf(b)],
    ['Pontos', rA.pts, rB.pts],
    ['Jogos', rA.jogos, rB.jogos],
    ['MVPs', rA.mvpCount, rB.mvpCount],
  ];
  if (a.position === b.position) {
    attrsFor(a.position).forEach(attr => rows.push([attr.label, a.attrs?.[attr.key] ?? 50, b.attrs?.[attr.key] ?? 50]));
  }
  let y = 140;
  rows.forEach(([label, va, vb]) => {
    ctx.font = '700 26px sans-serif';
    ctx.fillStyle = va >= vb ? '#34d399' : '#e2e8f0';
    ctx.textAlign = 'left';
    ctx.fillText(String(va), 60, y);
    ctx.fillStyle = '#d1fae5';
    ctx.font = '600 20px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(label, W / 2, y);
    ctx.font = '700 26px sans-serif';
    ctx.fillStyle = vb >= va ? '#34d399' : '#e2e8f0';
    ctx.textAlign = 'right';
    ctx.fillText(String(vb), W - 60, y);
    y += 46;
  });
  ctx.textAlign = 'center';
  ctx.font = '700 20px sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.6)';
  ctx.fillText('Racha do Grupo', W / 2, H - 30);
  done(canvas);
}

function useCountUp(value, duration = 600) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    let start = null;
    let raf;
    const step = (ts) => {
      if (!start) start = ts;
      const progress = Math.min((ts - start) / duration, 1);
      setDisplay(Math.round(value * progress));
      if (progress < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [value]);
  return display;
}

function Confetti() {
  const pieces = React.useMemo(() => Array.from({ length: 20 }, (_, i) => ({
    id: i,
    left: Math.random() * 100,
    delay: Math.random() * 0.3,
    color: ['#f59e0b', '#10b981', '#3b82f6', '#ef4444', '#eab308'][i % 5],
  })), []);
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden z-10">
      {pieces.map(p => (
        <span key={p.id} className="absolute top-0 w-2 h-2 rounded-sm animate-[fall_1.4s_ease-in_forwards]"
          style={{ left: `${p.left}%`, backgroundColor: p.color, animationDelay: `${p.delay}s` }} />
      ))}
    </div>
  );
}

function Avatar({ player, size = 'md', highlight = false }) {
  const sizeMap = { sm: 'w-10 h-10 text-xs', md: 'w-12 h-12 text-sm', lg: 'w-24 h-24 text-xl' };
  const badgeBox = size === 'lg' ? 'w-6 h-6' : 'w-4 h-4';
  const badgeIcon = size === 'lg' ? 'w-3.5 h-3.5' : 'w-2.5 h-2.5';
  const ringCls = highlight ? 'ring-4 ring-amber-300' : 'ring-2 ring-white';
  const PositionIcon = player.position === 'goleiro' ? Shield : Footprints;
  const badgeColor = player.position === 'goleiro' ? 'bg-sky-600' : 'bg-emerald-600';
  const initials = player.name.trim().split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase();
  return (
    <div className="relative shrink-0">
      {player.foto ? (
        <img src={player.foto} alt={player.name} className={`${sizeMap[size]} rounded-full object-cover ${ringCls}`} />
      ) : (
        <div className={`${sizeMap[size]} ${colorFor(player.name)} rounded-full flex items-center justify-center text-white font-bold ${ringCls}`}>
          {initials}
        </div>
      )}
      <span className={`absolute -bottom-0.5 -left-0.5 ${badgeBox} ${badgeColor} rounded-full flex items-center justify-center ring-2 ring-white`}>
        <PositionIcon className={`${badgeIcon} text-white`} />
      </span>
    </div>
  );
}

function EmptyState({ icon: Icon, text, sub }) {
  return (
    <div className="text-center py-14">
      <div className="w-16 h-16 rounded-full bg-zinc-800 flex items-center justify-center mx-auto mb-3">
        <Icon className="w-7 h-7 text-zinc-600" />
      </div>
      <p className="text-sm font-semibold text-zinc-400">{text}</p>
      {sub && <p className="text-xs text-zinc-500 mt-1">{sub}</p>}
    </div>
  );
}

export default function PeladaApp() {
  const [players, setPlayers] = useState([]);
  const [games, setGames] = useState([]);
  const [config, setConfig] = useState({ pin: null });
  const [isOrganizer, setIsOrganizer] = useState(false);
  const [myId, setMyId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('jogos');
  const [selectedGameId, setSelectedGameId] = useState(null);
  const [gameSubTab, setGameSubTab] = useState('presenca');
  const [toast, setToast] = useState('');
  const [pinModal, setPinModal] = useState(false);
  const [cardPlayer, setCardPlayer] = useState(null);
  const [editPlayer, setEditPlayer] = useState(null);

  useEffect(() => { loadAll(); }, []);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(''), 2200);
    return () => clearTimeout(t);
  }, [toast]);

  const loadAll = async () => {
    setLoading(true);
    const [pv, gv, cv] = await Promise.all([cloudGet('players'), cloudGet('games'), cloudGet('config')]);
    const p = pv ? JSON.parse(pv) : [];
    const g = gv ? JSON.parse(gv) : [];
    const c = cv ? JSON.parse(cv) : { pin: null };
    const unlocked = localGet('pelada_organizer_unlocked') === 'true';
    const identity = localGet('pelada_my_identity') || null;
    setPlayers(p); setGames(g); setConfig(c); setIsOrganizer(unlocked); setMyId(identity);
    setTab(unlocked ? 'jogos' : 'ranking');
    setLoading(false);
  };

  const savePlayers = async (next) => {
    setPlayers(next);
    const ok = await cloudSet('players', JSON.stringify(next));
    if (!ok) setToast('Erro ao salvar elenco (confira sua internet)');
  };

  const saveGames = async (next) => {
    setGames(next);
    const ok = await cloudSet('games', JSON.stringify(next));
    if (!ok) setToast('Erro ao salvar jogo (confira sua internet)');
  };

  const saveConfig = async (next) => {
    setConfig(next);
    const ok = await cloudSet('config', JSON.stringify(next));
    if (!ok) setToast('Erro ao salvar');
  };

  const unlockOrganizer = () => {
    setIsOrganizer(true);
    setTab('jogos');
    localSet('pelada_organizer_unlocked', 'true');
  };

  const lockOrganizer = () => {
    setIsOrganizer(false);
    setTab('ranking');
    localSet('pelada_organizer_unlocked', 'false');
  };

  const setIdentity = (id) => {
    setMyId(id);
    localSet('pelada_my_identity', id);
  };

  const clearIdentity = () => {
    setMyId(null);
    localSet('pelada_my_identity', '');
  };

  const guard = (fn) => (...args) => { if (isOrganizer) fn(...args); };

  const addPlayer = guard((name, position) => {
    if (!name.trim()) return;
    savePlayers([...players, { id: uid(), name: name.trim(), position, numero: players.length + 1, foto: null, pin: null, attrs: defaultAttrs(position) }]);
  });

  const removePlayer = guard((id) => savePlayers(players.filter(p => p.id !== id)));

  const updatePlayer = guard((id, patch) => {
    savePlayers(players.map(p => p.id === id ? { ...p, ...patch } : p));
  });

  const createGame = guard(() => {
    const iso = new Date().toISOString().slice(0, 10);
    const game = { id: uid(), date: iso, horario: '10:00', local: '', rsvp: {}, payments: {}, valor: '', teams: null, mvp: null, stats: {} };
    saveGames([game, ...games]);
    setSelectedGameId(game.id);
    setGameSubTab('presenca');
  });

  const updateGame = guard((gameId, patch) => {
    saveGames(games.map(g => g.id === gameId ? { ...g, ...patch } : g));
  });

  const setRSVP = guard((gameId, playerId, status) => {
    const game = games.find(g => g.id === gameId);
    updateGame(gameId, { rsvp: { ...game.rsvp, [playerId]: status } });
  });

  const togglePayment = guard((gameId, playerId) => {
    const game = games.find(g => g.id === gameId);
    updateGame(gameId, { payments: { ...game.payments, [playerId]: !game.payments[playerId] } });
  });

  const setStat = guard((gameId, playerId, field, value) => {
    const game = games.find(g => g.id === gameId);
    const current = game.stats[playerId] || {};
    updateGame(gameId, { stats: { ...game.stats, [playerId]: { ...current, [field]: value } } });
  });

  const doSorteio = guard((gameId) => {
    const game = games.find(g => g.id === gameId);
    const confirmed = players.filter(p => game.rsvp[p.id] === 'sim');
    if (confirmed.length < 3) { setToast('Confirme mais jogadores antes de sortear'); return; }
    let novo = sortTeams(confirmed);
    let tentativas = 0;
    while (teamsEqual(novo, game.teams) && tentativas < 20) {
      novo = sortTeams(confirmed);
      tentativas++;
    }
    updateGame(gameId, { teams: novo });
    setToast(game.teams ? 'Novos times sorteados!' : 'Times sorteados!');
  });

  const deleteGame = guard((gameId) => {
    saveGames(games.filter(g => g.id !== gameId));
    setSelectedGameId(null);
  });

  const send = (text) => window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');

  const ranking = React.useMemo(() => {
    const agg = {};
    players.forEach(p => { agg[p.id] = { player: p, pts: 0, gols: 0, assist: 0, defesas: 0, sofridos: 0, penaltis: 0, jogos: 0, mvpCount: 0, streakGoals: 0 }; });
    games.forEach(g => {
      players.forEach(p => {
        if (!agg[p.id]) return;
        if (g.rsvp[p.id] === 'sim') agg[p.id].jogos += 1;
        const s = g.stats[p.id];
        if (s) {
          agg[p.id].gols += Number(s.gols) || 0;
          agg[p.id].assist += Number(s.assist) || 0;
          agg[p.id].defesas += Number(s.defesas) || 0;
          agg[p.id].sofridos += Number(s.sofridos) || 0;
          agg[p.id].penaltis += Number(s.penaltis) || 0;
        }
        if (g.mvp === p.id) agg[p.id].mvpCount += 1;
        agg[p.id].pts += computeGamePoints(p, g);
      });
    });
    const gamesSorted = [...games].sort((a, b) => a.date.localeCompare(b.date));
    players.forEach(p => {
      const participated = gamesSorted.filter(g => g.rsvp[p.id] === 'sim');
      let streak = 0;
      for (let i = participated.length - 1; i >= 0; i--) {
        const s = participated[i].stats[p.id];
        if (s && Number(s.gols) > 0) streak++; else break;
      }
      if (agg[p.id]) agg[p.id].streakGoals = streak;
    });
    return Object.values(agg).sort((a, b) => b.pts - a.pts);
  }, [players, games]);

  const selectedGame = games.find(g => g.id === selectedGameId);
  const showIdentityScreen = !loading && !isOrganizer && players.length > 0 && !myId;

  if (loading) {
    return (
      <div className="min-h-screen bg-black p-4">
        <div className="h-32 rounded-3xl bg-gradient-to-br from-emerald-900/40 to-black animate-pulse mb-4" />
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-16 rounded-2xl bg-zinc-900 animate-pulse" style={{ animationDelay: `${i * 0.1}s` }} />
          ))}
        </div>
      </div>
    );
  }

  if (showIdentityScreen) {
    return (
      <>
        <IdentityScreen players={players} onVerified={setIdentity} onOrganizerClick={() => setPinModal(true)} setToast={setToast} />
        {toast && <div className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-zinc-800 text-white text-sm px-4 py-2 rounded-full shadow-lg z-30 animate-[popin_0.2s_ease-out]">{toast}</div>}
        {pinModal && (
          <PinModal config={config} onClose={() => setPinModal(false)}
            onSetPin={(pin) => { saveConfig({ pin }); unlockOrganizer(); setPinModal(false); setToast('Senha criada. Modo organizador ativado.'); }}
            onSubmitPin={(pin) => { if (pin === config.pin) { unlockOrganizer(); setPinModal(false); setToast('Modo organizador ativado.'); } else setToast('Senha incorreta.'); }} />
        )}
      </>
    );
  }

  const me = players.find(p => p.id === myId);

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundImage: "url('/bg-pelada.jpg')", backgroundSize: 'cover', backgroundPosition: 'top center', backgroundRepeat: 'no-repeat', backgroundAttachment: 'fixed' }}>
      <div className="bg-gradient-to-br from-black via-emerald-950 to-zinc-900 text-white px-4 pt-6 pb-4 relative overflow-hidden shrink-0 border-b border-emerald-500/10">
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'repeating-linear-gradient(90deg, transparent, transparent 38px, white 38px, white 40px)' }} />
        <div className="absolute -right-10 -top-16 w-40 h-40 rounded-full bg-emerald-500/10 blur-2xl" />
        <div className="absolute right-2 top-2 text-6xl opacity-10 select-none pointer-events-none">⚽</div>
        <div className="relative flex items-center justify-between">
          <div>
            <p className="text-emerald-400 text-[11px] font-bold tracking-widest uppercase">{isOrganizer ? 'Modo organizador' : me ? `Olá, ${me.name.split(' ')[0]}` : 'Modo visualização'}</p>
            <h1 className="text-2xl font-black tracking-tight flex items-center gap-1.5">Racha do Grupo ⚽</h1>
          </div>
          <button onClick={() => isOrganizer ? lockOrganizer() : setPinModal(true)} className="w-11 h-11 rounded-full border-2 border-emerald-500/40 bg-emerald-500/10 flex items-center justify-center transition-transform active:scale-90">
            {isOrganizer ? <Unlock className="w-5 h-5 text-emerald-400" /> : <Lock className="w-5 h-5 text-emerald-400" />}
          </button>
        </div>
        {!isOrganizer && me && (
          <div className="relative mt-2 flex items-center gap-3">
            <button onClick={clearIdentity} className="text-[11px] text-emerald-400 font-semibold underline">Trocar identidade</button>
            <label className="text-[11px] text-emerald-400 font-semibold underline cursor-pointer">
              Trocar minha foto
              <input type="file" accept="image/*" className="hidden" onChange={(e) => updateMyPhoto(e.target.files[0])} />
            </label>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto pb-24">
        <div key={tab + (selectedGameId || '')} className="animate-[fadein_0.2s_ease-out]">
          {tab === 'jogos' && isOrganizer && !selectedGame && (
            <JogosList games={games} players={players} onCreate={createGame} onSelect={(id) => { setSelectedGameId(id); setGameSubTab('presenca'); }} setTab={setTab} myId={myId} />
          )}
          {tab === 'jogos' && isOrganizer && selectedGame && (
            <GameDetail game={selectedGame} players={players} subTab={gameSubTab} setSubTab={setGameSubTab}
              onBack={() => setSelectedGameId(null)} onRSVP={setRSVP} onPay={togglePayment} onStat={setStat}
              onDelete={deleteGame} onUpdate={(patch) => updateGame(selectedGame.id, patch)} onSorteio={() => doSorteio(selectedGame.id)}
              send={send} />
          )}
          {tab === 'jogos' && !isOrganizer && <ViewerJogos games={games} players={players} />}
          {tab === 'elenco' && isOrganizer && (
            <ElencoTab players={players} onAdd={addPlayer} onOpenEdit={setEditPlayer} />
          )}
          {tab === 'ranking' && <RankingTab ranking={ranking} onOpenCard={setCardPlayer} myId={myId} players={players} games={games} />}
        </div>
      </div>

      {toast && <div className="fixed bottom-24 left-1/2 -translate-x-1/2 bg-zinc-800 text-white text-sm px-4 py-2 rounded-full shadow-lg z-30 animate-[popin_0.2s_ease-out]">{toast}</div>}

      {pinModal && (
        <PinModal config={config} onClose={() => setPinModal(false)}
          onSetPin={(pin) => { saveConfig({ pin }); unlockOrganizer(); setPinModal(false); setToast('Senha criada. Modo organizador ativado.'); }}
          onSubmitPin={(pin) => { if (pin === config.pin) { unlockOrganizer(); setPinModal(false); setToast('Modo organizador ativado.'); } else setToast('Senha incorreta.'); }} />
      )}

      {cardPlayer && <PlayerCard player={cardPlayer} games={games} onClose={() => setCardPlayer(null)} />}
      {editPlayer && isOrganizer && (
        <PlayerEditModal player={editPlayer} onClose={() => setEditPlayer(null)}
          onSave={(form) => updatePlayer(editPlayer.id, form)} onDelete={removePlayer} />
      )}

      <div className="fixed bottom-0 left-0 right-0 bg-zinc-900 border-t border-white/10 flex justify-around items-center py-2 px-2 max-w-lg mx-auto">
        {isOrganizer ? (
          <>
            <NavBtn icon={Calendar} label="Jogos" active={tab === 'jogos'} onClick={() => { setTab('jogos'); setSelectedGameId(null); }} />
            <NavBtn icon={Users} label="Elenco" active={tab === 'elenco'} onClick={() => setTab('elenco')} />
            <NavBtn icon={Trophy} label="Ranking" active={tab === 'ranking'} onClick={() => setTab('ranking')} />
          </>
        ) : (
          <>
            <NavBtn icon={Trophy} label="Ranking" active={tab === 'ranking'} onClick={() => setTab('ranking')} />
            <NavBtn icon={Calendar} label="Jogos" active={tab === 'jogos'} onClick={() => setTab('jogos')} />
          </>
        )}
      </div>
    </div>
  );
}

function NavBtn({ icon: Icon, label, active, onClick }) {
  return (
    <button onClick={onClick} className={`flex flex-col items-center gap-0.5 px-6 py-1.5 rounded-2xl transition-all duration-200 active:scale-90 ${active ? 'text-emerald-400 bg-emerald-500/10' : 'text-zinc-500'}`}>
      <Icon className="w-5 h-5" strokeWidth={active ? 2.5 : 2} />
      <span className="text-[11px] font-semibold">{label}</span>
    </button>
  );
}

function IdentityScreen({ players, onVerified, onOrganizerClick, setToast }) {
  const [selected, setSelected] = useState('');
  const [pin, setPin] = useState('');
  const submit = () => {
    const p = players.find(pl => pl.id === selected);
    if (!p) { setToast('Escolha seu nome'); return; }
    if (!p.pin) { setToast('Você ainda não tem PIN. Fale com o organizador.'); return; }
    if (pin !== p.pin) { setToast('PIN incorreto'); return; }
    onVerified(p.id);
  };
  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-950 via-black to-black flex items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'repeating-linear-gradient(90deg, transparent, transparent 38px, white 38px, white 40px)' }} />
      <div className="relative bg-zinc-900 border border-white/10 rounded-3xl p-6 w-full max-w-xs shadow-2xl shadow-black/60 animate-[popin_0.22s_ease-out]">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-emerald-900/50">
          <Shield className="w-7 h-7 text-white" />
        </div>
        <h2 className="font-black text-lg text-white mb-1 text-center">Quem é você?</h2>
        <p className="text-xs text-zinc-500 mb-4 text-center">Escolha seu nome e digite o PIN que o organizador te passou.</p>
        <select value={selected} onChange={(e) => setSelected(e.target.value)} className="w-full bg-zinc-800 border border-white/10 rounded-xl px-3 py-2.5 text-sm mb-2 outline-none text-zinc-100 focus:border-emerald-500 transition-colors">
          <option value="">Selecione seu nome...</option>
          {players.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <input type="tel" inputMode="numeric" maxLength={4} value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))} placeholder="PIN"
          className="w-full text-center tracking-[0.3em] text-lg font-bold bg-zinc-800 border border-white/10 rounded-xl px-3 py-2.5 mb-3 outline-none focus:border-emerald-500 transition-colors text-white" />
        <button onClick={submit} className="w-full bg-gradient-to-r from-emerald-500 to-emerald-600 text-white font-black py-3 rounded-xl text-sm mb-3 shadow-lg shadow-emerald-950/50 transition-transform active:scale-95">Entrar</button>
        <button onClick={onOrganizerClick} className="w-full text-center text-xs text-zinc-500 font-semibold">Sou o organizador</button>
      </div>
    </div>
  );
}

function PinModal({ config, onClose, onSetPin, onSubmitPin }) {
  const [pin, setPin] = useState('');
  const isNew = !config.pin;
  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-40 p-6 animate-[fadein_0.2s_ease-out]" onClick={onClose}>
      <div className="bg-zinc-900 border border-white/10 rounded-3xl p-6 w-full max-w-xs shadow-2xl animate-[popin_0.22s_ease-out]" onClick={(e) => e.stopPropagation()}>
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center mx-auto mb-3">
          <KeyRound className="w-6 h-6 text-white" />
        </div>
        <h3 className="font-black text-white mb-1 text-center">{isNew ? 'Criar senha de organizador' : 'Entrar como organizador'}</h3>
        <p className="text-xs text-zinc-500 mb-4 text-center">{isNew ? 'Só quem tiver essa senha poderá alterar dados do app.' : 'Digite a senha do organizador.'}</p>
        <input type="tel" inputMode="numeric" maxLength={6} value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
          placeholder="Senha (números)" autoFocus
          className="w-full text-center tracking-[0.3em] text-lg font-bold bg-zinc-800 border border-white/10 rounded-xl px-3 py-2.5 mb-3 outline-none focus:border-emerald-500 transition-colors text-white" />
        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl text-sm font-bold text-zinc-400 bg-zinc-800 transition-transform active:scale-95">Cancelar</button>
          <button onClick={() => pin && (isNew ? onSetPin(pin) : onSubmitPin(pin))} className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-emerald-500 to-emerald-600 shadow-md shadow-emerald-950/40 transition-transform active:scale-95">{isNew ? 'Criar' : 'Entrar'}</button>
        </div>
      </div>
    </div>
  );
}

function MiniStat({ label, value, highlight, icon: Icon }) {
  const display = useCountUp(value);
  return (
    <div className={`rounded-xl py-2.5 transition-colors ${highlight ? 'bg-emerald-500/10' : 'bg-white/5'}`}>
      {Icon && <Icon className={`w-3.5 h-3.5 mx-auto mb-1 ${highlight ? 'text-emerald-400' : 'text-zinc-500'}`} />}
      <p className={`text-lg font-black ${highlight ? 'text-emerald-400' : 'text-zinc-100'}`}>{display}</p>
      <p className="text-[10px] text-zinc-500 font-semibold uppercase">{label}</p>
    </div>
  );
}

function attrBarColor(value) {
  if (value <= 35) return 'bg-rose-500';
  if (value <= 50) return 'bg-amber-400';
  if (value <= 70) return 'bg-emerald-400';
  if (value <= 85) return 'bg-sky-400';
  return 'bg-cyan-300';
}

function AttrBar({ label, value }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-[11px] text-zinc-400 font-semibold">{label}</span>
        <span className="text-xs font-black text-white">{value}</span>
      </div>
      <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
        <div className={`h-full rounded-full ${attrBarColor(value)}`} style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

function PlayerCard({ player, games, onClose }) {
  const overall = overallOf(player);
  const tier = cardTier(overall);
  const attrs = attrsFor(player.position);
  const isGk = player.position === 'goleiro';
  let pts = 0, gols = 0, assist = 0, defesas = 0, sofridos = 0, penaltis = 0, jogos = 0, mvpCount = 0;
  games.forEach(g => {
    if (g.rsvp[player.id] === 'sim') jogos += 1;
    const s = g.stats[player.id];
    if (s) { gols += Number(s.gols) || 0; assist += Number(s.assist) || 0; defesas += Number(s.defesas) || 0; sofridos += Number(s.sofridos) || 0; penaltis += Number(s.penaltis) || 0; }
    if (g.mvp === player.id) mvpCount += 1;
    pts += computeGamePoints(player, g);
  });

  const gamesSorted = [...games].sort((a, b) => a.date.localeCompare(b.date));
  const participated = gamesSorted.filter(g => g.rsvp[player.id] === 'sim');
  let streakGoals = 0;
  for (let i = participated.length - 1; i >= 0; i--) {
    const s = participated[i].stats[player.id];
    if (s && Number(s.gols) > 0) streakGoals++; else break;
  }
  const badges = [];
  if (mvpCount >= 3) badges.push({ Icon: Crown, label: 'Rei do jogo' });
  if (streakGoals >= 3) badges.push({ Icon: Flame, label: `${streakGoals}x seguidos marcando` });
  if (games.length >= 3 && jogos === games.length) badges.push({ Icon: CheckCircle2, label: '100% presença' });

  const handleShare = () => drawPlayerCardCanvas(player, { pts, jogos, mvpCount }, (canvas) => shareCanvas(canvas, `${player.name.replace(/\s+/g, '-')}-card.png`));

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-40 p-6 animate-[fadein_0.2s_ease-out]" onClick={onClose}>
      <div className="w-full max-w-xs rounded-3xl overflow-hidden shadow-2xl animate-[popin_0.22s_ease-out] relative" onClick={(e) => e.stopPropagation()}>
        {overall >= 86 && <Confetti />}
        <div className={`relative h-48 bg-gradient-to-br ${tier.grad}`}>
          {player.foto ? (
            <img src={player.foto} alt={player.name} className="absolute inset-0 w-full h-full object-cover" />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center overflow-hidden">
              <span className={`text-9xl font-black opacity-20 ${tier.text}`}>{player.name.trim().split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase()}</span>
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-black/10" />
          <span className={`absolute top-3 right-3 text-[9px] font-black uppercase tracking-wide px-2 py-1 rounded-full bg-black/30 backdrop-blur-sm text-white`}>{isGk ? 'Goleiro' : 'Linha'}</span>
          <p className="absolute top-3 left-3 text-5xl font-black leading-none text-white drop-shadow-lg">{overall}</p>
          <p className={`absolute top-[76px] left-3 text-[10px] font-black uppercase tracking-widest ${tier.accent}`}>{tier.name}</p>
          <div className="absolute bottom-3 left-3 right-3">
            <h3 className="text-xl font-black text-white drop-shadow-lg leading-tight">{player.name}</h3>
            <p className="text-[11px] font-bold text-white/80">#{player.numero || '-'}</p>
          </div>
        </div>
        <div className="bg-zinc-900 p-4">
          {badges.length > 0 && (
            <div className="flex gap-1.5 mb-3 flex-wrap">
              {badges.map((b, i) => (
                <span key={i} className="flex items-center gap-1 bg-amber-500/15 text-amber-300 text-[10px] font-bold px-2 py-1 rounded-full">
                  <b.Icon className="w-3 h-3" /> {b.label}
                </span>
              ))}
            </div>
          )}
          <div className="mb-4 pb-4 border-b border-white/5">
            <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2.5">Atributos</p>
            <div className="grid grid-cols-2 gap-x-4 gap-y-3">
              {attrs.map(a => (
                <AttrBar key={a.key} label={a.label} value={player.attrs?.[a.key] ?? 50} />
              ))}
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center mb-2">
            <MiniStat label="Pontos" value={pts} highlight icon={Star} />
            <MiniStat label="Jogos" value={jogos} icon={Calendar} />
            <MiniStat label="MVP" value={mvpCount} icon={Crown} />
          </div>
          <div className="grid grid-cols-2 gap-2 text-center">
            {isGk ? (
              <>
                <MiniStat label="Defesas" value={defesas} icon={Shield} />
                <MiniStat label="Pênaltis def." value={penaltis} icon={Award} />
              </>
            ) : (
              <>
                <MiniStat label="Gols" value={gols} icon={Target} />
                <MiniStat label="Assist." value={assist} icon={Award} />
              </>
            )}
          </div>
        </div>
        <div className="flex">
          <button onClick={handleShare} className="flex-1 flex items-center justify-center gap-1.5 bg-emerald-700 text-white font-bold text-sm py-2.5 transition-colors active:bg-emerald-800"><Share2 className="w-4 h-4" /> Compartilhar</button>
          <button onClick={onClose} className="flex-1 bg-zinc-800 text-zinc-400 font-bold text-sm py-2.5 transition-colors active:bg-white/10">Fechar</button>
        </div>
      </div>
    </div>
  );
}

function PlayerEditModal({ player, onClose, onSave, onDelete }) {
  const [form, setForm] = useState({ ...player, attrs: { ...defaultAttrs(player.position), ...player.attrs } });
  const attrs = attrsFor(form.position);
  const overall = Math.round(attrs.map(a => Number(form.attrs[a.key]) || 50).reduce((x, y) => x + y, 0) / attrs.length);
  const tier = cardTier(overall);

  const handlePhoto = async (file) => {
    if (!file) return;
    try { const dataUrl = await resizeImage(file); setForm(f => ({ ...f, foto: dataUrl })); } catch (e) {}
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-end sm:items-center justify-center z-40" onClick={onClose}>
      <div className="bg-zinc-900 w-full sm:max-w-sm sm:rounded-3xl rounded-t-3xl max-h-[92vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className={`bg-gradient-to-br ${tier.grad} p-4`}>
          <div className="flex items-center gap-3 mb-2">
            <label className="relative cursor-pointer">
              <Avatar player={form} size="lg" />
              <span className="absolute -bottom-1 -right-1 w-5 h-5 bg-emerald-600 rounded-full flex items-center justify-center">
                <Camera className="w-3 h-3 text-white" />
              </span>
              <input type="file" accept="image/*" className="hidden" onChange={(e) => handlePhoto(e.target.files[0])} />
            </label>
            <div>
              <p className={`text-2xl font-black leading-none ${tier.text}`}>{overall}</p>
              <p className={`text-[10px] font-bold uppercase ${tier.accent}`}>Overall</p>
              {form.foto && (
                <button onClick={() => setForm(f => ({ ...f, foto: null }))} className={`text-[10px] font-bold underline mt-1 ${tier.accent}`}>Remover foto</button>
              )}
            </div>
          </div>
          <input value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))} className={`bg-transparent text-lg font-black outline-none w-full ${tier.text}`} />
        </div>
        <div className="p-4 space-y-3">
          <div className="flex gap-2">
            <button onClick={() => setForm(f => ({ ...f, position: 'linha', attrs: defaultAttrs('linha') }))} className={`flex-1 py-2 rounded-lg text-xs font-bold border transition-colors ${form.position === 'linha' ? 'bg-emerald-700 text-white border-emerald-700' : 'bg-zinc-900 text-zinc-400 border-white/10'}`}>Linha</button>
            <button onClick={() => setForm(f => ({ ...f, position: 'goleiro', attrs: defaultAttrs('goleiro') }))} className={`flex-1 py-2 rounded-lg text-xs font-bold border transition-colors ${form.position === 'goleiro' ? 'bg-sky-600 text-white border-sky-600' : 'bg-zinc-900 text-zinc-400 border-white/10'}`}>Goleiro</button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] font-bold text-zinc-500 uppercase">Número</label>
              <input type="number" value={form.numero} onChange={(e) => setForm(f => ({ ...f, numero: e.target.value }))} className="w-full bg-zinc-800 border border-white/10 rounded-lg px-2 py-1.5 text-sm text-zinc-100" />
            </div>
            <div>
              <label className="text-[10px] font-bold text-zinc-500 uppercase">PIN de acesso</label>
              <div className="flex items-center gap-1 bg-zinc-800 border border-white/10 rounded-lg px-2 py-1.5">
                <KeyRound className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                <span className="text-sm font-bold flex-1">{form.pin || '----'}</span>
                <button onClick={() => setForm(f => ({ ...f, pin: genPin() }))} className="text-[10px] font-bold text-emerald-400 shrink-0">gerar</button>
              </div>
            </div>
          </div>
          <div className="space-y-2">
            <p className="text-xs font-bold text-zinc-400 uppercase">Atributos (só o organizador vê e edita aqui)</p>
            {attrs.map(a => (
              <div key={a.key} className="flex items-center gap-2">
                <span className="text-xs text-zinc-400 w-24 shrink-0">{a.label}</span>
                <input type="range" min="0" max="99" value={form.attrs[a.key]} onChange={(e) => setForm(f => ({ ...f, attrs: { ...f.attrs, [a.key]: Number(e.target.value) } }))} className="flex-1 accent-emerald-700" />
                <span className="text-xs font-black text-zinc-100 w-6 text-right">{form.attrs[a.key]}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="p-4 pt-0 flex gap-2">
          <button onClick={() => { if (confirm('Excluir jogador?')) { onDelete(player.id); onClose(); } }} className="px-4 py-2.5 rounded-xl bg-rose-50 text-rose-600 transition-transform active:scale-95"><Trash2 className="w-4 h-4" /></button>
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl bg-zinc-800 text-zinc-400 font-bold text-sm transition-transform active:scale-95">Cancelar</button>
          <button onClick={() => { onSave(form); onClose(); }} className="flex-1 py-2.5 rounded-xl bg-emerald-700 text-white font-bold text-sm transition-transform active:scale-95">Salvar</button>
        </div>
      </div>
    </div>
  );
}

function JogosList({ games, players, onCreate, onSelect, setTab, myId }) {
  const today = new Date().toISOString().slice(0, 10);
  const sorted = [...games].sort((a, b) => a.date.localeCompare(b.date));
  const proximo = sorted.find(g => g.date >= today) || sorted[sorted.length - 1] || null;
  const outros = games.filter(g => !proximo || g.id !== proximo.id);

  const inviteGeral = () => {
    window.open(`https://wa.me/?text=${encodeURIComponent('⚽ Bora fazer parte da nossa pelada! Chama aí no grupo pra ficar por dentro dos jogos.')}`, '_blank');
  };

  return (
    <div className="p-4 space-y-5">
      <div className="grid grid-cols-4 gap-2">
        <QuickAction icon={Plus} label="Novo jogo" sub="Marcar racha" active onClick={onCreate} />
        <QuickAction icon={MessageCircle} label="Convidar" sub="Chamar galera" onClick={inviteGeral} />
        <QuickAction icon={Users} label="Elenco" sub="Jogadores" onClick={() => setTab('elenco')} />
        <QuickAction icon={Trophy} label="Ranking" sub="Do grupo" onClick={() => setTab('ranking')} />
      </div>

      {games.length === 0 && <EmptyState icon={Calendar} text="Nenhum jogo marcado ainda" sub="Toque em 'Novo jogo' acima pra criar a primeira pelada." />}

      {proximo && <ProximoJogoCard game={proximo} players={players} onSelect={onSelect} myId={myId} />}

      {outros.length > 0 && (
        <div>
          <p className="text-[11px] font-black text-zinc-500 uppercase tracking-widest mb-2 px-1">Outros jogos</p>
          <div className="space-y-2.5">
            {outros.map(g => {
              const confirmados = players.filter(p => g.rsvp[p.id] === 'sim').length;
              const pagos = players.filter(p => g.payments[p.id]).length;
              return (
                <button key={g.id} onClick={() => onSelect(g.id)} className="w-full text-left bg-zinc-900 rounded-2xl border border-white/10 p-3.5 transition-transform active:scale-[0.98]">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-emerald-400 font-black text-xs uppercase tracking-wide">{fmtDate(g.date)} {g.horario ? `· ${g.horario}` : ''}</span>
                    <ChevronLeft className="w-4 h-4 text-zinc-600 rotate-180" />
                  </div>
                  <div className="flex gap-4 text-xs text-zinc-400 font-medium">
                    <span className="flex items-center gap-1"><Check className="w-3.5 h-3.5 text-emerald-400" /> {confirmados} confirmados</span>
                    <span className="flex items-center gap-1"><DollarSign className="w-3.5 h-3.5 text-amber-400" /> {pagos} pagos</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function QuickAction({ icon: Icon, label, sub, onClick, active }) {
  return (
    <button onClick={onClick} className={`flex flex-col items-center justify-center gap-1 rounded-2xl border py-3 px-1 transition-transform active:scale-95 ${active ? 'bg-emerald-500/10 border-emerald-500/40' : 'bg-zinc-900 border-white/10'}`}>
      <Icon className={`w-5 h-5 ${active ? 'text-emerald-400' : 'text-zinc-400'}`} />
      <span className={`text-[10px] font-black leading-tight text-center ${active ? 'text-emerald-300' : 'text-zinc-200'}`}>{label}</span>
      <span className="text-[8px] text-zinc-500 font-semibold leading-none text-center">{sub}</span>
    </button>
  );
}

function ProximoJogoCard({ game, players, onSelect, myId }) {
  const d = new Date(game.date + 'T12:00:00');
  const weekday = d.toLocaleDateString('pt-BR', { weekday: 'short' }).toUpperCase().replace('.', '');
  const day = d.getDate();
  const month = d.toLocaleDateString('pt-BR', { month: 'short' }).toUpperCase().replace('.', '');
  const confirmados = players.filter(p => game.rsvp[p.id] === 'sim');
  const pagos = confirmados.filter(p => game.payments[p.id]).length;
  const pendentesPag = confirmados.length - pagos;
  const meuStatus = myId ? game.rsvp[myId] : null;

  return (
    <div>
      <p className="text-[11px] font-black text-zinc-500 uppercase tracking-widest mb-2 px-1">Próximo jogo</p>
      <button onClick={() => onSelect(game.id)} className="w-full text-left rounded-3xl overflow-hidden border border-emerald-500/20 shadow-lg shadow-black/40 transition-transform active:scale-[0.98]">
        <div className="bg-gradient-to-br from-zinc-900 to-black p-4 flex gap-3">
          <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl px-3 py-2 text-center shrink-0 w-16">
            <p className="text-[9px] font-black text-emerald-400 uppercase">{weekday}</p>
            <p className="text-2xl font-black text-white leading-none my-0.5">{day}</p>
            <p className="text-[9px] font-black text-zinc-500 uppercase">{month}</p>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white font-black text-base leading-tight truncate">{game.local || 'Local a definir'}</p>
            <p className="text-zinc-400 text-xs font-semibold">{game.horario ? game.horario : 'Horário a definir'}</p>
            <div className="flex gap-2 mt-2 flex-wrap">
              <span className="bg-emerald-500/15 text-emerald-300 text-[10px] font-bold px-2 py-1 rounded-full flex items-center gap-1"><Users className="w-3 h-3" /> {confirmados.length} confirmados</span>
              <span className="bg-amber-500/15 text-amber-300 text-[10px] font-bold px-2 py-1 rounded-full flex items-center gap-1"><DollarSign className="w-3 h-3" /> {pagos} pagos</span>
            </div>
          </div>
        </div>
        {confirmados.length > 0 && (
          <div className="bg-gradient-to-b from-emerald-800 to-emerald-900 px-4 py-3 flex items-center gap-1.5 overflow-hidden">
            {confirmados.slice(0, 7).map(p => <Avatar key={p.id} player={p} size="sm" />)}
            {confirmados.length > 7 && (
              <div className="w-10 h-10 rounded-full bg-black/40 flex items-center justify-center text-white text-[10px] font-black shrink-0">+{confirmados.length - 7}</div>
            )}
          </div>
        )}
        <div className="bg-emerald-600 text-white text-center py-2.5 font-black text-sm flex items-center justify-center gap-1">
          Ver detalhes do jogo <ChevronLeft className="w-4 h-4 rotate-180" />
        </div>
      </button>

      <div className="grid grid-cols-2 gap-2.5 mt-2.5">
        <div className="bg-zinc-900 rounded-2xl border border-white/10 p-3">
          <p className="text-[10px] font-black text-zinc-500 uppercase mb-2 flex items-center gap-1"><Users className="w-3 h-3" /> Confirmados ({confirmados.length})</p>
          <div className="flex items-center -space-x-2.5 mb-2 overflow-hidden pl-0.5">
            {confirmados.slice(0, 4).map(p => (
              <div key={p.id} className="ring-2 ring-zinc-900 rounded-full shrink-0">
                <Avatar player={p} size="sm" />
              </div>
            ))}
            {confirmados.length > 4 && <div className="w-10 h-10 rounded-full bg-zinc-700 ring-2 ring-zinc-900 flex items-center justify-center text-zinc-300 text-[10px] font-black shrink-0">+{confirmados.length - 4}</div>}
          </div>
          {myId && (
            <p className={`text-[10px] font-bold flex items-center gap-1 ${meuStatus === 'sim' ? 'text-emerald-400' : 'text-zinc-500'}`}>
              {meuStatus === 'sim' ? <><CheckCircle2 className="w-3 h-3" /> Você confirmou presença</> : 'Você ainda não confirmou'}
            </p>
          )}
        </div>
        <div className="bg-zinc-900 rounded-2xl border border-white/10 p-3">
          <p className="text-[10px] font-black text-zinc-500 uppercase mb-2 flex items-center gap-1"><DollarSign className="w-3 h-3" /> Pagamentos</p>
          <div className="flex gap-2 mb-2">
            <div><p className="text-lg font-black text-emerald-400 leading-none">{pagos}</p><p className="text-[9px] text-zinc-500 font-bold">Pagos</p></div>
            <div><p className="text-lg font-black text-amber-400 leading-none">{pendentesPag}</p><p className="text-[9px] text-zinc-500 font-bold">Pendentes</p></div>
          </div>
          <p className={`text-[10px] font-bold flex items-center gap-1 ${pendentesPag === 0 && confirmados.length > 0 ? 'text-emerald-400' : 'text-zinc-500'}`}>
            {pendentesPag === 0 && confirmados.length > 0 ? <><CheckCircle2 className="w-3 h-3" /> Tudo certo! 🎉</> : `R$ ${game.valor || '0'} por pessoa`}
          </p>
        </div>
      </div>
    </div>
  );
}

function PitchDot({ player }) {
  const overall = overallOf(player);
  const isGk = player.position === 'goleiro';
  const pillColor = isGk ? 'bg-sky-500' : 'bg-emerald-500';
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative">
        <Avatar player={player} size="sm" />
      </div>
      <span className={`text-[9px] font-black text-white ${pillColor} px-1.5 py-[1px] rounded-full shadow-sm shadow-black/40`}>{overall}</span>
      <span className="text-[9px] font-bold text-white/90 drop-shadow max-w-[54px] truncate text-center leading-none">{player.name.split(' ')[0]}</span>
    </div>
  );
}

function PitchFormation({ teams, players }) {
  const letters = ['A', 'B', 'C'];
  const themes = [
    { grad: 'from-emerald-800 via-emerald-700 to-emerald-900', ring: 'ring-emerald-400', chip: 'bg-emerald-500', text: 'text-emerald-300' },
    { grad: 'from-sky-800 via-sky-700 to-sky-900', ring: 'ring-sky-400', chip: 'bg-sky-500', text: 'text-sky-300' },
    { grad: 'from-amber-700 via-amber-600 to-amber-800', ring: 'ring-amber-400', chip: 'bg-amber-500', text: 'text-amber-300' },
  ];
  const [openList, setOpenList] = useState({});
  return (
    <div className="grid grid-cols-1 gap-4">
      {letters.map((l, idx) => {
        const ids = teams[l] || [];
        const list = ids.map(id => players.find(p => p.id === id)).filter(Boolean);
        const gk = list.filter(p => p.position === 'goleiro');
        const linha = list.filter(p => p.position !== 'goleiro');
        const row2 = linha.slice(0, Math.ceil(linha.length / 2));
        const row1 = linha.slice(Math.ceil(linha.length / 2));
        const avgOvr = list.length ? Math.round(list.reduce((s, p) => s + overallOf(p), 0) / list.length) : 0;
        const theme = themes[idx];
        const isOpen = !!openList[l];
        return (
          <div key={l} className="rounded-3xl overflow-hidden shadow-lg shadow-black/50 border border-white/10">
            <div className={`flex items-center justify-between px-4 py-3 bg-gradient-to-r ${theme.grad}`}>
              <div className="flex items-center gap-2">
                <div className={`w-8 h-8 rounded-full ${theme.chip} flex items-center justify-center text-white font-black text-sm ring-2 ring-white/30`}>{l}</div>
                <div>
                  <p className="text-white font-black text-sm uppercase tracking-wide leading-none">Time {l}</p>
                  <p className="text-white/60 text-[10px] font-semibold">{list.length} jogadores</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-white font-black text-lg leading-none">{avgOvr}</p>
                <p className="text-white/60 text-[9px] font-bold uppercase">OVR médio</p>
              </div>
            </div>
            <div className={`relative bg-gradient-to-b ${theme.grad} px-3 pt-4 pb-3`}>
              <div className="absolute inset-0" style={{ backgroundImage: 'repeating-linear-gradient(180deg, rgba(255,255,255,0.05) 0px, rgba(255,255,255,0.05) 26px, rgba(0,0,0,0.05) 26px, rgba(0,0,0,0.05) 52px)' }} />
              <div className="absolute left-1/2 top-2 -translate-x-1/2 w-24 h-24 border-2 border-white/15 rounded-full" />
              <div className="absolute left-1/2 bottom-0 -translate-x-1/2 w-2/5 h-10 border-2 border-b-0 border-white/15 rounded-t-lg" />
              <div className="relative flex flex-col gap-5 items-center py-2">
                <div className="flex gap-4 justify-center flex-wrap">{row2.map(p => <PitchDot key={p.id} player={p} />)}</div>
                <div className="flex gap-4 justify-center flex-wrap">{row1.map(p => <PitchDot key={p.id} player={p} />)}</div>
                <div className="flex gap-4 justify-center">{gk.map(p => <PitchDot key={p.id} player={p} />)}</div>
              </div>
            </div>
            <button onClick={() => setOpenList(o => ({ ...o, [l]: !o[l] }))} className="w-full bg-zinc-900 text-zinc-300 text-xs font-bold py-2.5 flex items-center justify-center gap-1 transition-colors active:bg-zinc-800">
              {isOpen ? 'Fechar detalhes' : 'Ver detalhes'} <ChevronLeft className={`w-3.5 h-3.5 transition-transform ${isOpen ? 'rotate-90' : '-rotate-90'}`} />
            </button>
            {isOpen && (
              <div className="bg-zinc-900 px-3 pb-3 space-y-1.5 animate-[fadein_0.2s_ease-out]">
                {list.map(p => (
                  <div key={p.id} className="flex items-center gap-2 bg-white/5 rounded-lg px-2 py-1.5">
                    <Avatar player={p} size="sm" />
                    <span className="flex-1 text-xs font-semibold text-zinc-100 truncate">{p.name}</span>
                    <span className={`text-[10px] font-black ${theme.text}`}>{overallOf(p)} OVR</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function ViewerJogos({ games, players }) {
  const [openId, setOpenId] = useState(null);
  const [showFormation, setShowFormation] = useState(false);
  return (
    <div className="p-4 space-y-3">
      {games.length === 0 && <EmptyState icon={Calendar} text="Nenhuma pelada marcada ainda" sub="Quando o organizador criar um jogo, ele aparece aqui." />}
      {games.map(g => {
        const confirmados = players.filter(p => g.rsvp[p.id] === 'sim');
        const open = openId === g.id;
        return (
          <div key={g.id} className="bg-zinc-900 rounded-2xl border border-white/10 overflow-hidden">
            <button onClick={() => { const next = !open; setOpenId(next ? g.id : null); setShowFormation(next && !!g.teams); }} className="w-full text-left p-4 transition-colors active:bg-white/5">
              <p className="text-emerald-400 font-black text-sm uppercase tracking-wide">{fmtDate(g.date)} {g.horario ? `· ${g.horario}` : ''}</p>
              {g.local && <p className="text-xs text-zinc-500 mt-0.5">📍 {g.local}</p>}
            </button>
            {open && (
              <div className="px-4 pb-4 space-y-1.5 border-t border-white/5 pt-3 animate-[fadein_0.2s_ease-out]">
                {g.teams && (
                  <button onClick={() => setShowFormation(v => !v)} className="text-[11px] font-bold text-emerald-400 underline mb-2 block">
                    {showFormation ? 'Ver pagamentos' : 'Ver escalação dos times'}
                  </button>
                )}
                {g.teams && showFormation ? (
                  <PitchFormation teams={g.teams} players={players} />
                ) : (
                  <>
                    {confirmados.length === 0 && <p className="text-xs text-zinc-500">Ninguém confirmado ainda.</p>}
                    {confirmados.map(p => (
                      <div key={p.id} className="flex items-center gap-2">
                        <Avatar player={p} size="sm" />
                        <span className="flex-1 text-xs font-semibold text-zinc-300 truncate">{p.name}</span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${g.payments[p.id] ? 'bg-emerald-500/15 text-emerald-300' : 'bg-amber-500/15 text-amber-300'}`}>{g.payments[p.id] ? 'Pago' : 'Pendente'}</span>
                      </div>
                    ))}
                  </>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function StatBox({ value, label, color }) {
  return (
    <div className="flex-1 bg-zinc-900 rounded-xl border border-white/10 py-2.5 text-center flex flex-col justify-center">
      <p className={`text-xl font-black leading-none ${color || 'text-white'}`}>{value}</p>
      <p className="text-[9px] font-bold text-zinc-500 uppercase mt-1">{label}</p>
    </div>
  );
}

function CircleProgress({ percent }) {
  const size = 52, stroke = 6;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (Math.min(Math.max(percent, 0), 100) / 100) * c;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} stroke="rgba(255,255,255,0.08)" strokeWidth={stroke} fill="none" />
        <circle cx={size / 2} cy={size / 2} r={r} stroke="#34d399" strokeWidth={stroke} fill="none" strokeDasharray={c} strokeDashoffset={offset} strokeLinecap="round" style={{ transition: 'stroke-dashoffset 0.6s ease' }} />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-[11px] font-black text-white">{Math.round(percent)}%</span>
      </div>
    </div>
  );
}

function GameDetail({ game, players, subTab, setSubTab, onBack, onRSVP, onPay, onStat, onDelete, onUpdate, onSorteio, send }) {
  const [formationView, setFormationView] = useState(true);
  const confirmados = players.filter(p => game.rsvp[p.id] === 'sim');
  const pendentes = players.filter(p => !game.rsvp[p.id]);
  const devendo = confirmados.filter(p => !game.payments[p.id]);
  const byId = (id) => players.find(p => p.id === id);

  const msgConvite = () => {
    let m = `⚽ Bora pra pelada!\n📅 ${fmtDate(game.date)}\n🕒 ${game.horario || 'a combinar'}\n📍 ${game.local || 'local de sempre'}\n\n`;
    m += `Lista de LINHA (1-15):\n${Array.from({ length: 15 }, (_, i) => `${i + 1}. `).join('\n')}\n\n`;
    m += `Lista de GOLEIROS (1-3):\n${Array.from({ length: 3 }, (_, i) => `${i + 1}. `).join('\n')}\n\n`;
    m += `Responde aqui com seu número e nome pra garantir a vaga! 🙌`;
    send(m);
  };

  const msgLembrete = () => {
    let m = `⏰ Pelada é amanhã! ${fmtDate(game.date)} às ${game.horario || '--:--'}\n`;
    if (confirmados.length) m += `\n✅ Confirmados (${confirmados.length}):\n${confirmados.map(p => `- ${p.name}`).join('\n')}\n`;
    if (pendentes.length) m += `\n⏳ Ainda não confirmaram:\n${pendentes.map(p => `- ${p.name}`).join('\n')}\n`;
    m += `\nQuem falta, chega junto! ⚽`;
    send(m);
  };

  const msgCobranca = () => {
    let m = `💰 Fechamento da pelada – ${fmtDate(game.date)}\n`;
    if (game.valor) m += `Valor: R$ ${game.valor} por pessoa\n`;
    m += `\n❌ Ainda devendo:\n${devendo.length ? devendo.map(p => `- ${p.name}`).join('\n') : 'Ninguém, geral quitou! 🎉'}\n\nBora acertar aí 🙏`;
    send(m);
  };

  const msgSumula = () => {
    const artilheiros = players.filter(p => (game.stats[p.id]?.gols || 0) > 0).map(p => `- ${p.name} (${game.stats[p.id].gols} gol${game.stats[p.id].gols > 1 ? 's' : ''})`);
    let m = `📋 Súmula – Pelada ${fmtDate(game.date)}\n`;
    if (game.mvp) m += `\n⭐ Melhor em campo: ${byId(game.mvp)?.name || ''}\n`;
    if (artilheiros.length) m += `\n⚽ Quem balançou a rede:\n${artilheiros.join('\n')}\n`;
    m += `\nAté a próxima! 🔥`;
    send(m);
  };

  return (
    <div>
      <div className="px-4 pt-4 pb-2 flex items-center justify-between">
        <button onClick={onBack} className="flex items-center gap-1 text-emerald-400 font-bold text-sm"><ChevronLeft className="w-4 h-4" /> Jogos</button>
        <button onClick={() => { if (confirm('Excluir este jogo?')) onDelete(game.id); }} className="text-zinc-500"><Trash2 className="w-4 h-4" /></button>
      </div>
      <div className="px-4 pb-3">
        <div className="flex gap-2 mb-1.5">
          <div className="flex-1 flex items-center gap-1.5 bg-zinc-900 border border-white/10 rounded-xl px-2.5 py-2">
            <Calendar className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <input type="date" value={game.date} onChange={(e) => onUpdate({ date: e.target.value })} className="text-sm font-bold text-zinc-100 bg-transparent outline-none w-full" />
          </div>
          <div className="flex items-center gap-1.5 bg-zinc-900 border border-white/10 rounded-xl px-2.5 py-2">
            <Clock className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <input type="time" value={game.horario} onChange={(e) => onUpdate({ horario: e.target.value })} className="text-sm font-bold text-zinc-100 bg-transparent outline-none" />
          </div>
        </div>
        <div className="flex items-center gap-1.5 bg-zinc-900 border border-white/10 rounded-xl px-2.5 py-2">
          <Users className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
          <input value={game.local} onChange={(e) => onUpdate({ local: e.target.value })} placeholder="Local do jogo" className="text-xs text-zinc-300 bg-transparent outline-none w-full" />
        </div>
      </div>

      <div className="flex gap-1.5 px-4 mb-3 overflow-x-auto">
        {[
          { id: 'presenca', label: 'Presença', icon: Check },
          { id: 'times', label: 'Times', icon: Swords },
          { id: 'caixa', label: 'Caixa', icon: DollarSign },
          { id: 'sumula', label: 'Súmula', icon: Award },
        ].map(t => (
          <button key={t.id} onClick={() => setSubTab(t.id)} className={`flex items-center justify-center gap-1 px-3 py-2 rounded-xl text-xs font-bold border shrink-0 transition-all ${subTab === t.id ? 'bg-emerald-600 text-white border-emerald-600 shadow-md shadow-emerald-900/40' : 'bg-zinc-900 text-zinc-400 border-white/10'}`}>
            <t.icon className="w-3.5 h-3.5" /> {t.label}
          </button>
        ))}
      </div>

      <div className="px-4">
        {subTab === 'presenca' && (
          <div className="animate-[fadein_0.2s_ease-out]">
            <div className="flex items-stretch gap-2 mb-3">
              <StatBox value={confirmados.length} label="Confirmados" color="text-emerald-400" />
              <StatBox value={pendentes.length} label="Pendentes" color="text-amber-400" />
              <div className="bg-zinc-900 rounded-xl border border-white/10 flex items-center justify-center px-2">
                <CircleProgress percent={players.length ? (confirmados.length / players.length) * 100 : 0} />
              </div>
            </div>
            <div className="flex gap-2 mb-3">
              <button onClick={msgConvite} className="flex-1 flex items-center justify-center gap-1.5 bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 font-bold py-2 rounded-xl text-xs transition-transform active:scale-95"><MessageCircle className="w-3.5 h-3.5" /> Convite</button>
              <button onClick={msgLembrete} className="flex-1 flex items-center justify-center gap-1.5 bg-amber-500/10 text-amber-300 border border-amber-500/30 font-bold py-2 rounded-xl text-xs transition-transform active:scale-95"><Clock className="w-3.5 h-3.5" /> Lembrete</button>
            </div>
            <div className="space-y-2">
              {players.map(p => {
                const status = game.rsvp[p.id];
                return (
                  <div key={p.id} className="flex items-center gap-3 bg-zinc-900 rounded-xl border border-white/10 p-2.5">
                    <Avatar player={p} size="sm" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-zinc-100 truncate">{p.name}</p>
                      <p className="text-[10px] text-zinc-500 font-semibold">{p.position === 'goleiro' ? 'Goleiro' : 'Linha'} · OVR {overallOf(p)}</p>
                    </div>
                    <button onClick={() => onRSVP(game.id, p.id, 'sim')} className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${status === 'sim' ? 'bg-emerald-600 text-white' : 'bg-zinc-800 text-zinc-500'}`}><Check className="w-4 h-4" /></button>
                    <button onClick={() => onRSVP(game.id, p.id, 'nao')} className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${status === 'nao' ? 'bg-rose-600 text-white' : 'bg-zinc-800 text-zinc-500'}`}><X className="w-4 h-4" /></button>
                  </div>
                );
              })}
              {players.length === 0 && <EmptyState icon={Users} text="Cadastre jogadores na aba Elenco primeiro" />}
            </div>
          </div>
        )}

        {subTab === 'times' && (
          <div className="animate-[fadein_0.2s_ease-out]">
            <button onClick={onSorteio} className="w-full mb-3 flex items-center justify-center gap-2 bg-emerald-600 text-white font-bold py-2.5 rounded-xl text-sm transition-transform active:scale-[0.98]"><Shuffle className="w-4 h-4" /> Sortear 3 times (5 linha + 1 gol)</button>
            {confirmados.length > 0 && confirmados.length < 18 && (
              <p className="text-[11px] text-zinc-500 mb-3 text-center">Ideal: 15 de linha + 3 goleiros confirmados. Com o que tiver, o sorteio remaneja.</p>
            )}
            {!game.teams ? (
              <p className="text-center text-sm text-zinc-500 py-10">Confirme presenças e sorteie os times.</p>
            ) : (
              <>
                <button onClick={() => setFormationView(v => !v)} className="text-[11px] font-bold text-emerald-400 underline mb-3 block">
                  {formationView ? 'Ver lista' : 'Ver formação no campinho'}
                </button>
                {formationView ? (
                  <PitchFormation teams={game.teams} players={players} />
                ) : (
                  <div className="grid grid-cols-3 gap-2">
                    <TeamCol title="Time A" ids={game.teams.A} players={players} colorIdx={0} />
                    <TeamCol title="Time B" ids={game.teams.B} players={players} colorIdx={1} />
                    <TeamCol title="Time C" ids={game.teams.C} players={players} colorIdx={2} />
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {subTab === 'caixa' && (
          <div className="animate-[fadein_0.2s_ease-out]">
            <div className="flex items-stretch gap-2 mb-3">
              <StatBox value={`R$ ${((Number(game.valor) || 0) * confirmados.filter(p => game.payments[p.id]).length).toFixed(0)}`} label="Arrecadado" color="text-emerald-400" />
              <StatBox value={devendo.length} label="Pendentes" color="text-amber-400" />
            </div>
            <div className="flex items-center gap-2 bg-zinc-900 rounded-xl border border-white/10 p-2.5 mb-3">
              <span className="text-xs font-bold text-zinc-400 uppercase">Valor por pessoa</span>
              <input value={game.valor} onChange={(e) => onUpdate({ valor: e.target.value })} placeholder="R$" className="flex-1 text-right text-sm font-bold text-zinc-100 outline-none bg-transparent" />
            </div>
            <button onClick={msgCobranca} className="w-full mb-3 flex items-center justify-center gap-2 bg-amber-500/10 text-amber-300 border border-amber-500/30 font-bold py-2.5 rounded-xl text-sm transition-transform active:scale-[0.98]"><MessageCircle className="w-4 h-4" /> Cobrar pendentes no WhatsApp</button>
            <div className="space-y-2">
              {players.map(p => {
                const paid = !!game.payments[p.id];
                return (
                  <div key={p.id} className="flex items-center gap-3 bg-zinc-900 rounded-xl border border-white/10 p-2.5">
                    <Avatar player={p} size="sm" />
                    <span className="flex-1 text-sm font-semibold text-zinc-100 truncate">{p.name}</span>
                    <button onClick={() => onPay(game.id, p.id)} className={`px-3 py-1.5 rounded-full text-xs font-bold transition-colors flex items-center gap-1 ${paid ? 'bg-emerald-600 text-white' : 'bg-amber-500/15 text-amber-300'}`}>{paid ? <><CheckCircle2 className="w-3.5 h-3.5" /> Pago</> : 'Pendente'}</button>
                  </div>
                );
              })}
              {players.length === 0 && <EmptyState icon={Users} text="Cadastre jogadores na aba Elenco primeiro" />}
            </div>
          </div>
        )}

        {subTab === 'sumula' && (
          <div className="space-y-3 animate-[fadein_0.2s_ease-out]">
            {confirmados.length > 0 && (
              <div className="bg-zinc-900 rounded-xl border border-white/10 p-3 flex items-center gap-2">
                <Star className="w-4 h-4 text-amber-500 shrink-0" />
                <span className="text-xs font-bold text-zinc-400 shrink-0">MVP</span>
                <select value={game.mvp || ''} onChange={(e) => onUpdate({ mvp: e.target.value || null })} className="flex-1 text-sm font-bold text-zinc-100 bg-zinc-800 rounded-lg px-2 py-1.5 outline-none">
                  <option value="">Selecionar craque do jogo</option>
                  {confirmados.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
            )}
            <button onClick={msgSumula} className="w-full flex items-center justify-center gap-2 bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 font-bold py-2.5 rounded-xl text-sm transition-transform active:scale-[0.98]"><MessageCircle className="w-4 h-4" /> Mandar súmula no WhatsApp</button>
            {players.map(p => {
              const s = game.stats[p.id] || {};
              const isGk = p.position === 'goleiro';
              return (
                <div key={p.id} className={`rounded-xl border p-3 ${isGk ? 'bg-sky-500/5 border-sky-500/20' : 'bg-zinc-900 border-white/10'}`}>
                  <div className="flex items-center gap-2 mb-2">
                    <Avatar player={p} size="sm" />
                    <span className="text-sm font-bold text-zinc-100 flex-1 truncate">{p.name}</span>
                    {isGk && <span className="text-[9px] font-black text-sky-300 bg-sky-500/15 px-2 py-0.5 rounded-full uppercase">Goleiro</span>}
                    {game.mvp === p.id && <Star className="w-4 h-4 text-amber-500" />}
                  </div>
                  <div className={`grid gap-2 ${isGk ? 'grid-cols-3' : 'grid-cols-2'}`}>
                    {!isGk ? (
                      <>
                        <StatField label="Gols" icon={Target} value={s.gols} onChange={(v) => onStat(game.id, p.id, 'gols', v)} />
                        <StatField label="Assist." icon={Award} value={s.assist} onChange={(v) => onStat(game.id, p.id, 'assist', v)} />
                      </>
                    ) : (
                      <>
                        <StatField label="Defesas" icon={Shield} value={s.defesas} onChange={(v) => onStat(game.id, p.id, 'defesas', v)} />
                        <StatField label="Sofridos" icon={Target} value={s.sofridos} onChange={(v) => onStat(game.id, p.id, 'sofridos', v)} />
                        <StatField label="Pênaltis" icon={Award} value={s.penaltis} onChange={(v) => onStat(game.id, p.id, 'penaltis', v)} />
                      </>
                    )}
                  </div>
                </div>
              );
            })}
            {players.length === 0 && <EmptyState icon={Users} text="Cadastre jogadores na aba Elenco primeiro" />}
          </div>
        )}
      </div>
    </div>
  );
}

function TeamCol({ title, ids, players, colorIdx }) {
  const list = ids.map(id => players.find(p => p.id === id)).filter(Boolean);
  const palette = ['bg-emerald-500/10 border-emerald-500/30 text-emerald-300', 'bg-sky-500/10 border-sky-500/30 text-sky-300', 'bg-amber-500/10 border-amber-500/30 text-amber-300'];
  return (
    <div className={`rounded-xl border p-2 ${palette[colorIdx % palette.length]}`}>
      <p className="text-[11px] font-black uppercase mb-1.5">{title}</p>
      <div className="space-y-1.5">
        {list.map(p => (
          <div key={p.id} className="flex items-center gap-1">
            <Avatar player={p} size="sm" />
            <span className="text-[11px] font-semibold truncate">{p.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function StatField({ label, icon: Icon, value, onChange }) {
  return (
    <div className="flex items-center gap-1 bg-zinc-800 rounded-lg border border-white/5 px-1.5 py-1.5">
      <Icon className="w-3 h-3 text-zinc-500 shrink-0" />
      <span className="text-[10px] text-zinc-400 font-medium shrink-0 truncate">{label}</span>
      <input type="number" min="0" value={value ?? ''} onChange={(e) => onChange(e.target.value)} className="w-full text-right text-sm font-bold text-zinc-100 bg-transparent outline-none" placeholder="0" />
    </div>
  );
}

function ElencoTab({ players, onAdd, onOpenEdit }) {
  const [name, setName] = useState('');
  const [position, setPosition] = useState('linha');
  const [search, setSearch] = useState('');

  const handleAdd = () => {
    if (!name.trim()) return;
    const dup = players.find(p => p.name.trim().toLowerCase() === name.trim().toLowerCase());
    if (dup) {
      if (!confirm(`Já existe um jogador chamado "${dup.name}" no elenco. Cadastrar outro com o mesmo nome mesmo assim? (isso separa a pontuação em dois registros)`)) return;
    }
    onAdd(name, position);
    setName('');
  };

  const linhaCount = players.filter(p => p.position !== 'goleiro').length;
  const golCount = players.filter(p => p.position === 'goleiro').length;
  const filtered = players.filter(p => p.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="p-4">
      {players.length > 0 && (
        <div className="flex gap-2 mb-4">
          <StatBox value={players.length} label="Jogadores" />
          <StatBox value={linhaCount} label="Linha" color="text-emerald-400" />
          <StatBox value={golCount} label="Goleiros" color="text-sky-400" />
        </div>
      )}
      <div className="bg-zinc-900 rounded-2xl border border-white/10 p-3 mb-4 shadow-sm">
        <p className="text-xs font-bold text-zinc-400 uppercase mb-2">Adicionar jogador</p>
        <input value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
          placeholder="Nome do jogador" className="w-full bg-zinc-800 border border-white/10 rounded-lg px-3 py-2 text-sm mb-2 outline-none focus:border-emerald-500 transition-colors text-zinc-100 placeholder:text-zinc-500" />
        <div className="flex gap-2">
          <button onClick={() => setPosition('linha')} className={`flex-1 py-2 rounded-lg text-xs font-bold border transition-colors ${position === 'linha' ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-zinc-900 text-zinc-400 border-white/10'}`}>Linha</button>
          <button onClick={() => setPosition('goleiro')} className={`flex-1 py-2 rounded-lg text-xs font-bold border transition-colors ${position === 'goleiro' ? 'bg-sky-600 text-white border-sky-600' : 'bg-zinc-900 text-zinc-400 border-white/10'}`}>Goleiro</button>
          <button onClick={handleAdd} className="px-4 bg-emerald-600 text-white rounded-lg transition-transform active:scale-95"><Plus className="w-4 h-4" /></button>
        </div>
      </div>
      {players.length > 0 && (
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar jogador..." className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-zinc-100 outline-none focus:border-emerald-500 mb-3 transition-colors" />
      )}
      <div className="space-y-2">
        {filtered.map(p => {
          const overall = overallOf(p);
          const tier = cardTier(overall);
          return (
            <button key={p.id} onClick={() => onOpenEdit(p)} className="w-full flex items-center gap-3 bg-zinc-900 rounded-xl border border-white/10 p-3 text-left transition-transform active:scale-[0.98]">
              <Avatar player={p} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-zinc-100 truncate">{p.name}</p>
                <p className="text-[11px] text-zinc-500 flex items-center gap-1">
                  {p.position === 'goleiro' ? <Shield className="w-3 h-3" /> : <Footprints className="w-3 h-3" />}
                  {p.position === 'goleiro' ? 'Goleiro' : 'Linha'} · #{p.numero}
                </p>
              </div>
              <div className="flex flex-col items-end gap-1 shrink-0">
                <span className={`text-[10px] font-black px-2 py-0.5 rounded-full bg-gradient-to-r ${tier.grad} ${tier.text}`}>{overall} OVR</span>
                <span className="text-[9px] text-zinc-600 font-bold">PIN {p.pin || '----'}</span>
              </div>
            </button>
          );
        })}
        {players.length === 0 && <EmptyState icon={Users} text="Nenhum jogador cadastrado ainda" sub="Adicione o primeiro jogador aí em cima." />}
        {players.length > 0 && filtered.length === 0 && <p className="text-center text-zinc-500 text-sm py-6">Nenhum jogador encontrado.</p>}
      </div>
    </div>
  );
}

function ChipBtn({ active, onClick, icon: Icon, label }) {
  return (
    <button onClick={onClick} className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold border transition-colors ${active ? 'bg-emerald-700 text-white border-emerald-700' : 'bg-zinc-900 text-zinc-400 border-white/10'}`}>
      <Icon className="w-3.5 h-3.5" /> {label}
    </button>
  );
}

function RankingList({ list, valueKey, unit, onOpenCard, myId, showCrown }) {
  if (list.length === 0) return <p className="text-xs text-zinc-500 text-center py-4">Sem dados ainda.</p>;
  return (
    <div className="bg-zinc-900 rounded-2xl border border-white/10 divide-y divide-white/5 overflow-hidden animate-[fadein_0.2s_ease-out]">
      {list.map((r, i) => {
        const isTop = showCrown && i === 0;
        return (
          <button key={r.player.id} onClick={() => onOpenCard(r.player)} className={`w-full flex items-center gap-3 p-2.5 transition-colors active:bg-white/5 ${isTop ? 'bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent' : ''}`}>
            <span className="w-6 text-center shrink-0">
              {isTop ? <Crown className="w-4 h-4 text-amber-500 mx-auto" /> : <span className="text-xs font-black text-zinc-600">{i + 1}</span>}
            </span>
            <Avatar player={r.player} size={isTop ? 'md' : 'sm'} highlight={isTop} />
            <span className={`flex-1 text-sm truncate text-left flex items-center gap-1 ${isTop ? 'font-black text-amber-200' : 'font-semibold text-zinc-100'}`}>
              {r.player.name}
              {r.streakGoals >= 3 && <Flame className="w-3 h-3 text-orange-500 shrink-0" />}
              {r.mvpCount >= 3 && <Crown className="w-3 h-3 text-amber-500 shrink-0" />}
              {myId === r.player.id && <span className="text-[10px] text-emerald-400 font-bold">(você)</span>}
            </span>
            <span className={`text-sm font-black ${isTop ? 'text-amber-400' : 'text-emerald-400'}`}>{r[valueKey]} <span className="text-[10px] font-medium text-zinc-500">{unit}</span></span>
          </button>
        );
      })}
    </div>
  );
}

function Podium({ top3, onOpenCard }) {
  if (top3.length === 0) return null;
  const [second, first, third] = [top3[1], top3[0], top3[2]];
  const slot = (r, place) => {
    if (!r) return <div className="flex-1" />;
    const heights = { 1: 'h-24', 2: 'h-14', 3: 'h-10' };
    const medalColor = { 1: 'text-amber-400', 2: 'text-slate-300', 3: 'text-orange-400' };
    const barGrad = { 1: 'from-amber-400 to-amber-200', 2: 'from-slate-400 to-slate-200', 3: 'from-orange-400 to-orange-200' };
    return (
      <button onClick={() => onOpenCard(r.player)} className="relative flex-1 flex flex-col items-center gap-1.5 transition-transform active:scale-95">
        {place === 1 && (
          <div className="absolute -mt-9 animate-bounce" style={{ animationDuration: '2.2s' }}>
            <Crown className="w-6 h-6 text-amber-400 drop-shadow-[0_0_6px_rgba(251,191,36,0.6)]" />
          </div>
        )}
        <Medal className={`w-5 h-5 ${medalColor[place]} mt-4`} />
        <div className="relative">
          {place === 1 && <span className="absolute inset-0 rounded-full bg-amber-400/40 animate-ping" style={{ animationDuration: '2.4s' }} />}
          <div className={place === 1 ? 'relative drop-shadow-[0_0_12px_rgba(251,191,36,0.35)]' : 'relative'}>
            <Avatar player={r.player} size={place === 1 ? 'md' : 'sm'} highlight={place === 1} />
          </div>
        </div>
        <span className={`font-bold text-zinc-100 truncate max-w-[80px] ${place === 1 ? 'text-sm' : 'text-[11px]'}`}>{r.player.name.split(' ')[0]}</span>
        <span className={`font-black text-emerald-400 ${place === 1 ? 'text-base' : 'text-xs'}`}>{r.pts} pts</span>
        <div className={`w-full ${heights[place]} rounded-t-xl bg-gradient-to-t ${barGrad[place]} relative flex items-start justify-center pt-1.5 shadow-lg ${place === 1 ? 'shadow-amber-900/50' : 'shadow-black/30'}`}>
          <span className="text-black/50 font-black text-xs">{place}º</span>
        </div>
      </button>
    );
  };
  const sparkles = [
    { top: '12%', left: '10%', delay: '0s' }, { top: '22%', left: '85%', delay: '0.6s' },
    { top: '55%', left: '6%', delay: '1.1s' }, { top: '8%', left: '55%', delay: '1.6s' },
    { top: '60%', left: '92%', delay: '0.3s' },
  ];
  return (
    <div className="relative rounded-3xl bg-gradient-to-b from-amber-950/40 via-zinc-900 to-black border border-amber-500/20 px-3 pt-8 pb-0 mb-4 overflow-hidden shadow-lg shadow-amber-950/30">
      <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at 50% 0%, #f59e0b 0%, transparent 65%)' }} />
      <div className="absolute -top-10 left-1/2 -translate-x-1/2 w-56 h-56 rounded-full bg-amber-500/10 blur-3xl animate-pulse" style={{ animationDuration: '3s' }} />
      {sparkles.map((s, i) => (
        <Sparkles key={i} className="absolute w-3 h-3 text-amber-300/70 animate-pulse" style={{ top: s.top, left: s.left, animationDelay: s.delay, animationDuration: '2.5s' }} />
      ))}
      <div className="relative flex items-end gap-2">
        {slot(second, 2)}
        {slot(first, 1)}
        {slot(third, 3)}
      </div>
    </div>
  );
}

function SeasonSummary({ games, players }) {
  const totalGames = games.length;
  if (totalGames === 0) return null;
  let totalGols = 0;
  let recorde = null;
  games.forEach(g => {
    players.forEach(p => {
      const s = g.stats[p.id];
      const gols = Number(s?.gols) || 0;
      totalGols += gols;
      if (gols > 0 && (!recorde || gols > recorde.gols)) recorde = { player: p, gols, date: g.date };
    });
  });
  return (
    <div className="bg-zinc-900 rounded-2xl border border-white/10 p-3">
      <p className="text-xs font-black text-zinc-400 uppercase mb-2 flex items-center gap-1"><Sparkles className="w-3.5 h-3.5 text-amber-500" /> Resumo da temporada</p>
      <div className="grid grid-cols-3 gap-2 text-center mb-2">
        <MiniStat label="Peladas" value={totalGames} />
        <MiniStat label="Gols" value={totalGols} />
        <MiniStat label="Jogadores" value={players.length} />
      </div>
      {recorde && (
        <p className="text-[11px] text-zinc-400 text-center">
          🔥 Maior artilheiro num jogo só: <span className="font-bold text-zinc-100">{recorde.player.name}</span> com {recorde.gols} gols em {fmtDate(recorde.date)}
        </p>
      )}
    </div>
  );
}

function CompareRow({ label, va, vb }) {
  const diff = va - vb;
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-white/5 text-sm">
      <span className={`font-black w-12 text-left flex items-center gap-0.5 ${diff > 0 ? 'text-emerald-400' : diff < 0 ? 'text-zinc-500' : 'text-zinc-400'}`}>
        {diff > 0 && <ArrowUp className="w-3 h-3" />}{va}
      </span>
      <span className="text-[11px] text-zinc-400 font-medium flex-1 text-center">{label}</span>
      <span className={`font-black w-12 text-right flex items-center justify-end gap-0.5 ${diff < 0 ? 'text-emerald-400' : diff > 0 ? 'text-zinc-500' : 'text-zinc-400'}`}>
        {vb}{diff < 0 && <ArrowUp className="w-3 h-3" />}
      </span>
    </div>
  );
}

function CompareModal({ players, ranking, onClose }) {
  const [aId, setAId] = useState('');
  const [bId, setBId] = useState('');
  const rA = ranking.find(r => r.player.id === aId);
  const rB = ranking.find(r => r.player.id === bId);
  const a = rA?.player, b = rB?.player;
  const samePos = a && b && a.position === b.position;
  const attrs = samePos ? attrsFor(a.position) : [];

  const share = () => {
    if (!a || !b) return;
    drawCompareCanvas(a, b, rA, rB, (canvas) => shareCanvas(canvas, `comparativo.png`));
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-40 p-4 animate-[fadein_0.2s_ease-out]" onClick={onClose}>
      <div className="bg-zinc-900 rounded-3xl w-full max-w-sm max-h-[90vh] overflow-y-auto animate-[popin_0.22s_ease-out]" onClick={(e) => e.stopPropagation()}>
        <div className="p-4">
          <h3 className="font-black text-white mb-3 flex items-center gap-2"><Swords className="w-4 h-4 text-emerald-400" /> Comparar jogadores</h3>
          <div className="grid grid-cols-2 gap-2 mb-4">
            <select value={aId} onChange={(e) => setAId(e.target.value)} className="bg-zinc-800 border border-white/10 rounded-lg px-2 py-1.5 text-xs text-zinc-100">
              <option value="">Jogador 1</option>
              {players.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <select value={bId} onChange={(e) => setBId(e.target.value)} className="bg-zinc-800 border border-white/10 rounded-lg px-2 py-1.5 text-xs text-zinc-100">
              <option value="">Jogador 2</option>
              {players.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          {a && b && (
            <>
              <div className="flex items-center justify-center gap-4 mb-4">
                <div className="flex flex-col items-center gap-1">
                  <Avatar player={a} size="md" />
                  <span className="text-xs font-bold text-zinc-100">{a.name.split(' ')[0]}</span>
                </div>
                <span className="text-zinc-600 font-black">VS</span>
                <div className="flex flex-col items-center gap-1">
                  <Avatar player={b} size="md" />
                  <span className="text-xs font-bold text-zinc-100">{b.name.split(' ')[0]}</span>
                </div>
              </div>
              <CompareRow label="Overall" va={overallOf(a)} vb={overallOf(b)} />
              <CompareRow label="Pontos" va={rA.pts} vb={rB.pts} />
              <CompareRow label="Jogos" va={rA.jogos} vb={rB.jogos} />
              <CompareRow label="MVPs" va={rA.mvpCount} vb={rB.mvpCount} />
              {samePos ? attrs.map(attr => (
                <CompareRow key={attr.key} label={attr.label} va={a.attrs?.[attr.key] ?? 50} vb={b.attrs?.[attr.key] ?? 50} />
              )) : (
                <p className="text-[11px] text-zinc-500 text-center mt-2">Posições diferentes — atributos específicos não comparados.</p>
              )}
              <button onClick={share} className="w-full mt-4 flex items-center justify-center gap-2 bg-emerald-700 text-white font-bold py-2.5 rounded-xl text-sm transition-transform active:scale-95">
                <Share2 className="w-4 h-4" /> Compartilhar comparativo
              </button>
            </>
          )}
        </div>
        <button onClick={onClose} className="w-full bg-zinc-800 text-zinc-400 font-bold text-sm py-2.5">Fechar</button>
      </div>
    </div>
  );
}

function RankingTab({ ranking, onOpenCard, myId, players, games }) {
  const [linhaCat, setLinhaCat] = useState('artilheiros');
  const [golCat, setGolCat] = useState('defesas');
  const [compareOpen, setCompareOpen] = useState(false);

  const geral = React.useMemo(() => [...ranking].sort((a, b) => b.pts - a.pts), [ranking]);
  const top3 = geral.slice(0, 3);

  const linhaList = React.useMemo(() => {
    const arr = ranking.filter(r => r.player.position !== 'goleiro');
    if (linhaCat === 'artilheiros') return arr.filter(r => r.gols > 0).sort((a, b) => b.gols - a.gols);
    return arr.filter(r => r.assist > 0).sort((a, b) => b.assist - a.assist);
  }, [ranking, linhaCat]);

  const golList = React.useMemo(() => {
    const arr = ranking.filter(r => r.player.position === 'goleiro');
    if (golCat === 'defesas') return arr.filter(r => r.defesas > 0).sort((a, b) => b.defesas - a.defesas);
    return arr.filter(r => r.sofridos > 0).sort((a, b) => b.sofridos - a.sofridos);
  }, [ranking, golCat]);

  return (
    <div className="p-4 space-y-5">
      <SeasonSummary games={games} players={players} />

      <div>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5">
            <Trophy className="w-4 h-4 text-amber-500" />
            <h3 className="font-black text-zinc-100 text-sm uppercase tracking-wide">Geral</h3>
          </div>
          <button onClick={() => setCompareOpen(true)} className="flex items-center gap-1 text-[11px] font-bold text-emerald-400">
            <Swords className="w-3.5 h-3.5" /> Comparar
          </button>
        </div>
        <Podium top3={top3} onOpenCard={onOpenCard} />
        <RankingList list={geral} valueKey="pts" unit="pts" onOpenCard={onOpenCard} myId={myId} showCrown />
        <p className="text-[10px] text-zinc-500 mt-2 leading-relaxed px-1">
          Pontuação: gol +{POINTS.gol} · assistência +{POINTS.assist} · defesa +{POINTS.defesa} · gol sofrido {POINTS.sofrido} · pênalti defendido +{POINTS.penalti} · MVP +{POINTS.mvp}
        </p>
      </div>

      <div>
        <div className="flex items-center gap-1.5 mb-2">
          <Footprints className="w-4 h-4 text-emerald-400" />
          <h3 className="font-black text-zinc-100 text-sm uppercase tracking-wide">Jogadores de linha</h3>
        </div>
        <div className="flex gap-1.5 mb-2">
          <ChipBtn active={linhaCat === 'artilheiros'} onClick={() => setLinhaCat('artilheiros')} icon={Target} label="Artilheiros" />
          <ChipBtn active={linhaCat === 'garcons'} onClick={() => setLinhaCat('garcons')} icon={Award} label="Garçons" />
        </div>
        <RankingList list={linhaList} valueKey={linhaCat === 'artilheiros' ? 'gols' : 'assist'} unit={linhaCat === 'artilheiros' ? 'gols' : 'assist.'} onOpenCard={onOpenCard} myId={myId} />
      </div>

      <div>
        <div className="flex items-center gap-1.5 mb-2">
          <Shield className="w-4 h-4 text-sky-600" />
          <h3 className="font-black text-zinc-100 text-sm uppercase tracking-wide">Goleiros</h3>
        </div>
        <div className="flex gap-1.5 mb-2">
          <ChipBtn active={golCat === 'defesas'} onClick={() => setGolCat('defesas')} icon={Shield} label="Defesas" />
          <ChipBtn active={golCat === 'vazadas'} onClick={() => setGolCat('vazadas')} icon={TrendingDown} label="Vazadas" />
        </div>
        <RankingList list={golList} valueKey={golCat === 'defesas' ? 'defesas' : 'sofridos'} unit={golCat === 'defesas' ? 'defesas' : 'sofridos'} onOpenCard={onOpenCard} myId={myId} />
      </div>

      {compareOpen && <CompareModal players={players} ranking={ranking} onClose={() => setCompareOpen(false)} />}
    </div>
  );
}
