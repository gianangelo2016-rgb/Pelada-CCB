import React, { useState, useEffect } from 'react';
import { Users, Calendar, Trophy, Check, X, DollarSign, Plus, Trash2, Shield, Target, MessageCircle, ChevronLeft, Loader2, Footprints, Award, Clock, Lock, Unlock, Camera, Shuffle, Star, Crown, KeyRound, Swords, TrendingDown } from 'lucide-react';
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
  if (overall <= 35) return { grad: 'from-rose-800 via-rose-700 to-rose-900', text: 'text-rose-50', accent: 'text-rose-200' };
  if (overall <= 50) return { grad: 'from-yellow-400 via-amber-400 to-yellow-500', text: 'text-amber-900', accent: 'text-amber-800' };
  if (overall <= 70) return { grad: 'from-emerald-600 via-emerald-500 to-emerald-700', text: 'text-emerald-50', accent: 'text-emerald-100' };
  if (overall <= 85) return { grad: 'from-slate-300 via-slate-100 to-slate-400', text: 'text-slate-800', accent: 'text-slate-600' };
  return { grad: 'from-cyan-300 via-sky-200 to-indigo-300', text: 'text-indigo-900', accent: 'text-indigo-700' };
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

function sortTeams(confirmedPlayers) {
  const goleiros = [...confirmedPlayers.filter(p => p.position === 'goleiro')].sort((a, b) => overallOf(b) - overallOf(a));
  const linha = [...confirmedPlayers.filter(p => p.position !== 'goleiro')].sort((a, b) => overallOf(b) - overallOf(a));
  const letters = ['A', 'B', 'C'];
  const gGroups = snakeDistribute(goleiros, 3);
  const lGroups = snakeDistribute(linha, 3);
  const teams = {};
  letters.forEach((l, i) => { teams[l] = [...gGroups[i], ...lGroups[i]].map(p => p.id); });
  return teams;
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
      <div className="w-16 h-16 rounded-full bg-stone-100 flex items-center justify-center mx-auto mb-3">
        <Icon className="w-7 h-7 text-stone-300" />
      </div>
      <p className="text-sm font-semibold text-stone-500">{text}</p>
      {sub && <p className="text-xs text-stone-400 mt-1">{sub}</p>}
    </div>
  );
}

export default function App() {
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
    updateGame(gameId, { teams: sortTeams(confirmed) });
  });

  const deleteGame = guard((gameId) => {
    saveGames(games.filter(g => g.id !== gameId));
    setSelectedGameId(null);
  });

  const send = (text) => window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');

  const ranking = React.useMemo(() => {
    const agg = {};
    players.forEach(p => { agg[p.id] = { player: p, pts: 0, gols: 0, assist: 0, defesas: 0, sofridos: 0, penaltis: 0, jogos: 0, mvpCount: 0 }; });
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
    return Object.values(agg).sort((a, b) => b.pts - a.pts);
  }, [players, games]);

  const selectedGame = games.find(g => g.id === selectedGameId);
  const showIdentityScreen = !loading && !isOrganizer && players.length > 0 && !myId;

  if (loading) {
    return <div className="min-h-screen bg-stone-50 flex items-center justify-center"><Loader2 className="w-8 h-8 text-emerald-700 animate-spin" /></div>;
  }

  if (showIdentityScreen) {
    return (
      <>
        <IdentityScreen players={players} onVerified={setIdentity} onOrganizerClick={() => setPinModal(true)} setToast={setToast} />
        {toast && <div className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-stone-900 text-white text-sm px-4 py-2 rounded-full shadow-lg z-30 animate-popin">{toast}</div>}
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
    <div className="min-h-screen bg-stone-100 flex flex-col">
      <div className="bg-gradient-to-br from-emerald-900 via-emerald-800 to-emerald-700 text-white px-4 pt-6 pb-4 relative overflow-hidden shrink-0">
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'repeating-linear-gradient(90deg, transparent, transparent 38px, white 38px, white 40px)' }} />
        <div className="relative flex items-center justify-between">
          <div>
            <p className="text-emerald-300 text-[11px] font-bold tracking-widest uppercase">{isOrganizer ? 'Modo organizador' : me ? `Olá, ${me.name.split(' ')[0]}` : 'Modo visualização'}</p>
            <h1 className="text-2xl font-black tracking-tight">Racha do Grupo</h1>
          </div>
          <button onClick={() => isOrganizer ? lockOrganizer() : setPinModal(true)} className="w-11 h-11 rounded-full border-2 border-emerald-400 flex items-center justify-center transition-transform active:scale-90">
            {isOrganizer ? <Unlock className="w-5 h-5 text-emerald-300" /> : <Lock className="w-5 h-5 text-emerald-300" />}
          </button>
        </div>
        {!isOrganizer && me && (
          <button onClick={clearIdentity} className="relative mt-2 text-[11px] text-emerald-300 font-semibold underline">Trocar identidade</button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto pb-24">
        <div key={tab + (selectedGameId || '')} className="animate-fadein">
          {tab === 'jogos' && isOrganizer && !selectedGame && (
            <JogosList games={games} players={players} onCreate={createGame} onSelect={(id) => { setSelectedGameId(id); setGameSubTab('presenca'); }} />
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
          {tab === 'ranking' && <RankingTab ranking={ranking} onOpenCard={setCardPlayer} myId={myId} />}
        </div>
      </div>

      {toast && <div className="fixed bottom-24 left-1/2 -translate-x-1/2 bg-stone-900 text-white text-sm px-4 py-2 rounded-full shadow-lg z-30 animate-popin">{toast}</div>}

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

      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-stone-200 flex justify-around items-center py-2 px-2 max-w-lg mx-auto">
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
    <button onClick={onClick} className={`flex flex-col items-center gap-0.5 px-6 py-1.5 rounded-2xl transition-all duration-200 active:scale-90 ${active ? 'text-emerald-700 bg-emerald-50' : 'text-stone-400'}`}>
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
    <div className="min-h-screen bg-gradient-to-br from-emerald-900 via-emerald-800 to-emerald-700 flex items-center justify-center p-6">
      <div className="bg-white rounded-3xl p-5 w-full max-w-xs animate-popin">
        <h2 className="font-black text-lg text-stone-800 mb-1">Quem é você?</h2>
        <p className="text-xs text-stone-400 mb-3">Escolha seu nome e digite o PIN que o organizador te passou.</p>
        <select value={selected} onChange={(e) => setSelected(e.target.value)} className="w-full bg-stone-50 border border-stone-200 rounded-lg px-3 py-2 text-sm mb-2 outline-none">
          <option value="">Selecione seu nome...</option>
          {players.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <input type="tel" inputMode="numeric" maxLength={4} value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))} placeholder="PIN"
          className="w-full text-center tracking-[0.3em] text-lg font-bold bg-stone-50 border border-stone-200 rounded-lg px-3 py-2 mb-3 outline-none focus:border-emerald-500 transition-colors" />
        <button onClick={submit} className="w-full bg-emerald-700 text-white font-bold py-2.5 rounded-xl text-sm mb-3 transition-transform active:scale-95">Entrar</button>
        <button onClick={onOrganizerClick} className="w-full text-center text-xs text-stone-400 font-semibold">Sou o organizador</button>
      </div>
    </div>
  );
}

function PinModal({ config, onClose, onSetPin, onSubmitPin }) {
  const [pin, setPin] = useState('');
  const isNew = !config.pin;
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-40 p-6 animate-fadein" onClick={onClose}>
      <div className="bg-white rounded-2xl p-5 w-full max-w-xs animate-popin" onClick={(e) => e.stopPropagation()}>
        <h3 className="font-black text-stone-800 mb-1">{isNew ? 'Criar senha de organizador' : 'Entrar como organizador'}</h3>
        <p className="text-xs text-stone-400 mb-3">{isNew ? 'Só quem tiver essa senha poderá alterar dados do app.' : 'Digite a senha do organizador.'}</p>
        <input type="tel" inputMode="numeric" maxLength={6} value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
          placeholder="Senha (números)" autoFocus
          className="w-full text-center tracking-[0.3em] text-lg font-bold bg-stone-50 border border-stone-200 rounded-lg px-3 py-2 mb-3 outline-none focus:border-emerald-500 transition-colors" />
        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 py-2 rounded-lg text-sm font-bold text-stone-500 bg-stone-100 transition-transform active:scale-95">Cancelar</button>
          <button onClick={() => pin && (isNew ? onSetPin(pin) : onSubmitPin(pin))} className="flex-1 py-2 rounded-lg text-sm font-bold text-white bg-emerald-700 transition-transform active:scale-95">{isNew ? 'Criar' : 'Entrar'}</button>
        </div>
      </div>
    </div>
  );
}

function MiniStat({ label, value, highlight }) {
  return (
    <div className={`rounded-xl py-2 transition-colors ${highlight ? 'bg-emerald-50' : 'bg-stone-50'}`}>
      <p className={`text-lg font-black ${highlight ? 'text-emerald-700' : 'text-stone-700'}`}>{value}</p>
      <p className="text-[10px] text-stone-400 font-semibold uppercase">{label}</p>
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
  const initials = player.name.trim().split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase();
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-40 p-6 animate-fadein" onClick={onClose}>
      <div className="w-full max-w-xs rounded-3xl overflow-hidden shadow-2xl animate-popin" onClick={(e) => e.stopPropagation()}>
        <div className={`relative h-48 bg-gradient-to-br ${tier.grad}`}>
          {player.foto ? (
            <img src={player.foto} alt={player.name} className="absolute inset-0 w-full h-full object-cover" />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center overflow-hidden">
              <span className={`text-9xl font-black opacity-20 ${tier.text}`}>{initials}</span>
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-black/10" />
          <span className={`absolute top-3 right-3 text-[9px] font-black uppercase tracking-wide px-2 py-1 rounded-full bg-white/20 backdrop-blur-sm text-white`}>{isGk ? 'Goleiro' : 'Linha'}</span>
          <p className="absolute top-3 left-3 text-5xl font-black leading-none text-white drop-shadow-lg">{overall}</p>
          <div className="absolute bottom-3 left-3 right-3">
            <h3 className="text-xl font-black text-white drop-shadow-lg leading-tight">{player.name}</h3>
            <p className="text-[11px] font-bold text-white/80">#{player.numero || '-'}</p>
          </div>
        </div>
        <div className="bg-white p-4">
          <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 mb-3 pb-3 border-b border-stone-100">
            {attrs.map(a => (
              <div key={a.key} className="flex items-center justify-between">
                <span className="text-xs text-stone-500">{a.label}</span>
                <span className="text-sm font-black text-stone-800">{player.attrs?.[a.key] ?? 50}</span>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-3 gap-2 text-center mb-2">
            <MiniStat label="Pontos" value={pts} highlight />
            <MiniStat label="Jogos" value={jogos} />
            <MiniStat label="MVP" value={mvpCount} />
          </div>
          <div className="grid grid-cols-2 gap-2 text-center">
            {isGk ? (
              <>
                <MiniStat label="Defesas" value={defesas} />
                <MiniStat label="Pênaltis def." value={penaltis} />
              </>
            ) : (
              <>
                <MiniStat label="Gols" value={gols} />
                <MiniStat label="Assist." value={assist} />
              </>
            )}
          </div>
        </div>
        <button onClick={onClose} className="w-full bg-stone-100 text-stone-500 font-bold text-sm py-2.5 transition-colors active:bg-stone-200">Fechar</button>
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
    <div className="fixed inset-0 bg-black/60 flex items-end sm:items-center justify-center z-40 animate-fadein" onClick={onClose}>
      <div className="bg-white w-full sm:max-w-sm sm:rounded-3xl rounded-t-3xl max-h-[92vh] overflow-y-auto animate-slideup sm:animate-popin" onClick={(e) => e.stopPropagation()}>
        <div className={`bg-gradient-to-br ${tier.grad} p-4`}>
          <div className="flex items-center gap-3 mb-2">
            <label className="relative cursor-pointer">
              <Avatar player={form} size="lg" />
              <span className="absolute -bottom-1 -right-1 w-5 h-5 bg-stone-900 rounded-full flex items-center justify-center">
                <Camera className="w-3 h-3 text-white" />
              </span>
              <input type="file" accept="image/*" className="hidden" onChange={(e) => handlePhoto(e.target.files[0])} />
            </label>
            <div>
              <p className={`text-2xl font-black leading-none ${tier.text}`}>{overall}</p>
              <p className={`text-[10px] font-bold uppercase ${tier.accent}`}>Overall</p>
            </div>
          </div>
          <input value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))} className={`bg-transparent text-lg font-black outline-none w-full ${tier.text}`} />
        </div>
        <div className="p-4 space-y-3">
          <div className="flex gap-2">
            <button onClick={() => setForm(f => ({ ...f, position: 'linha', attrs: defaultAttrs('linha') }))} className={`flex-1 py-2 rounded-lg text-xs font-bold border transition-colors ${form.position === 'linha' ? 'bg-emerald-700 text-white border-emerald-700' : 'bg-white text-stone-500 border-stone-200'}`}>Linha</button>
            <button onClick={() => setForm(f => ({ ...f, position: 'goleiro', attrs: defaultAttrs('goleiro') }))} className={`flex-1 py-2 rounded-lg text-xs font-bold border transition-colors ${form.position === 'goleiro' ? 'bg-sky-700 text-white border-sky-700' : 'bg-white text-stone-500 border-stone-200'}`}>Goleiro</button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] font-bold text-stone-400 uppercase">Número</label>
              <input type="number" value={form.numero} onChange={(e) => setForm(f => ({ ...f, numero: e.target.value }))} className="w-full bg-stone-50 border border-stone-200 rounded-lg px-2 py-1.5 text-sm" />
            </div>
            <div>
              <label className="text-[10px] font-bold text-stone-400 uppercase">PIN de acesso</label>
              <div className="flex items-center gap-1 bg-stone-50 border border-stone-200 rounded-lg px-2 py-1.5">
                <KeyRound className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                <span className="text-sm font-bold flex-1">{form.pin || '----'}</span>
                <button onClick={() => setForm(f => ({ ...f, pin: genPin() }))} className="text-[10px] font-bold text-emerald-700 shrink-0">gerar</button>
              </div>
            </div>
          </div>
          <div className="space-y-2">
            <p className="text-xs font-bold text-stone-500 uppercase">Atributos (só o organizador vê e edita aqui)</p>
            {attrs.map(a => (
              <div key={a.key} className="flex items-center gap-2">
                <span className="text-xs text-stone-500 w-24 shrink-0">{a.label}</span>
                <input type="range" min="0" max="99" value={form.attrs[a.key]} onChange={(e) => setForm(f => ({ ...f, attrs: { ...f.attrs, [a.key]: Number(e.target.value) } }))} className="flex-1 accent-emerald-700" />
                <span className="text-xs font-black text-stone-700 w-6 text-right">{form.attrs[a.key]}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="p-4 pt-0 flex gap-2">
          <button onClick={() => { if (confirm('Excluir jogador?')) { onDelete(player.id); onClose(); } }} className="px-4 py-2.5 rounded-xl bg-rose-50 text-rose-600 transition-transform active:scale-95"><Trash2 className="w-4 h-4" /></button>
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl bg-stone-100 text-stone-500 font-bold text-sm transition-transform active:scale-95">Cancelar</button>
          <button onClick={() => { onSave(form); onClose(); }} className="flex-1 py-2.5 rounded-xl bg-emerald-700 text-white font-bold text-sm transition-transform active:scale-95">Salvar</button>
        </div>
      </div>
    </div>
  );
}

function JogosList({ games, players, onCreate, onSelect }) {
  return (
    <div className="p-4">
      <button onClick={onCreate} className="w-full mb-4 bg-emerald-700 hover:bg-emerald-800 text-white font-bold py-3 rounded-2xl flex items-center justify-center gap-2 shadow-sm transition-transform active:scale-[0.98]">
        <Plus className="w-5 h-5" /> Marcar novo jogo
      </button>
      {games.length === 0 && <EmptyState icon={Calendar} text="Nenhum jogo marcado ainda" sub="Toque no botão acima pra criar a primeira pelada." />}
      <div className="space-y-3">
        {games.map(g => {
          const confirmados = players.filter(p => g.rsvp[p.id] === 'sim').length;
          const pagos = players.filter(p => g.payments[p.id]).length;
          return (
            <button key={g.id} onClick={() => onSelect(g.id)} className="w-full text-left bg-white rounded-2xl border border-stone-200 p-4 shadow-sm transition-transform active:scale-[0.98]">
              <div className="flex items-center justify-between mb-2">
                <span className="text-emerald-800 font-black text-sm uppercase tracking-wide">{fmtDate(g.date)} {g.horario ? `· ${g.horario}` : ''}</span>
                <ChevronLeft className="w-4 h-4 text-stone-300 rotate-180" />
              </div>
              <div className="flex gap-4 text-xs text-stone-500 font-medium">
                <span className="flex items-center gap-1"><Check className="w-3.5 h-3.5 text-emerald-600" /> {confirmados} confirmados</span>
                <span className="flex items-center gap-1"><DollarSign className="w-3.5 h-3.5 text-amber-600" /> {pagos} pagos</span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function ViewerJogos({ games, players }) {
  const [openId, setOpenId] = useState(null);
  return (
    <div className="p-4 space-y-3">
      {games.length === 0 && <EmptyState icon={Calendar} text="Nenhuma pelada marcada ainda" sub="Quando o organizador criar um jogo, ele aparece aqui." />}
      {games.map(g => {
        const confirmados = players.filter(p => g.rsvp[p.id] === 'sim');
        const open = openId === g.id;
        return (
          <div key={g.id} className="bg-white rounded-2xl border border-stone-200 overflow-hidden">
            <button onClick={() => setOpenId(open ? null : g.id)} className="w-full text-left p-4 transition-colors active:bg-stone-50">
              <p className="text-emerald-800 font-black text-sm uppercase tracking-wide">{fmtDate(g.date)} {g.horario ? `· ${g.horario}` : ''}</p>
              {g.local && <p className="text-xs text-stone-400 mt-0.5">📍 {g.local}</p>}
            </button>
            {open && (
              <div className="px-4 pb-4 space-y-1.5 border-t border-stone-100 pt-3 animate-fadein">
                {confirmados.length === 0 && <p className="text-xs text-stone-400">Ninguém confirmado ainda.</p>}
                {confirmados.map(p => (
                  <div key={p.id} className="flex items-center gap-2">
                    <Avatar player={p} size="sm" />
                    <span className="flex-1 text-xs font-semibold text-stone-600 truncate">{p.name}</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${g.payments[p.id] ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>{g.payments[p.id] ? 'Pago' : 'Pendente'}</span>
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

function GameDetail({ game, players, subTab, setSubTab, onBack, onRSVP, onPay, onStat, onDelete, onUpdate, onSorteio, send }) {
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
        <button onClick={onBack} className="flex items-center gap-1 text-emerald-800 font-bold text-sm"><ChevronLeft className="w-4 h-4" /> Jogos</button>
        <button onClick={() => { if (confirm('Excluir este jogo?')) onDelete(game.id); }} className="text-stone-400"><Trash2 className="w-4 h-4" /></button>
      </div>
      <div className="px-4 pb-3">
        <div className="flex gap-2 mb-1">
          <input type="date" value={game.date} onChange={(e) => onUpdate({ date: e.target.value })} className="text-sm font-bold text-stone-700 bg-white border border-stone-200 rounded-lg px-2 py-1" />
          <input type="time" value={game.horario} onChange={(e) => onUpdate({ horario: e.target.value })} className="text-sm font-bold text-stone-700 bg-white border border-stone-200 rounded-lg px-2 py-1" />
        </div>
        <input value={game.local} onChange={(e) => onUpdate({ local: e.target.value })} placeholder="Local do jogo" className="text-xs text-stone-500 bg-white border border-stone-200 rounded-lg px-2 py-1 mt-1 w-full" />
      </div>

      <div className="flex gap-1.5 px-4 mb-3 overflow-x-auto">
        {[
          { id: 'presenca', label: 'Presença', icon: Check },
          { id: 'times', label: 'Times', icon: Swords },
          { id: 'caixa', label: 'Caixa', icon: DollarSign },
          { id: 'sumula', label: 'Súmula', icon: Award },
        ].map(t => (
          <button key={t.id} onClick={() => setSubTab(t.id)} className={`flex items-center justify-center gap-1 px-3 py-2 rounded-xl text-xs font-bold border shrink-0 transition-colors ${subTab === t.id ? 'bg-emerald-700 text-white border-emerald-700' : 'bg-white text-stone-500 border-stone-200'}`}>
            <t.icon className="w-3.5 h-3.5" /> {t.label}
          </button>
        ))}
      </div>

      <div className="px-4">
        {subTab === 'presenca' && (
          <div className="animate-fadein">
            <div className="flex gap-2 mb-3">
              <button onClick={msgConvite} className="flex-1 flex items-center justify-center gap-1.5 bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold py-2 rounded-xl text-xs transition-transform active:scale-95"><MessageCircle className="w-3.5 h-3.5" /> Convite</button>
              <button onClick={msgLembrete} className="flex-1 flex items-center justify-center gap-1.5 bg-amber-50 text-amber-800 border border-amber-200 font-bold py-2 rounded-xl text-xs transition-transform active:scale-95"><Clock className="w-3.5 h-3.5" /> Lembrete</button>
            </div>
            <div className="space-y-2">
              {players.map(p => {
                const status = game.rsvp[p.id];
                return (
                  <div key={p.id} className="flex items-center gap-3 bg-white rounded-xl border border-stone-200 p-2.5">
                    <Avatar player={p} size="sm" />
                    <span className="flex-1 text-sm font-semibold text-stone-700 truncate">{p.name}</span>
                    <button onClick={() => onRSVP(game.id, p.id, 'sim')} className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${status === 'sim' ? 'bg-emerald-600 text-white' : 'bg-stone-100 text-stone-400'}`}><Check className="w-4 h-4" /></button>
                    <button onClick={() => onRSVP(game.id, p.id, 'nao')} className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${status === 'nao' ? 'bg-rose-600 text-white' : 'bg-stone-100 text-stone-400'}`}><X className="w-4 h-4" /></button>
                  </div>
                );
              })}
              {players.length === 0 && <EmptyPlayers />}
            </div>
          </div>
        )}

        {subTab === 'times' && (
          <div className="animate-fadein">
            <button onClick={onSorteio} className="w-full mb-3 flex items-center justify-center gap-2 bg-stone-800 text-white font-bold py-2.5 rounded-xl text-sm transition-transform active:scale-[0.98]"><Shuffle className="w-4 h-4" /> Sortear 3 times (5 linha + 1 gol)</button>
            {confirmados.length > 0 && confirmados.length < 18 && (
              <p className="text-[11px] text-stone-400 mb-3 text-center">Ideal: 15 de linha + 3 goleiros confirmados. Com o que tiver, o sorteio remaneja.</p>
            )}
            {!game.teams ? (
              <p className="text-center text-sm text-stone-400 py-10">Confirme presenças e sorteie os times.</p>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                <TeamCol title="Time A" ids={game.teams.A} players={players} colorIdx={0} />
                <TeamCol title="Time B" ids={game.teams.B} players={players} colorIdx={1} />
                <TeamCol title="Time C" ids={game.teams.C} players={players} colorIdx={2} />
              </div>
            )}
          </div>
        )}

        {subTab === 'caixa' && (
          <div className="animate-fadein">
            <div className="flex items-center gap-2 bg-white rounded-xl border border-stone-200 p-2.5 mb-3">
              <span className="text-xs font-bold text-stone-500 uppercase">Valor por pessoa</span>
              <input value={game.valor} onChange={(e) => onUpdate({ valor: e.target.value })} placeholder="R$" className="flex-1 text-right text-sm font-bold text-stone-700 outline-none" />
            </div>
            <button onClick={msgCobranca} className="w-full mb-3 flex items-center justify-center gap-2 bg-amber-50 text-amber-800 border border-amber-200 font-bold py-2.5 rounded-xl text-sm transition-transform active:scale-[0.98]"><MessageCircle className="w-4 h-4" /> Cobrar pendentes no WhatsApp</button>
            <div className="space-y-2">
              {players.map(p => {
                const paid = !!game.payments[p.id];
                return (
                  <div key={p.id} className="flex items-center gap-3 bg-white rounded-xl border border-stone-200 p-2.5">
                    <Avatar player={p} size="sm" />
                    <span className="flex-1 text-sm font-semibold text-stone-700 truncate">{p.name}</span>
                    <button onClick={() => onPay(game.id, p.id)} className={`px-3 py-1.5 rounded-full text-xs font-bold transition-colors ${paid ? 'bg-emerald-600 text-white' : 'bg-amber-100 text-amber-700'}`}>{paid ? 'Pago' : 'Pendente'}</button>
                  </div>
                );
              })}
              {players.length === 0 && <EmptyPlayers />}
            </div>
          </div>
        )}

        {subTab === 'sumula' && (
          <div className="space-y-3 animate-fadein">
            {confirmados.length > 0 && (
              <div className="bg-white rounded-xl border border-stone-200 p-3 flex items-center gap-2">
                <Star className="w-4 h-4 text-amber-500 shrink-0" />
                <span className="text-xs font-bold text-stone-500 shrink-0">MVP</span>
                <select value={game.mvp || ''} onChange={(e) => onUpdate({ mvp: e.target.value || null })} className="flex-1 text-sm font-bold text-stone-700 bg-stone-50 rounded-lg px-2 py-1.5 outline-none">
                  <option value="">Selecionar craque do jogo</option>
                  {confirmados.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
            )}
            <button onClick={msgSumula} className="w-full flex items-center justify-center gap-2 bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold py-2.5 rounded-xl text-sm transition-transform active:scale-[0.98]"><MessageCircle className="w-4 h-4" /> Mandar súmula no WhatsApp</button>
            {players.map(p => {
              const s = game.stats[p.id] || {};
              const isGk = p.position === 'goleiro';
              return (
                <div key={p.id} className="bg-white rounded-xl border border-stone-200 p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <Avatar player={p} size="sm" />
                    <span className="text-sm font-bold text-stone-700 flex-1 truncate">{p.name}</span>
                    {isGk && <Shield className="w-4 h-4 text-sky-600" />}
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
            {players.length === 0 && <EmptyPlayers />}
          </div>
        )}
      </div>
    </div>
  );
}

function TeamCol({ title, ids, players, colorIdx }) {
  const list = ids.map(id => players.find(p => p.id === id)).filter(Boolean);
  const palette = ['bg-emerald-50 border-emerald-200 text-emerald-800', 'bg-sky-50 border-sky-200 text-sky-800', 'bg-amber-50 border-amber-200 text-amber-800'];
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
    <div className="flex items-center gap-1 bg-stone-50 rounded-lg border border-stone-100 px-1.5 py-1.5">
      <Icon className="w-3 h-3 text-stone-400 shrink-0" />
      <span className="text-[10px] text-stone-500 font-medium shrink-0 truncate">{label}</span>
      <input type="number" min="0" value={value ?? ''} onChange={(e) => onChange(e.target.value)} className="w-full text-right text-sm font-bold text-stone-700 bg-transparent outline-none" placeholder="0" />
    </div>
  );
}

function EmptyPlayers() {
  return <EmptyState icon={Users} text="Cadastre jogadores na aba Elenco primeiro" />;
}

function ElencoTab({ players, onAdd, onOpenEdit }) {
  const [name, setName] = useState('');
  const [position, setPosition] = useState('linha');

  const handleAdd = () => {
    if (!name.trim()) return;
    const dup = players.find(p => p.name.trim().toLowerCase() === name.trim().toLowerCase());
    if (dup) {
      if (!confirm(`Já existe um jogador chamado "${dup.name}" no elenco. Cadastrar outro com o mesmo nome mesmo assim? (isso separa a pontuação em dois registros)`)) return;
    }
    onAdd(name, position);
    setName('');
  };

  return (
    <div className="p-4">
      <div className="bg-white rounded-2xl border border-stone-200 p-3 mb-4 shadow-sm">
        <p className="text-xs font-bold text-stone-500 uppercase mb-2">Adicionar jogador</p>
        <input value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
          placeholder="Nome do jogador" className="w-full bg-stone-50 border border-stone-200 rounded-lg px-3 py-2 text-sm mb-2 outline-none focus:border-emerald-500 transition-colors" />
        <div className="flex gap-2">
          <button onClick={() => setPosition('linha')} className={`flex-1 py-2 rounded-lg text-xs font-bold border transition-colors ${position === 'linha' ? 'bg-emerald-700 text-white border-emerald-700' : 'bg-white text-stone-500 border-stone-200'}`}>Linha</button>
          <button onClick={() => setPosition('goleiro')} className={`flex-1 py-2 rounded-lg text-xs font-bold border transition-colors ${position === 'goleiro' ? 'bg-sky-700 text-white border-sky-700' : 'bg-white text-stone-500 border-stone-200'}`}>Goleiro</button>
          <button onClick={handleAdd} className="px-4 bg-stone-800 text-white rounded-lg transition-transform active:scale-95"><Plus className="w-4 h-4" /></button>
        </div>
      </div>
      <div className="space-y-2">
        {players.map(p => {
          const overall = overallOf(p);
          return (
            <button key={p.id} onClick={() => onOpenEdit(p)} className="w-full flex items-center gap-3 bg-white rounded-xl border border-stone-200 p-2.5 text-left transition-transform active:scale-[0.98]">
              <Avatar player={p} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-stone-700 truncate">{p.name}</p>
                <p className="text-[11px] text-stone-400 flex items-center gap-1">
                  {p.position === 'goleiro' ? <Shield className="w-3 h-3" /> : <Footprints className="w-3 h-3" />}
                  {p.position === 'goleiro' ? 'Goleiro' : 'Linha'} · #{p.numero} · OVR {overall}
                </p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-[10px] text-stone-400 font-bold">PIN</p>
                <p className="text-xs font-black text-stone-600">{p.pin || '----'}</p>
              </div>
            </button>
          );
        })}
        {players.length === 0 && <EmptyState icon={Users} text="Nenhum jogador cadastrado ainda" sub="Adicione o primeiro jogador aí em cima." />}
      </div>
    </div>
  );
}

function ChipBtn({ active, onClick, icon: Icon, label }) {
  return (
    <button onClick={onClick} className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold border transition-colors ${active ? 'bg-emerald-700 text-white border-emerald-700' : 'bg-white text-stone-500 border-stone-200'}`}>
      <Icon className="w-3.5 h-3.5" /> {label}
    </button>
  );
}

function RankingList({ list, valueKey, unit, onOpenCard, myId, showCrown }) {
  if (list.length === 0) return <p className="text-xs text-stone-400 text-center py-4">Sem dados ainda.</p>;
  return (
    <div className="bg-white rounded-2xl border border-stone-200 divide-y divide-stone-100 overflow-hidden animate-fadein">
      {list.map((r, i) => {
        const isTop = showCrown && i === 0;
        return (
          <button key={r.player.id} onClick={() => onOpenCard(r.player)} className={`w-full flex items-center gap-3 p-2.5 transition-colors active:bg-stone-50 ${isTop ? 'bg-gradient-to-r from-amber-50 via-amber-50/40 to-transparent' : ''}`}>
            <span className="w-6 text-center shrink-0">
              {isTop ? <Crown className="w-4 h-4 text-amber-500 mx-auto" /> : <span className="text-xs font-black text-stone-300">{i + 1}</span>}
            </span>
            <Avatar player={r.player} size={isTop ? 'md' : 'sm'} highlight={isTop} />
            <span className={`flex-1 text-sm truncate text-left ${isTop ? 'font-black text-amber-900' : 'font-semibold text-stone-700'}`}>
              {r.player.name}{myId === r.player.id && <span className="ml-1 text-[10px] text-emerald-600 font-bold">(você)</span>}
            </span>
            <span className={`text-sm font-black ${isTop ? 'text-amber-600' : 'text-emerald-700'}`}>{r[valueKey]} <span className="text-[10px] font-medium text-stone-400">{unit}</span></span>
          </button>
        );
      })}
    </div>
  );
}

function RankingTab({ ranking, onOpenCard, myId }) {
  const [linhaCat, setLinhaCat] = useState('artilheiros');
  const [golCat, setGolCat] = useState('defesas');

  const geral = React.useMemo(() => [...ranking].sort((a, b) => b.pts - a.pts), [ranking]);

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
      <div>
        <div className="flex items-center gap-1.5 mb-2">
          <Trophy className="w-4 h-4 text-amber-500" />
          <h3 className="font-black text-stone-700 text-sm uppercase tracking-wide">Geral</h3>
        </div>
        <RankingList list={geral} valueKey="pts" unit="pts" onOpenCard={onOpenCard} myId={myId} showCrown />
        <p className="text-[10px] text-stone-400 mt-2 leading-relaxed px-1">
          Pontuação: gol +{POINTS.gol} · assistência +{POINTS.assist} · defesa +{POINTS.defesa} · gol sofrido {POINTS.sofrido} · pênalti defendido +{POINTS.penalti} · MVP +{POINTS.mvp}
        </p>
      </div>

      <div>
        <div className="flex items-center gap-1.5 mb-2">
          <Footprints className="w-4 h-4 text-emerald-600" />
          <h3 className="font-black text-stone-700 text-sm uppercase tracking-wide">Jogadores de linha</h3>
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
          <h3 className="font-black text-stone-700 text-sm uppercase tracking-wide">Goleiros</h3>
        </div>
        <div className="flex gap-1.5 mb-2">
          <ChipBtn active={golCat === 'defesas'} onClick={() => setGolCat('defesas')} icon={Shield} label="Defesas" />
          <ChipBtn active={golCat === 'vazadas'} onClick={() => setGolCat('vazadas')} icon={TrendingDown} label="Vazadas" />
        </div>
        <RankingList list={golList} valueKey={golCat === 'defesas' ? 'defesas' : 'sofridos'} unit={golCat === 'defesas' ? 'defesas' : 'sofridos'} onOpenCard={onOpenCard} myId={myId} />
      </div>
    </div>
  );
}
