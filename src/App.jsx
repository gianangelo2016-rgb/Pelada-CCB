import React, { useState, useEffect } from 'react';
import { Users, Calendar, Trophy, Check, X, DollarSign, Plus, Trash2, Shield, Target, MessageCircle, ChevronLeft, Loader2, Footprints, Award, Clock, Lock, Unlock, Camera, Shuffle, Star, Crown, KeyRound, Swords, TrendingDown, Medal, Flame, Share2, ArrowUp, ArrowDown, Sparkles, CheckCircle2, Zap, Send, Rocket, Eye, Dumbbell, MapPin, Wind, Crosshair, Search, User, ChevronRight, Wallet, ShoppingCart } from 'lucide-react';
import { cloudGet, cloudSet, localGet, localSet } from './firebase';

const uid = () => Math.random().toString(36).slice(2, 10);
const genPin = () => String(Math.floor(1000 + Math.random() * 9000));

const PREMIUM = {
  black: '#050608',
  blackBlue: '#080D16',
  gold: '#F5C542',
  goldDark: '#9C6B08',
  white: '#F5F5F5',
  purple: '#5146E5',
  green: '#21D39B',
  navy: '#07152A',
};

/* ---- v6 chamfered-panel design system (aprovado pelo usuário) ---- */
const PV6 = {
  gold: '#f5d576', goldDark: '#8a6a1f', goldGlow: 'rgba(212,175,55,0.55)',
  green: '#3ee89b', greenDark: '#0f5132', greenGlow: 'rgba(16,185,129,0.55)',
  blue: '#7dd3fc', blueDark: '#0c4a6e', blueGlow: 'rgba(56,189,248,0.55)',
};
const cutPoly = (n) => `polygon(${n}px 0, calc(100% - ${n}px) 0, 100% ${n}px, 100% calc(100% - ${n}px), calc(100% - ${n}px) 100%, ${n}px 100%, 0 calc(100% - ${n}px), 0 ${n}px)`;

function Panel({ color = 'gold', cutSize = 16, className = '', style = {}, innerStyle = {}, children }) {
  const c = PV6[color], cd = PV6[color + 'Dark'], glow = PV6[color + 'Glow'];
  return (
    <div className={className} style={{ position: 'relative', clipPath: cutPoly(cutSize + 2), background: `linear-gradient(135deg, ${c}, ${cd}, ${c}, ${cd})`, padding: 2, boxShadow: `0 0 0 1px ${glow}, 0 4px 18px -4px ${glow}`, ...style }}>
      <div style={{ clipPath: cutPoly(cutSize), background: 'linear-gradient(160deg, rgba(18,21,27,0.9), rgba(11,14,19,0.94), rgba(16,19,26,0.9))', position: 'relative', overflow: 'hidden', height: '100%', ...innerStyle }}>
        {children}
      </div>
    </div>
  );
}


const fmtDate = (iso) => {
  const d = new Date(iso + 'T12:00:00');
  return d.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' });
};

const AVATAR_COLORS = ['bg-emerald-600', 'bg-amber-600', 'bg-sky-700', 'bg-rose-600', 'bg-violet-600', 'bg-teal-600', 'bg-orange-600', 'bg-indigo-600'];
const colorFor = (id) => AVATAR_COLORS[[...id].reduce((a, c) => a + c.charCodeAt(0), 0) % AVATAR_COLORS.length];

const POINTS = { gol: 2, assist: 1, defesa: 2, sofrido: -1, penalti: 3, mvp: 3 };

const LINHA_ATTRS = [
  { key: 'finalizacao', label: 'Finalização', Icon: Target },
  { key: 'marcacao', label: 'Marcação', Icon: Shield },
  { key: 'velocidade', label: 'Velocidade', Icon: Zap },
  { key: 'drible', label: 'Drible', Icon: Footprints },
  { key: 'passe', label: 'Passe', Icon: Send },
  { key: 'fisico', label: 'Físico', Icon: Dumbbell },
  { key: 'cabeceio', label: 'Cabeceio', Icon: ArrowUp },
  { key: 'chuteLonge', label: 'Chute de longe', Icon: Rocket },
  { key: 'visaoDeJogo', label: 'Visão de jogo', Icon: Eye },
];
const GOLEIRO_ATTRS = [
  { key: 'reflexo', label: 'Reflexo', Icon: Zap },
  { key: 'posicionamento', label: 'Posicionamento', Icon: MapPin },
  { key: 'defesa', label: 'Defesa', Icon: Shield },
  { key: 'agilidade', label: 'Agilidade', Icon: Wind },
  { key: 'impulsao', label: 'Impulsão', Icon: ArrowUp },
  { key: 'saidaDeGol', label: 'Saída de gol', Icon: Crosshair },
  { key: 'reposicao', label: 'Reposição', Icon: Send },
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

function resolveBolao(game, players) {
  if (!game.mvp) return null;
  const stats = game.stats || {};
  let maxGols = 0, artilheiros = [];
  Object.entries(stats).forEach(([pid, s]) => {
    const g = Number(s.gols) || 0;
    if (g > maxGols) { maxGols = g; artilheiros = [pid]; }
    else if (g === maxGols && g > 0) artilheiros.push(pid);
  });
  const goleirosConfirmados = players.filter(p => p.position === 'goleiro' && game.rsvp[p.id] === 'sim');
  let frango = null;
  if (goleirosConfirmados.length > 1) {
    let maxSofridos = 0, frangueiros = [];
    goleirosConfirmados.forEach(gk => {
      const sof = Number(stats[gk.id]?.sofridos) || 0;
      if (sof > maxSofridos) { maxSofridos = sof; frangueiros = [gk.id]; }
      else if (sof === maxSofridos && sof > 0) frangueiros.push(gk.id);
    });
    frango = maxSofridos > 0 ? frangueiros : [];
  }
  return { artilheiros, mvp: game.mvp, frango };
}

const APOSTA_CUSTO = { artilheiro: 2, mvp: 2, frango: 1 };

function bolaoPoolResult(game, players) {
  // retorna { categorias: { artilheiro: {pool, vencedores, share}, mvp: {...}, frango: {...} }, ganhosPorJogador: {id: valor} }
  const res = resolveBolao(game, players);
  const ganhosPorJogador = {};
  const categorias = {};
  if (!res) return { categorias, ganhosPorJogador };
  const defs = [
    { key: 'artilheiro', cost: APOSTA_CUSTO.artilheiro, acertou: (pal) => pal.artilheiro && res.artilheiros.includes(pal.artilheiro) },
    { key: 'mvp', cost: APOSTA_CUSTO.mvp, acertou: (pal) => pal.mvp && pal.mvp === res.mvp },
    { key: 'frango', cost: APOSTA_CUSTO.frango, acertou: (pal) => res.frango && pal.frango && res.frango.includes(pal.frango) },
  ];
  defs.forEach(({ key, cost, acertou }) => {
    const apostadores = Object.entries(game.palpites || {}).filter(([, pal]) => pal[key]);
    if (apostadores.length === 0) { categorias[key] = { pool: 0, vencedores: [], share: 0 }; return; }
    const pool = apostadores.length * cost;
    const vencedores = apostadores.filter(([, pal]) => acertou(pal)).map(([pid]) => pid);
    const share = vencedores.length > 0 ? Math.floor(pool / vencedores.length) : 0;
    categorias[key] = { pool, vencedores, share };
    vencedores.forEach(pid => { ganhosPorJogador[pid] = (ganhosPorJogador[pid] || 0) + share; });
  });
  return { categorias, ganhosPorJogador };
}

function totalApostado(player, games) {
  let total = 0;
  games.forEach(g => {
    const p = g.palpites?.[player.id];
    if (!p) return;
    if (p.artilheiro) total += APOSTA_CUSTO.artilheiro;
    if (p.mvp) total += APOSTA_CUSTO.mvp;
    if (p.frango) total += APOSTA_CUSTO.frango;
  });
  return total;
}

const MOEDAS = { presenca: 3, gol: 2, assist: 1, mvp: 5 };

function moedasParticipacao(player, games) {
  let moedas = 0;
  games.forEach(g => {
    if (g.rsvp[player.id] === 'sim') moedas += MOEDAS.presenca;
    const s = g.stats?.[player.id];
    if (s) {
      moedas += (Number(s.gols) || 0) * MOEDAS.gol;
      moedas += (Number(s.assist) || 0) * MOEDAS.assist;
    }
    if (g.mvp === player.id) moedas += MOEDAS.mvp;
  });
  return moedas;
}

function moedasAtuais(player, players, games) {
  let ganhosApostas = 0;
  games.forEach(g => {
    const { ganhosPorJogador } = bolaoPoolResult(g, players);
    ganhosApostas += ganhosPorJogador[player.id] || 0;
  });
  return moedasParticipacao(player, games) - totalApostado(player, games) + ganhosApostas;
}

function generateZoeiras(game, players) {
  const lines = [];
  const stats = game.stats || {};
  if (Object.keys(stats).length === 0) return lines;
  const confirmados = players.filter(p => game.rsvp[p.id] === 'sim');
  const nome = (id) => players.find(p => p.id === id)?.name;

  if (game.mvp) {
    const mvpNome = nome(game.mvp);
    if (mvpNome) lines.push(`👑 ${mvpNome} foi o rei do jogo hoje!`);
  }

  let maxGols = 0, artilheiro = null;
  Object.entries(stats).forEach(([pid, s]) => {
    const g = Number(s.gols) || 0;
    if (g > maxGols) { maxGols = g; artilheiro = pid; }
  });
  if (artilheiro && maxGols >= 3) lines.push(`🎩 ${nome(artilheiro)} fez hat-trick! ${maxGols} gols na conta`);
  else if (artilheiro && maxGols === 2) lines.push(`🔥 ${nome(artilheiro)} balançou a rede 2 vezes`);

  confirmados.filter(p => p.position === 'goleiro').forEach(gk => {
    const s = stats[gk.id];
    if (!s) return;
    const sof = Number(s.sofridos) || 0;
    if (sof >= 4) lines.push(`🐔 ${gk.name} levou frango hoje (${sof} gols sofridos)`);
    else if (sof === 0) lines.push(`🧤 ${gk.name} não tomou nem um gol! Parede.`);
  });

  const penaltiDef = Object.entries(stats).find(([, s]) => (Number(s.penaltis) || 0) > 0);
  if (penaltiDef) lines.push(`🚫 ${nome(penaltiDef[0])} pegou pênalti, seguro na hora H!`);

  return lines;
}

function ZoeiraCard({ lines }) {
  if (lines.length === 0) return null;
  return (
    <div className="bg-gradient-to-br from-purple-500/10 to-transparent border border-purple-500/20 rounded-2xl p-3.5">
      <p className="text-[10px] font-black text-purple-300/80 uppercase mb-2 flex items-center gap-1.5">😂 Resumo zoeiro do jogo</p>
      <div className="space-y-1.5">
        {lines.map((l, i) => <p key={i} className="text-xs text-zinc-200">{l}</p>)}
      </div>
    </div>
  );
}

function VotingCard({ title, emoji, options, votes, myId, onVote, players }) {
  const myVote = votes?.[myId];
  const [choice, setChoice] = useState('');
  const counts = {};
  Object.values(votes || {}).forEach(vid => { counts[vid] = (counts[vid] || 0) + 1; });
  const ranked = Object.entries(counts).sort((a, b) => b[1] - a[1]);

  if (!myId || options.length === 0) return null;
  return (
    <Panel color="gold" cutSize={14} innerStyle={{ padding: 14 }}>
      <p className="text-xs font-black uppercase mb-2 flex items-center gap-1.5" style={{ color: PV6.gold }}>{emoji} {title}</p>
      {myVote ? (
        <div>
          <p className="text-xs text-zinc-400 mb-2">Você votou em <span className="font-bold text-zinc-100">{players.find(p => p.id === myVote)?.name}</span></p>
          {ranked.length > 0 && (
            <div className="space-y-2">
              {ranked.map(([pid, count]) => {
                const voters = Object.entries(votes || {}).filter(([, v]) => v === pid).map(([voterId]) => players.find(p => p.id === voterId)?.name).filter(Boolean);
                return (
                  <div key={pid}>
                    <div className="flex items-center gap-2 text-xs">
                      <span className="flex-1 text-zinc-300 truncate font-semibold">{players.find(p => p.id === pid)?.name}</span>
                      <span className="font-bold" style={{ color: PV6.gold }}>{count} voto{count > 1 ? 's' : ''}</span>
                    </div>
                    {voters.length > 0 && <p className="text-[10px] text-zinc-500 mt-0.5">Votos de: {voters.join(', ')}</p>}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        <div className="flex gap-2">
          <select value={choice} onChange={(e) => setChoice(e.target.value)} className="flex-1 bg-transparent px-2 py-2 text-xs text-zinc-100 outline-none" style={{ border: '1.5px solid rgba(255,255,255,0.14)', borderRadius: 4 }}>
            <option value="" className="bg-zinc-900">Escolher jogador</option>
            {options.map(p => <option key={p.id} value={p.id} className="bg-zinc-900">{p.name}</option>)}
          </select>
          <button onClick={() => choice && onVote(choice)} className="px-3.5 text-xs font-black shrink-0" style={{ borderRadius: 4, background: `linear-gradient(135deg, ${PV6.gold}, ${PV6.goldDark})`, color: '#050608' }}>Votar</button>
        </div>
      )}
    </Panel>
  );
}

function GameVotingSection({ game, players, myId, onVoteMvp, onVoteGoleiro, onVoteEnquete }) {
  const confirmados = players.filter(p => game.rsvp[p.id] === 'sim');
  const goleiros = confirmados.filter(p => p.position === 'goleiro');
  return (
    <div className="space-y-2.5">
      <VotingCard title="MVP da pelada" emoji="👑" options={confirmados} votes={game.votosMvp} myId={myId} onVote={(id) => onVoteMvp(game.id, myId, id)} players={players} />
      {goleiros.length > 0 && (
        <VotingCard title="Melhor goleiro" emoji="🧤" options={goleiros} votes={game.votosGoleiro} myId={myId} onVote={(id) => onVoteGoleiro(game.id, myId, id)} players={players} />
      )}
      <VotingCard title="Bola murcha do dia" emoji="🥔" options={confirmados} votes={game.enquete} myId={myId} onVote={(id) => onVoteEnquete(game.id, myId, id)} players={players} />
    </div>
  );
}

function VotacaoResultCard({ game, players }) {
  if (!game.mvp) return null;
  const nome = (id) => players.find(p => p.id === id)?.name;
  const counts = {};
  Object.values(game.enquete || {}).forEach(v => { counts[v] = (counts[v] || 0) + 1; });
  let murchaWinner = null, max = 0;
  Object.entries(counts).forEach(([id, c]) => { if (c > max) { max = c; murchaWinner = id; } });
  return (
    <Panel color="gold" cutSize={14} innerStyle={{ padding: 14 }}>
      <p className="text-[10px] font-black uppercase mb-2" style={{ color: PV6.gold, opacity: 0.85 }}>🏆 Resultado da pelada de {fmtDate(game.date)}</p>
      <div className="space-y-1 text-xs text-zinc-300">
        <p>👑 MVP: <span className="font-bold text-zinc-100">{nome(game.mvp)}</span></p>
        {game.melhorGoleiroId && <p>🧤 Melhor goleiro: <span className="font-bold text-zinc-100">{nome(game.melhorGoleiroId)}</span></p>}
        {murchaWinner && <p>🥔 Bola murcha: <span className="font-bold text-zinc-100">{nome(murchaWinner)}</span></p>}
      </div>
    </Panel>
  );
}

function VotacaoTab({ games, players, myId, onVoteMvp, onVoteGoleiro, onVoteEnquete }) {
  const aberto = games.find(g => g.votacaoAberta && !g.mvp);
  const ultimoFechado = React.useMemo(() => {
    const fechados = games.filter(g => g.mvp);
    return [...fechados].sort((a, b) => b.date.localeCompare(a.date))[0] || null;
  }, [games]);

  return (
    <div className="p-4 space-y-5">
      <div>
        <p className="text-xs font-black text-zinc-400 uppercase mb-2 flex items-center gap-1.5"><Medal className="w-3.5 h-3.5" style={{ color: PV6.gold }} /> Votação da pelada</p>
        {!aberto ? (
          <EmptyState icon={Medal} text="Nenhuma votação aberta agora" sub="Assim que o organizador encerrar um jogo, a votação aparece aqui" />
        ) : !myId ? (
          <Panel color="gold" cutSize={14} innerStyle={{ padding: 16, textAlign: 'center' }}>
            <p className="text-sm text-zinc-400">Escolha sua identidade (no cadeado 🔒) pra votar.</p>
          </Panel>
        ) : (
          <div className="space-y-2.5">
            <p className="text-[11px] text-zinc-500">Pelada de {fmtDate(aberto.date)}</p>
            <GameVotingSection game={aberto} players={players} myId={myId} onVoteMvp={onVoteMvp} onVoteGoleiro={onVoteGoleiro} onVoteEnquete={onVoteEnquete} />
          </div>
        )}
      </div>
      {ultimoFechado && (
        <div>
          <p className="text-xs font-black text-zinc-400 uppercase mb-2">Última pelada encerrada</p>
          <VotacaoResultCard game={ultimoFechado} players={players} />
        </div>
      )}
    </div>
  );
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

function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(String(reader.result).split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

function shareCanvas(canvas, filename) {
  canvas.toBlob(async (blob) => {
    if (!blob) return;
    const cap = window.Capacitor;
    if (cap && cap.isNativePlatform && cap.isNativePlatform() && cap.Plugins && cap.Plugins.Filesystem && cap.Plugins.Share) {
      try {
        const base64 = await blobToBase64(blob);
        const written = await cap.Plugins.Filesystem.writeFile({ path: filename, data: base64, directory: 'CACHE' });
        await cap.Plugins.Share.share({ title: filename, url: written.uri });
        return;
      } catch (e) { console.error('share nativo falhou', e); }
    }
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

function roundRectPath(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

const PREMIUM_HEX = {
  black: '#050608', blackBlue: '#080D16', gold: '#F5C542', goldDark: '#9C6B08',
  white: '#F5F5F5', purple: '#5146E5', green: '#21D39B', navy: '#07152A',
};

const ATTR_EMOJI = {
  finalizacao: '🎯', marcacao: '🛡️', velocidade: '⚡', drible: '👟', passe: '➤',
  fisico: '💪', cabeceio: '⬆️', chuteLonge: '🚀', visaoDeJogo: '👁️',
  reflexo: '⚡', posicionamento: '📍', defesa: '🛡️', agilidade: '💨', impulsao: '⬆️',
  saidaDeGol: '✋', reposicao: '➤',
};
const ATTR_SHORT_LABEL = { chuteLonge: 'CHUTE LONGE', visaoDeJogo: 'VISÃO JOGO', posicionamento: 'POSIÇÃO', saidaDeGol: 'SAÍDA GOL' };

function drawPlayerCardCanvas(player, extra, done) {
  const W = 640, H = 1020;
  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d');
  const overall = overallOf(player);
  const tier = cardTier(overall);
  const P = PREMIUM_HEX;

  // fundo preto + atmosfera de estádio (glows radiais)
  ctx.fillStyle = P.black; ctx.fillRect(0, 0, W, H);
  const navyGlow = ctx.createRadialGradient(W * 0.18, 60, 20, W * 0.18, 60, 420);
  navyGlow.addColorStop(0, P.navy); navyGlow.addColorStop(1, 'rgba(7,21,42,0)');
  ctx.fillStyle = navyGlow; ctx.fillRect(0, 0, W, H);
  const navyGlow2 = ctx.createRadialGradient(W * 0.9, H * 0.95, 20, W * 0.9, H * 0.95, 420);
  navyGlow2.addColorStop(0, P.navy); navyGlow2.addColorStop(1, 'rgba(7,21,42,0)');
  ctx.fillStyle = navyGlow2; ctx.fillRect(0, 0, W, H);

  // brilhos de holofote nos cantos superiores
  const goldGlow = ctx.createRadialGradient(70, 20, 10, 70, 20, 220);
  goldGlow.addColorStop(0, 'rgba(245,197,66,0.30)'); goldGlow.addColorStop(1, 'rgba(245,197,66,0)');
  ctx.fillStyle = goldGlow; ctx.fillRect(0, 0, W, H);
  const whiteGlow = ctx.createRadialGradient(W - 70, 20, 10, W - 70, 20, 220);
  whiteGlow.addColorStop(0, 'rgba(255,255,255,0.18)'); whiteGlow.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = whiteGlow; ctx.fillRect(0, 0, W, H);

  // sugestão de gramado bem discreta no rodapé
  const grassGlow = ctx.createLinearGradient(0, H - 130, 0, H);
  grassGlow.addColorStop(0, 'rgba(33,211,155,0)'); grassGlow.addColorStop(1, 'rgba(33,211,155,0.12)');
  ctx.fillStyle = grassGlow; ctx.fillRect(0, H - 130, W, 130);

  // faíscas douradas
  const sparks = [[30, 40], [W - 40, 60], [40, H - 60], [W - 30, H - 100], [20, H * 0.45], [W - 25, H * 0.55]];
  ctx.fillStyle = 'rgba(245,197,66,0.85)';
  sparks.forEach(([sx, sy]) => { ctx.beginPath(); ctx.arc(sx, sy, 2.6, 0, Math.PI * 2); ctx.fill(); });

  // moldura metálica
  roundRectPath(ctx, 16, 16, W - 32, H - 32, 28);
  ctx.lineWidth = 2;
  ctx.strokeStyle = P.goldDark;
  ctx.stroke();
  roundRectPath(ctx, 20, 20, W - 40, H - 40, 24);
  ctx.lineWidth = 1;
  ctx.strokeStyle = 'rgba(245,197,66,0.25)';
  ctx.stroke();

  // topo esquerdo: número + posição + tier
  ctx.textAlign = 'left';
  ctx.fillStyle = P.white;
  ctx.font = '900 34px sans-serif';
  ctx.fillText(`#${player.numero || '-'}`, 46, 78);
  ctx.font = '900 20px sans-serif';
  ctx.fillText(player.position === 'goleiro' ? 'GOLEIRO' : 'LINHA', 46, 108);
  ctx.fillStyle = P.gold;
  ctx.font = '800 16px sans-serif';
  ctx.fillText(tier.name.toUpperCase(), 46, 132);

  // topo direito: GERAL + overall grande dourado com brilho
  ctx.textAlign = 'right';
  ctx.fillStyle = P.white;
  ctx.font = '900 18px sans-serif';
  ctx.fillText('GERAL', W - 46, 60);
  ctx.save();
  ctx.shadowColor = 'rgba(245,197,66,0.7)'; ctx.shadowBlur = 24;
  ctx.fillStyle = P.gold;
  ctx.font = '900 74px sans-serif';
  ctx.fillText(String(overall), W - 46, 132);
  ctx.restore();

  const drawRestOfCard = () => {
    // brilho difuso atrás do avatar
    const avatarGlow = ctx.createRadialGradient(W / 2, 270, 20, W / 2, 270, 175);
    avatarGlow.addColorStop(0, 'rgba(245,197,66,0.30)'); avatarGlow.addColorStop(1, 'rgba(245,197,66,0)');
    ctx.fillStyle = avatarGlow; ctx.fillRect(W / 2 - 175, 95, 350, 350);

    // anéis dourados ao redor da foto
    ctx.beginPath(); ctx.arc(W / 2, 270, 158, 0, Math.PI * 2);
    ctx.lineWidth = 6; ctx.strokeStyle = P.gold; ctx.stroke();
    ctx.beginPath(); ctx.arc(W / 2, 270, 168, 0, Math.PI * 2);
    ctx.lineWidth = 1.5; ctx.strokeStyle = 'rgba(245,197,66,0.35)'; ctx.stroke();

    // nome dourado itálico com brilho
    ctx.save();
    ctx.textAlign = 'center';
    ctx.font = 'italic 900 52px sans-serif';
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillText(player.name.toUpperCase(), W / 2 + 2, 496 + 2);
    ctx.shadowColor = 'rgba(245,197,66,0.5)'; ctx.shadowBlur = 20;
    ctx.fillStyle = P.gold;
    ctx.fillText(player.name.toUpperCase(), W / 2, 496);
    ctx.restore();

    // painel de atributos (vidro escuro, linhas de 5)
    const attrs = attrsFor(player.position);
    const rows = attrs.length > 5 ? [attrs.slice(0, 5), attrs.slice(5)] : [attrs];
    const panelX = 44, panelW = W - 88, cellH = 96;
    const panelY = 536, panelH = rows.length * cellH;
    roundRectPath(ctx, panelX, panelY, panelW, panelH, 18);
    ctx.fillStyle = 'rgba(255,255,255,0.045)';
    ctx.fill();
    ctx.lineWidth = 1; ctx.strokeStyle = 'rgba(156,107,8,0.4)'; ctx.stroke();

    rows.forEach((row, ri) => {
      const cellW = panelW / row.length;
      const rowY = panelY + ri * cellH;
      if (ri > 0) {
        ctx.beginPath(); ctx.moveTo(panelX, rowY); ctx.lineTo(panelX + panelW, rowY);
        ctx.lineWidth = 1; ctx.strokeStyle = 'rgba(255,255,255,0.08)'; ctx.stroke();
      }
      row.forEach((a, ci) => {
        const cx = panelX + ci * cellW + cellW / 2;
        if (ci > 0) {
          ctx.beginPath(); ctx.moveTo(panelX + ci * cellW, rowY + 12); ctx.lineTo(panelX + ci * cellW, rowY + cellH - 12);
          ctx.lineWidth = 1; ctx.strokeStyle = 'rgba(255,255,255,0.08)'; ctx.stroke();
        }
        ctx.textAlign = 'center';
        ctx.font = '22px sans-serif';
        ctx.fillText(ATTR_EMOJI[a.key] || '⚽', cx, rowY + 28);
        ctx.font = '900 30px sans-serif';
        ctx.fillStyle = P.white;
        ctx.fillText(String(player.attrs?.[a.key] ?? 50), cx, rowY + 60);
        ctx.font = '700 10px sans-serif';
        ctx.fillStyle = 'rgba(245,245,245,0.55)';
        const label = (ATTR_SHORT_LABEL[a.key] || a.label.toUpperCase());
        ctx.fillText(label, cx, rowY + 80);
      });
    });

    // painel de estatísticas
    const statY = panelY + panelH + 22;
    const statH = 168;
    roundRectPath(ctx, panelX, statY, panelW, statH, 18);
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.fill();

    const stat3 = (label, value, x, color, glow, emoji) => {
      ctx.textAlign = 'center';
      ctx.font = '18px sans-serif';
      ctx.fillText(emoji, x, statY + 32);
      ctx.save();
      if (glow) { ctx.shadowColor = color; ctx.shadowBlur = 14; }
      ctx.fillStyle = color;
      ctx.font = '900 34px sans-serif';
      ctx.fillText(String(value), x, statY + 74);
      ctx.restore();
      ctx.font = '700 12px sans-serif';
      ctx.fillStyle = 'rgba(245,245,245,0.55)';
      ctx.fillText(label.toUpperCase(), x, statY + 94);
    };
    stat3('Pontos', extra.pts, W / 2 - 175, P.green, true, '⭐');
    stat3('Jogos', extra.jogos, W / 2, P.white, false, '📅');
    stat3('MVP', extra.mvpCount, W / 2 + 175, P.gold, false, '👑');

    ctx.beginPath(); ctx.moveTo(panelX + 20, statY + 108); ctx.lineTo(panelX + panelW - 20, statY + 108);
    ctx.lineWidth = 1; ctx.strokeStyle = 'rgba(255,255,255,0.08)'; ctx.stroke();

    const stat2 = (label, value, x) => {
      ctx.textAlign = 'center';
      ctx.font = '900 30px sans-serif';
      ctx.fillStyle = P.white;
      ctx.fillText(String(value), x, statY + 148);
      ctx.font = '700 12px sans-serif';
      ctx.fillStyle = 'rgba(245,245,245,0.55)';
      ctx.fillText(label.toUpperCase(), x, statY + 166);
    };
    if (player.position === 'goleiro') {
      stat2('Defesas', extra.defesas ?? 0, W / 2 - 88);
      stat2('Pênaltis def.', extra.penaltis ?? 0, W / 2 + 88);
    } else {
      stat2('Gols', extra.gols ?? 0, W / 2 - 88);
      stat2('Assist.', extra.assist ?? 0, W / 2 + 88);
    }

    ctx.textAlign = 'center';
    ctx.font = '800 18px sans-serif';
    ctx.fillStyle = 'rgba(245,245,245,0.5)';
    ctx.fillText('RACHA DO GRUPO', W / 2, H - 26);

    done(canvas);
  };

  if (player.foto) {
    const img = new Image();
    img.onload = () => {
      ctx.save();
      ctx.beginPath();
      ctx.arc(W / 2, 270, 150, 0, Math.PI * 2);
      ctx.closePath();
      ctx.clip();
      ctx.drawImage(img, W / 2 - 150, 120, 300, 300);
      ctx.restore();
      drawRestOfCard();
    };
    img.onerror = drawRestOfCard;
    img.src = player.foto;
  } else {
    ctx.save();
    ctx.beginPath();
    ctx.arc(W / 2, 270, 150, 0, Math.PI * 2);
    ctx.fillStyle = P.purple;
    ctx.fill();
    ctx.font = '900 90px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(player.name.trim().split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase(), W / 2, 296);
    ctx.restore();
    drawRestOfCard();
  }
}

function drawCompareCanvas(a, b, rA, rB, done) {
  const rows = [
    ['Overall', overallOf(a), overallOf(b)],
    ['Pontos', rA.pts, rB.pts],
    ['Jogos', rA.jogos, rB.jogos],
    ['MVPs', rA.mvpCount, rB.mvpCount],
  ];
  const sharedAttrs = a.position === b.position;
  if (sharedAttrs) {
    attrsFor(a.position).forEach(attr => rows.push([ATTR_SHORT_LABEL[attr.key] || attr.label, a.attrs?.[attr.key] ?? 50, b.attrs?.[attr.key] ?? 50, attr.key]));
  }

  const W = 640;
  const headerH = 190, rowH = 44, footerH = 50;
  const H = headerH + rows.length * rowH + footerH;
  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d');
  const P = PREMIUM_HEX;

  ctx.fillStyle = P.black; ctx.fillRect(0, 0, W, H);
  const navyGlow = ctx.createRadialGradient(W / 2, 0, 10, W / 2, 0, 380);
  navyGlow.addColorStop(0, P.navy); navyGlow.addColorStop(1, 'rgba(7,21,42,0)');
  ctx.fillStyle = navyGlow; ctx.fillRect(0, 0, W, H);

  roundRectPath(ctx, 14, 14, W - 28, H - 28, 24);
  ctx.lineWidth = 2; ctx.strokeStyle = P.goldDark; ctx.stroke();
  roundRectPath(ctx, 18, 18, W - 36, H - 36, 20);
  ctx.lineWidth = 1; ctx.strokeStyle = 'rgba(245,197,66,0.25)'; ctx.stroke();

  // avatares + nomes
  const drawMini = (player, cx) => {
    ctx.beginPath(); ctx.arc(cx, 82, 42, 0, Math.PI * 2);
    ctx.lineWidth = 3; ctx.strokeStyle = P.gold; ctx.stroke();
    ctx.save();
    ctx.beginPath(); ctx.arc(cx, 82, 39, 0, Math.PI * 2); ctx.clip();
    ctx.fillStyle = P.purple; ctx.fill();
    ctx.restore();
    ctx.textAlign = 'center';
    ctx.font = '900 30px sans-serif'; ctx.fillStyle = '#fff';
    ctx.fillText(player.name.trim().split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase(), cx, 93);
    ctx.font = 'italic 900 20px sans-serif'; ctx.fillStyle = P.gold;
    const name = player.name.toUpperCase();
    ctx.fillText(name.length > 14 ? name.slice(0, 13) + '…' : name, cx, 148);
  };
  drawMini(a, W * 0.27);
  drawMini(b, W * 0.73);

  ctx.textAlign = 'center';
  ctx.font = '900 22px sans-serif'; ctx.fillStyle = 'rgba(245,245,245,0.5)';
  ctx.fillText('VS', W / 2, 90);

  let y = headerH + 4;
  rows.forEach(([label, va, vb]) => {
    const aWins = va > vb, bWins = vb > va;
    ctx.textAlign = 'left';
    ctx.font = '900 24px sans-serif';
    ctx.fillStyle = aWins ? P.green : '#fff';
    ctx.fillText(String(va) + (aWins ? ' ▲' : ''), 46, y);

    ctx.textAlign = 'center';
    ctx.font = '700 13px sans-serif';
    ctx.fillStyle = 'rgba(245,245,245,0.55)';
    ctx.fillText(String(label).toUpperCase(), W / 2, y - 4);

    ctx.textAlign = 'right';
    ctx.font = '900 24px sans-serif';
    ctx.fillStyle = bWins ? P.green : '#fff';
    ctx.fillText((bWins ? '▲ ' : '') + String(vb), W - 46, y);

    y += rowH;
    if (y < H - footerH) {
      ctx.beginPath(); ctx.moveTo(30, y - rowH + 16); ctx.lineTo(W - 30, y - rowH + 16);
      ctx.lineWidth = 1; ctx.strokeStyle = 'rgba(255,255,255,0.06)'; ctx.stroke();
    }
  });

  ctx.textAlign = 'center';
  ctx.font = '800 16px sans-serif';
  ctx.fillStyle = 'rgba(245,245,245,0.5)';
  ctx.fillText('RACHA DO GRUPO', W / 2, H - 22);
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
  const sizeMap = { sm: 'w-10 h-10 text-xs', md: 'w-12 h-12 text-sm', lg: 'w-24 h-24 text-xl', xl: 'w-32 h-32 text-3xl' };
  const badgeBox = size === 'lg' || size === 'xl' ? 'w-6 h-6' : 'w-4 h-4';
  const badgeIcon = size === 'lg' || size === 'xl' ? 'w-3.5 h-3.5' : 'w-2.5 h-2.5';
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
  const [caixa, setCaixa] = useState([]);
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
    const [pv, gv, cv, xv] = await Promise.all([cloudGet('players'), cloudGet('games'), cloudGet('config'), cloudGet('caixa')]);
    const p = pv ? JSON.parse(pv) : [];
    const g = gv ? JSON.parse(gv) : [];
    const c = cv ? JSON.parse(cv) : { pin: null };
    const x = xv ? JSON.parse(xv) : [];
    const unlocked = localGet('pelada_organizer_unlocked') === 'true';
    const identity = localGet('pelada_my_identity') || null;
    setPlayers(p); setGames(g); setConfig(c); setCaixa(x); setIsOrganizer(unlocked); setMyId(identity);
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

  const saveCaixa = async (next) => {
    setCaixa(next);
    const ok = await cloudSet('caixa', JSON.stringify(next));
    if (!ok) setToast('Erro ao salvar caixa (confira sua internet)');
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

  const updateMyPhoto = async (file) => {
    if (!myId || !file) return;
    try {
      const dataUrl = await resizeImage(file);
      const next = players.map(p => p.id === myId ? { ...p, fotoPendente: dataUrl } : p);
      await savePlayers(next);
      setToast('Foto enviada! Aguardando aprovação do organizador.');
    } catch (e) { setToast('Não foi possível carregar a foto'); }
  };

  const setPalpite = (gameId, playerId, palpite) => {
    if (!playerId) return;
    const next = games.map(g => g.id === gameId ? { ...g, palpites: { ...(g.palpites || {}), [playerId]: palpite } } : g);
    saveGames(next);
    setToast('Palpite registrado! Boa sorte 🍀');
  };

  const voteEnquete = (gameId, voterId, votedId) => {
    if (!voterId) return;
    const next = games.map(g => g.id === gameId ? { ...g, enquete: { ...(g.enquete || {}), [voterId]: votedId } } : g);
    saveGames(next);
    setToast('Voto registrado! 🥔');
  };

  const voteMvp = (gameId, voterId, votedId) => {
    if (!voterId) return;
    const next = games.map(g => g.id === gameId ? { ...g, votosMvp: { ...(g.votosMvp || {}), [voterId]: votedId } } : g);
    saveGames(next);
    setToast('Voto de MVP registrado! 👑');
  };

  const voteGoleiro = (gameId, voterId, votedId) => {
    if (!voterId) return;
    const next = games.map(g => g.id === gameId ? { ...g, votosGoleiro: { ...(g.votosGoleiro || {}), [voterId]: votedId } } : g);
    saveGames(next);
    setToast('Voto de melhor goleiro registrado! 🧤');
  };

  const guard = (fn) => (...args) => { if (isOrganizer) fn(...args); };

  const lancarMovimentacao = guard((desc, valor, tipo) => {
    const v = Math.abs(Number(valor) || 0);
    if (v === 0) return;
    const entry = { id: uid(), desc, valor: tipo === 'saida' ? -v : v, tipo: 'manual', data: new Date().toISOString().slice(0, 10) };
    saveCaixa([entry, ...caixa]);
    setToast('Movimentação lançada!');
  });

  const fecharCaixaJogo = guard((gameId, sobraFinal) => {
    const game = games.find(g => g.id === gameId);
    if (!game || game.caixaLancado) return;
    const entry = { id: uid(), desc: `Sobra da pelada de ${fmtDate(game.date)}`, valor: Number(sobraFinal) || 0, tipo: 'auto', gameId, data: game.date };
    saveCaixa([entry, ...caixa]);
    updateGame(gameId, { caixaLancado: true });
    setToast('Lançado no caixa do grupo!');
  });

  const excluirLancamento = guard((entryId) => {
    const entry = caixa.find(e => e.id === entryId);
    if (!entry) return;
    saveCaixa(caixa.filter(e => e.id !== entryId));
    if (entry.tipo === 'auto' && entry.gameId) {
      updateGame(entry.gameId, { caixaLancado: false });
    }
    setToast('Lançamento excluído.');
  });


  const abrirVotacao = guard((gameId) => {
    saveGames(games.map(g => g.id === gameId ? { ...g, votacaoAberta: true } : g));
    setToast('Votação aberta! Chama a galera pra votar 📣');
  });

  const apurarVotacao = guard((gameId) => {
    const game = games.find(g => g.id === gameId);
    const winner = (votes) => {
      const counts = {};
      Object.values(votes || {}).forEach(v => { counts[v] = (counts[v] || 0) + 1; });
      let best = null, max = 0;
      Object.entries(counts).forEach(([id, c]) => { if (c > max) { max = c; best = id; } });
      return best;
    };
    saveGames(games.map(g => g.id === gameId ? { ...g, mvp: winner(g.votosMvp), melhorGoleiroId: winner(g.votosGoleiro), votacaoAberta: false } : g));
    setToast('Votação encerrada! Resultado apurado 🏆');
  });

  const approvePhoto = guard((id) => {
    const next = players.map(p => p.id === id ? { ...p, foto: p.fotoPendente, fotoPendente: null } : p);
    savePlayers(next);
    setToast('Foto aprovada!');
  });

  const rejectPhoto = guard((id) => {
    const next = players.map(p => p.id === id ? { ...p, fotoPendente: null } : p);
    savePlayers(next);
    setToast('Foto recusada');
  });

  const addPlayer = guard((name, position) => {
    if (!name.trim()) return;
    savePlayers([...players, { id: uid(), name: name.trim(), position, numero: players.length + 1, foto: null, fotoPendente: null, pin: null, attrs: defaultAttrs(position) }]);
  });

  const removePlayer = guard((id) => savePlayers(players.filter(p => p.id !== id)));

  const updatePlayer = guard((id, patch) => {
    savePlayers(players.map(p => p.id === id ? { ...p, ...patch } : p));
  });

  const createGame = guard(() => {
    const iso = new Date().toISOString().slice(0, 10);
    const game = { id: uid(), date: iso, horario: '10:00', local: '', rsvp: {}, payments: {}, valor: '', valorQuadra30: '', duracaoMin: 60, caixaLancado: false, teams: null, mvp: null, melhorGoleiroId: null, votacaoAberta: false, votosMvp: {}, votosGoleiro: {}, stats: {}, palpites: {}, enquete: {} };
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

  const setPayment = guard((gameId, playerId, valor) => {
    const game = games.find(g => g.id === gameId);
    updateGame(gameId, { payments: { ...game.payments, [playerId]: valor } });
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
      <div className="relative overflow-hidden" style={{ background: 'linear-gradient(180deg, rgba(3,5,8,0.15) 0%, rgba(3,5,8,0.35) 100%)' }}>
      <div className="px-3 pt-3 shrink-0">
      <Panel color="gold" cutSize={18}>
        <div className="relative flex items-center justify-between px-4 py-3.5 min-h-[86px]">
          <span className="absolute left-0 top-3.5 bottom-3.5 w-1" style={{ background: 'repeating-linear-gradient(180deg, #10b981 0 6px, transparent 6px 11px)' }} />
          <div className="pl-3.5">
            <p className="text-[10px] font-black tracking-[0.25em] uppercase flex items-center gap-1.5" style={{ color: PV6.green }}>
              {isOrganizer ? 'Modo organizador' : me ? `Olá, ${me.name.split(' ')[0]}` : 'Modo visualização'}
            </p>
            <div className="flex items-baseline gap-2 mt-0.5">
              <h1 className="text-[22px] font-black tracking-tight leading-none whitespace-nowrap text-white">RACHA DO GRUPO</h1>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="shrink-0">
                <circle cx="12" cy="12" r="10" fill="#F5F5F5" stroke={PV6.gold} strokeWidth="1.5" />
                <path d="M12 7l3.5 2.5-1.3 4.1H9.8L8.5 9.5z" fill="#0a0a0a" />
              </svg>
            </div>
          </div>
          <button onClick={() => isOrganizer ? lockOrganizer() : setPinModal(true)} className="relative w-12 h-12 rounded-full flex items-center justify-center shrink-0 transition-transform active:scale-90" style={{ background: `conic-gradient(from 180deg, ${PV6.green}, ${PV6.greenDark}, ${PV6.green}, ${PV6.greenDark}, ${PV6.green})`, boxShadow: `0 0 16px 1px ${PV6.greenGlow}`, padding: 3 }}>
            <span className="w-full h-full rounded-full flex items-center justify-center" style={{ background: '#0a0f0c' }}>
              {isOrganizer ? <Unlock className="w-4 h-4" style={{ color: PV6.green }} /> : <Lock className="w-4 h-4" style={{ color: PV6.green }} />}
            </span>
          </button>
        </div>
      </Panel>
        {!isOrganizer && me && (
          <div className="relative mt-2 flex items-center gap-3 flex-wrap px-1">
            <button onClick={clearIdentity} className="text-[11px] font-semibold underline" style={{ color: PV6.green }}>Trocar identidade</button>
            <label className="text-[11px] font-semibold underline cursor-pointer" style={{ color: PV6.green }}>
              Trocar minha foto
              <input type="file" accept="image/*" className="hidden" onChange={(e) => updateMyPhoto(e.target.files[0])} />
            </label>
            {me.fotoPendente && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ color: PV6.gold, background: `${PV6.gold}1a` }}>Foto aguardando aprovação</span>
            )}
          </div>
        )}
      </div>
      </div>

      <div className="flex-1 overflow-y-auto pb-24">
        <div key={tab + (selectedGameId || '')} className="animate-[fadein_0.2s_ease-out]">
          {tab === 'jogos' && isOrganizer && !selectedGame && (
            <JogosList games={games} players={players} onCreate={createGame} onSelect={(id) => { setSelectedGameId(id); setGameSubTab('presenca'); }} setTab={setTab} myId={myId} />
          )}
          {tab === 'jogos' && isOrganizer && selectedGame && (
            <GameDetail game={selectedGame} players={players} subTab={gameSubTab} setSubTab={setGameSubTab}
              onBack={() => setSelectedGameId(null)} onRSVP={setRSVP} onPay={setPayment} onStat={setStat}
              onDelete={deleteGame} onUpdate={(patch) => updateGame(selectedGame.id, patch)} onSorteio={() => doSorteio(selectedGame.id)}
              onAbrirVotacao={() => abrirVotacao(selectedGame.id)} onApurarVotacao={() => apurarVotacao(selectedGame.id)}
              onFecharCaixa={(sobra) => fecharCaixaJogo(selectedGame.id, sobra)}
              caixaEntry={caixa.find(e => e.gameId === selectedGame.id)} onDesfazerCaixa={excluirLancamento}
              myId={myId} onVoteMvp={voteMvp} onVoteGoleiro={voteGoleiro} onVoteEnquete={voteEnquete}
              send={send} />
          )}
          {tab === 'jogos' && !isOrganizer && <ViewerJogos games={games} players={players} myId={myId} onVoteMvp={voteMvp} onVoteGoleiro={voteGoleiro} onVoteEnquete={voteEnquete} />}
          {tab === 'elenco' && isOrganizer && (
            <ElencoTab players={players} onAdd={addPlayer} onOpenEdit={setEditPlayer} onApprovePhoto={approvePhoto} onRejectPhoto={rejectPhoto} />
          )}
          {tab === 'ranking' && <RankingTab ranking={ranking} onOpenCard={setCardPlayer} myId={myId} players={players} games={games} />}
          {tab === 'bolao' && <BolaoTab games={games} players={players} myId={myId} onSetPalpite={setPalpite} onOpenCard={setCardPlayer} />}
          {tab === 'votacao' && <VotacaoTab games={games} players={players} myId={myId} onVoteMvp={voteMvp} onVoteGoleiro={voteGoleiro} onVoteEnquete={voteEnquete} />}
          {tab === 'financas' && <FinancasTab caixa={caixa} games={games} players={players} isOrganizer={isOrganizer} onLancar={lancarMovimentacao} onSetPayment={setPayment} onExcluir={excluirLancamento} />}
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

      <div className="fixed bottom-0 left-0 right-0 flex justify-around items-end px-2 pt-2" style={{ background: 'linear-gradient(180deg, rgba(6,10,16,0.15), rgba(5,7,12,0.75) 60%, rgba(5,7,12,0.92))', paddingBottom: 'max(8px, env(safe-area-inset-bottom))' }}>
        {isOrganizer ? (
          <>
            <NavBtn icon={Calendar} label="Jogos" active={tab === 'jogos'} onClick={() => { setTab('jogos'); setSelectedGameId(null); }} />
            <NavBtn icon={Users} label="Elenco" active={tab === 'elenco'} onClick={() => setTab('elenco')} />
            <NavBtn icon={Medal} label="Votação" active={tab === 'votacao'} onClick={() => setTab('votacao')} />
            <NavBtn icon={Sparkles} label="Bolão" active={tab === 'bolao'} onClick={() => setTab('bolao')} />
            <NavBtn icon={Wallet} label="Finanças" active={tab === 'financas'} onClick={() => setTab('financas')} />
            <NavBtn icon={Trophy} label="Ranking" active={tab === 'ranking'} onClick={() => setTab('ranking')} />
          </>
        ) : (
          <>
            <NavBtn icon={Trophy} label="Ranking" active={tab === 'ranking'} onClick={() => setTab('ranking')} />
            <NavBtn icon={Medal} label="Votação" active={tab === 'votacao'} onClick={() => setTab('votacao')} />
            <NavBtn icon={Sparkles} label="Bolão" active={tab === 'bolao'} onClick={() => setTab('bolao')} />
            <NavBtn icon={Wallet} label="Finanças" active={tab === 'financas'} onClick={() => setTab('financas')} />
            <NavBtn icon={Calendar} label="Jogos" active={tab === 'jogos'} onClick={() => setTab('jogos')} />
          </>
        )}
      </div>
    </div>
  );
}

function NavBtn({ icon: Icon, label, active, onClick }) {
  return (
    <button onClick={onClick} className="flex flex-col items-center gap-0.5 px-1.5 pb-2 transition-all duration-200 active:scale-90 flex-1 min-w-0"
      style={active ? {
        color: PV6.green, marginTop: -14, paddingTop: 14,
        background: 'linear-gradient(180deg, rgba(16,185,129,0.20), rgba(16,185,129,0.04))',
        clipPath: 'polygon(10px 0, calc(100% - 10px) 0, 100% 10px, 100% 100%, 0 100%, 0 10px)',
        border: `1px solid ${PV6.greenGlow}`, boxShadow: `0 -4px 16px -4px ${PV6.greenGlow}`
      } : { color: '#6b7280' }}>
      <Icon className="w-[18px] h-[18px]" strokeWidth={active ? 2.5 : 2} />
      <span className="text-[9px] font-bold tracking-wide whitespace-nowrap">{label}</span>
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
    <div className="min-h-screen flex items-center justify-center p-6 relative overflow-hidden" style={{ backgroundImage: "url('/bg-pelada.jpg')", backgroundSize: 'cover', backgroundPosition: 'top center', backgroundRepeat: 'no-repeat' }}>
      <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, rgba(3,5,8,0.35), rgba(3,5,8,0.65))' }} />
      <div className="relative w-full max-w-xs animate-[popin_0.22s_ease-out]">
      <Panel color="gold" cutSize={18} innerStyle={{ padding: 22 }}>
        <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: `conic-gradient(from 180deg, ${PV6.green}, ${PV6.greenDark}, ${PV6.green}, ${PV6.greenDark}, ${PV6.green})`, boxShadow: `0 0 18px 1px ${PV6.greenGlow}`, padding: 3 }}>
          <div className="w-full h-full rounded-full flex items-center justify-center" style={{ background: '#0a0f0c' }}>
            <Shield className="w-6 h-6" style={{ color: PV6.green }} />
          </div>
        </div>
        <h2 className="font-black text-lg text-white mb-1 text-center">Quem é você?</h2>
        <p className="text-xs text-zinc-500 mb-4 text-center">Escolha seu nome e digite o PIN que o organizador te passou.</p>
        <select value={selected} onChange={(e) => setSelected(e.target.value)} className="w-full bg-transparent px-3 py-2.5 text-sm mb-2 outline-none text-zinc-100" style={{ border: '1.5px solid rgba(255,255,255,0.14)', borderRadius: 4 }}>
          <option value="" className="bg-zinc-900">Selecione seu nome...</option>
          {players.map(p => <option key={p.id} value={p.id} className="bg-zinc-900">{p.name}</option>)}
        </select>
        <input type="tel" inputMode="numeric" maxLength={4} value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))} placeholder="PIN"
          className="w-full text-center tracking-[0.3em] text-lg font-bold bg-transparent px-3 py-2.5 mb-3 outline-none text-white" style={{ border: '1.5px solid rgba(255,255,255,0.14)', borderRadius: 4 }} />
        <button onClick={submit} className="w-full font-black py-3 text-sm mb-3 transition-transform active:scale-95" style={{ borderRadius: 5, background: `linear-gradient(135deg, ${PV6.green}, ${PV6.greenDark})`, color: '#05100a', boxShadow: `0 0 16px -2px ${PV6.greenGlow}` }}>Entrar</button>
        <button onClick={onOrganizerClick} className="w-full text-center text-xs text-zinc-500 font-semibold">Sou o organizador</button>
      </Panel>
      </div>
    </div>
  );
}

function PinModal({ config, onClose, onSetPin, onSubmitPin }) {
  const [pin, setPin] = useState('');
  const isNew = !config.pin;
  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-40 p-6 animate-[fadein_0.2s_ease-out]" onClick={onClose}>
      <div className="w-full max-w-xs animate-[popin_0.22s_ease-out]" onClick={(e) => e.stopPropagation()}>
      <Panel color="gold" cutSize={16} innerStyle={{ padding: 20 }}>
        <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3" style={{ background: `conic-gradient(from 180deg, ${PV6.green}, ${PV6.greenDark}, ${PV6.green}, ${PV6.greenDark}, ${PV6.green})`, padding: 3 }}>
          <div className="w-full h-full rounded-full flex items-center justify-center" style={{ background: '#0a0f0c' }}>
            <KeyRound className="w-5 h-5" style={{ color: PV6.green }} />
          </div>
        </div>
        <h3 className="font-black text-white mb-1 text-center">{isNew ? 'Criar senha de organizador' : 'Entrar como organizador'}</h3>
        <p className="text-xs text-zinc-500 mb-4 text-center">{isNew ? 'Só quem tiver essa senha poderá alterar dados do app.' : 'Digite a senha do organizador.'}</p>
        <input type="tel" inputMode="numeric" maxLength={6} value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
          placeholder="Senha (números)" autoFocus
          className="w-full text-center tracking-[0.3em] text-lg font-bold bg-transparent px-3 py-2.5 mb-3 outline-none text-white" style={{ border: '1.5px solid rgba(255,255,255,0.14)', borderRadius: 4 }} />
        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 py-2.5 text-sm font-bold text-zinc-400 transition-transform active:scale-95" style={{ borderRadius: 5, background: 'rgba(255,255,255,0.03)', border: '1.5px solid rgba(255,255,255,0.15)' }}>Cancelar</button>
          <button onClick={() => pin && (isNew ? onSetPin(pin) : onSubmitPin(pin))} className="flex-1 py-2.5 text-sm font-bold transition-transform active:scale-95" style={{ borderRadius: 5, background: `linear-gradient(135deg, ${PV6.green}, ${PV6.greenDark})`, color: '#05100a', boxShadow: `0 0 14px -2px ${PV6.greenGlow}` }}>{isNew ? 'Criar' : 'Entrar'}</button>
        </div>
      </Panel>
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



function StatCell({ icon: Icon, value, label, color, glow }) {
  const display = useCountUp(value);
  return (
    <div className="flex flex-col items-center">
      <Icon className="w-3.5 h-3.5 mb-1" style={{ color }} />
      <p className="text-lg font-black leading-none" style={{ color, textShadow: glow ? `0 0 10px ${color}88` : 'none' }}>{display}</p>
      <p className="text-[9px] font-bold uppercase tracking-wide mt-1" style={{ color: 'rgba(245,245,245,0.55)' }}>{label}</p>
    </div>
  );
}

function AttrRow({ items, values }) {
  return (
    <div className="grid divide-x" style={{ gridTemplateColumns: `repeat(${items.length}, 1fr)`, borderColor: 'rgba(255,255,255,0.08)' }}>
      {items.map(a => (
        <div key={a.key} className="flex flex-col items-center px-0.5 py-2">
          <a.Icon className="w-3.5 h-3.5 mb-1" style={{ color: PREMIUM.gold }} />
          <span className="text-base font-black text-white leading-none">{values[a.key] ?? 50}</span>
          <span className="text-[6.5px] font-bold uppercase text-center leading-tight mt-1 px-0.5" style={{ color: 'rgba(245,245,245,0.5)' }}>{a.label}</span>
        </div>
      ))}
    </div>
  );
}

const SPARK_DOTS = [
  { top: '4%', left: '8%', s: 3 }, { top: '10%', left: '90%', s: 2 },
  { top: '92%', left: '12%', s: 2 }, { top: '85%', left: '88%', s: 3 },
  { top: '45%', left: '3%', s: 2 }, { top: '38%', left: '96%', s: 2 },
];

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

  const handleShare = () => drawPlayerCardCanvas(player, { pts, jogos, mvpCount, gols, assist, defesas, penaltis }, (canvas) => shareCanvas(canvas, `${player.name.replace(/\s+/g, '-')}-card.png`));
  const attrRows = attrs.length > 5 ? [attrs.slice(0, 5), attrs.slice(5)] : [attrs];

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-40 p-6 animate-[fadein_0.2s_ease-out]" onClick={onClose}>
      <div className="w-full max-w-xs rounded-[28px] overflow-hidden shadow-2xl relative animate-[popin_0.22s_ease-out]" style={{ background: PREMIUM.black }} onClick={(e) => e.stopPropagation()}>
        {overall >= 86 && <Confetti />}
        {/* atmosfera de estádio */}
        <div className="absolute inset-0" style={{ background: `radial-gradient(circle at 18% 6%, ${PREMIUM.navy} 0%, ${PREMIUM.black} 55%), radial-gradient(circle at 88% 96%, ${PREMIUM.navy} 0%, transparent 55%)` }} />
        <div className="absolute -top-12 -left-10 w-40 h-40 rounded-full blur-3xl" style={{ background: PREMIUM.gold, opacity: 0.25 }} />
        <div className="absolute -top-12 -right-10 w-40 h-40 rounded-full blur-3xl" style={{ background: '#ffffff', opacity: 0.15 }} />
        <div className="absolute bottom-0 left-0 right-0 h-20" style={{ background: `linear-gradient(to top, ${PREMIUM.green}22, transparent)` }} />
        {SPARK_DOTS.map((d, i) => (
          <span key={i} className="absolute rounded-full" style={{ top: d.top, left: d.left, width: d.s, height: d.s, background: PREMIUM.gold, boxShadow: `0 0 6px 2px ${PREMIUM.gold}99` }} />
        ))}

        {/* moldura metálica */}
        <div className="relative m-2 rounded-[22px]" style={{ border: `1px solid ${PREMIUM.goldDark}`, boxShadow: `inset 0 0 0 1px rgba(245,197,66,0.18), inset 0 0 24px rgba(245,197,66,0.05)` }}>
          <div className="relative px-4 pt-4 pb-3">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-lg font-black text-white leading-none">#{player.numero || '-'}</p>
                <p className="text-[10px] font-black uppercase tracking-widest mt-1.5 text-white">{isGk ? 'Goleiro' : 'Linha'}</p>
                <p className="text-[9px] font-bold uppercase tracking-wide mt-0.5" style={{ color: PREMIUM.gold }}>{tier.name}</p>
                <div className="w-6 h-6 flex items-center justify-center mt-1.5" style={{ background: 'rgba(245,197,66,0.12)', clipPath: 'polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)' }}>
                  {isGk ? <Shield className="w-3 h-3" style={{ color: PREMIUM.gold }} /> : <Footprints className="w-3 h-3" style={{ color: PREMIUM.gold }} />}
                </div>
              </div>
              <div className="text-right">
                <p className="text-[9px] font-black uppercase tracking-widest text-white">Geral</p>
                <p className="text-4xl font-black leading-none" style={{ color: PREMIUM.gold, textShadow: `0 0 14px ${PREMIUM.gold}77` }}>{overall}</p>
              </div>
            </div>

            <div className="flex flex-col items-center mt-1">
              <div className="relative flex items-center justify-center">
                <span className="absolute w-36 h-36 rounded-full blur-2xl" style={{ background: `${PREMIUM.gold}33` }} />
                <span className="absolute -inset-1.5 rounded-full" style={{ border: `3px solid ${PREMIUM.gold}` }} />
                <span className="absolute -inset-3 rounded-full" style={{ border: `1px solid ${PREMIUM.gold}55` }} />
                <Avatar player={player} size="xl" />
              </div>
              <h3 className="italic font-black text-2xl mt-3 text-center leading-tight" style={{ color: PREMIUM.gold, textShadow: '0 2px 6px rgba(0,0,0,0.7), 0 0 18px rgba(245,197,66,0.35)' }}>{player.name.toUpperCase()}</h3>
            </div>

            {badges.length > 0 && (
              <div className="flex gap-1.5 mt-3 flex-wrap justify-center">
                {badges.map((b, i) => (
                  <span key={i} className="flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-full" style={{ background: 'rgba(245,197,66,0.12)', color: PREMIUM.gold }}>
                    <b.Icon className="w-3 h-3" /> {b.label}
                  </span>
                ))}
              </div>
            )}

            <div className="mt-4 rounded-2xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.04)', border: `1px solid ${PREMIUM.goldDark}44` }}>
              {attrRows.map((row, i) => (
                <div key={i}>
                  <AttrRow items={row} values={player.attrs || {}} />
                  {i < attrRows.length - 1 && <div className="h-px" style={{ background: 'rgba(255,255,255,0.08)' }} />}
                </div>
              ))}
            </div>

            <div className="mt-3 rounded-2xl p-3" style={{ background: 'rgba(0,0,0,0.35)' }}>
              <div className="grid grid-cols-3 gap-2">
                <StatCell icon={Star} value={pts} label="Pontos" color={PREMIUM.green} glow />
                <StatCell icon={Calendar} value={jogos} label="Jogos" color={PREMIUM.white} />
                <StatCell icon={Crown} value={mvpCount} label="MVP" color={PREMIUM.gold} />
              </div>
              <div className="h-px my-2.5" style={{ background: 'rgba(255,255,255,0.08)' }} />
              <div className="grid grid-cols-2 gap-2">
                {isGk ? (
                  <>
                    <StatCell icon={Shield} value={defesas} label="Defesas" color={PREMIUM.white} />
                    <StatCell icon={Award} value={penaltis} label="Pênaltis def." color={PREMIUM.white} />
                  </>
                ) : (
                  <>
                    <StatCell icon={Target} value={gols} label="Gols" color={PREMIUM.white} />
                    <StatCell icon={Award} value={assist} label="Assist." color={PREMIUM.white} />
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
        <div className="relative flex">
          <button onClick={handleShare} className="flex-1 flex items-center justify-center gap-1.5 font-bold text-sm py-2.5 transition-colors" style={{ background: PREMIUM.gold, color: PREMIUM.black }}><Share2 className="w-4 h-4" /> Compartilhar</button>
          <button onClick={onClose} className="flex-1 font-bold text-sm py-2.5 transition-colors text-zinc-400" style={{ background: PREMIUM.blackBlue }}>Fechar</button>
        </div>
      </div>
    </div>
  );
}

function PlayerEditModal({ player, onClose, onSave, onDelete }) {
  const [form, setForm] = useState({ ...player, attrs: { ...defaultAttrs(player.position), ...player.attrs } });
  const attrs = attrsFor(form.position);
  const overall = Math.round(attrs.map(a => Number(form.attrs[a.key]) || 50).reduce((x, y) => x + y, 0) / attrs.length);
  const posColor = form.position === 'goleiro' ? 'blue' : 'green';

  const handlePhoto = async (file) => {
    if (!file) return;
    try { const dataUrl = await resizeImage(file); setForm(f => ({ ...f, foto: dataUrl })); } catch (e) {}
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-end sm:items-center justify-center z-40 p-0 sm:p-4" onClick={onClose}>
      <div className="w-full sm:max-w-sm max-h-[94vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <Panel color={posColor} cutSize={18} innerStyle={{ padding: '20px 18px' }}>
          <div className="flex items-start gap-4 mb-4">
            <div className="relative shrink-0 w-[92px] h-[92px]">
              <label className="block w-full h-full rounded-full p-1 cursor-pointer" style={{ background: `conic-gradient(from 180deg, ${PV6[posColor]}, ${PV6[posColor + 'Dark']}, ${PV6[posColor]}, ${PV6[posColor + 'Dark']}, ${PV6[posColor]})`, boxShadow: `0 0 22px -2px ${PV6[posColor + 'Glow']}` }}>
                <Avatar player={form} size="lg" />
                <input type="file" accept="image/*" className="hidden" onChange={(e) => handlePhoto(e.target.files[0])} />
              </label>
              <span className="absolute bottom-0 left-0 w-7 h-7 rounded-full flex items-center justify-center" style={{ background: PV6[posColor + 'Dark'], border: '2px solid #05070c' }}>
                {form.position === 'goleiro' ? <Shield className="w-3.5 h-3.5" style={{ color: PV6.blue }} /> : <Footprints className="w-3.5 h-3.5" style={{ color: PV6.green }} />}
              </span>
              <span className="absolute bottom-0 right-0 w-6 h-6 rounded-full flex items-center justify-center" style={{ background: '#0c0f14', border: '1.5px solid #444' }}>
                <Camera className="w-3 h-3 text-zinc-300" />
              </span>
            </div>
            <div className="flex-1 min-w-0 pt-1">
              <input value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))} className="bg-transparent text-[21px] font-black outline-none w-full text-white truncate" />
              <p className="text-[14px] font-bold mt-0.5 flex items-center gap-1.5" style={{ color: PV6[posColor] }}>
                {form.position === 'goleiro' ? <Shield className="w-3.5 h-3.5" /> : <Footprints className="w-3.5 h-3.5" />}
                {form.position === 'goleiro' ? 'GOLEIRO' : 'LINHA'} · #{form.numero}
              </p>
              {form.foto && (
                <button onClick={() => setForm(f => ({ ...f, foto: null }))} className="text-[11px] font-semibold underline mt-1.5" style={{ color: PV6[posColor] }}>Remover foto</button>
              )}
            </div>
            <div className="shrink-0 w-[76px] h-16 flex flex-col items-center justify-center" style={{ clipPath: 'polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)', background: 'linear-gradient(160deg, #0d1116, #070a0d)', border: `1.5px solid ${PV6[posColor]}`, boxShadow: `0 0 14px -2px ${PV6[posColor + 'Glow']}` }}>
              <span className="text-xl font-black leading-none" style={{ color: PV6[posColor] }}>{overall}</span>
              <span className="text-[8px] font-bold tracking-widest text-zinc-400 mt-0.5">OVR</span>
            </div>
          </div>

          <div className="flex gap-2.5 mb-4">
            <button onClick={() => setForm(f => ({ ...f, position: 'linha', attrs: defaultAttrs('linha') }))} className="flex-1 py-3 text-[14px] font-black flex items-center justify-center gap-2 transition-colors" style={{ borderRadius: 5, ...(form.position === 'linha' ? { background: 'rgba(255,255,255,0.05)', border: `1.5px solid ${PV6.green}`, color: PV6.green, boxShadow: `0 0 14px -2px ${PV6.greenGlow}` } : { background: 'rgba(255,255,255,0.02)', border: '1.5px solid rgba(255,255,255,0.12)', color: '#8b93a0' }) }}>
              <Footprints className="w-4 h-4" /> Linha
            </button>
            <button onClick={() => setForm(f => ({ ...f, position: 'goleiro', attrs: defaultAttrs('goleiro') }))} className="flex-1 py-3 text-[14px] font-black flex items-center justify-center gap-2 transition-colors" style={{ borderRadius: 5, ...(form.position === 'goleiro' ? { background: 'rgba(255,255,255,0.05)', border: `1.5px solid ${PV6.blue}`, color: PV6.blue, boxShadow: `0 0 14px -2px ${PV6.blueGlow}` } : { background: 'rgba(255,255,255,0.02)', border: '1.5px solid rgba(255,255,255,0.12)', color: '#8b93a0' }) }}>
              <Shield className="w-4 h-4" /> Goleiro
            </button>
          </div>

          <div className="flex gap-3.5 mb-5">
            <div className="flex-1">
              <label className="text-[10.5px] font-bold text-zinc-500 uppercase tracking-wider">Número</label>
              <div className="flex items-center gap-2 mt-1.5 px-3 py-2.5" style={{ border: '1.5px solid rgba(255,255,255,0.14)', borderRadius: 4 }}>
                <input type="number" value={form.numero} onChange={(e) => setForm(f => ({ ...f, numero: e.target.value }))} className="w-full bg-transparent text-[15px] font-bold text-zinc-100 outline-none" />
              </div>
            </div>
            <div className="flex-1">
              <label className="text-[10.5px] font-bold text-zinc-500 uppercase tracking-wider">PIN de acesso</label>
              <div className="flex items-center gap-1.5 mt-1.5 px-3 py-2.5" style={{ border: '1.5px solid rgba(255,255,255,0.14)', borderRadius: 4 }}>
                <KeyRound className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                <span className="text-[15px] font-bold flex-1 text-zinc-100">{form.pin || '----'}</span>
                <button onClick={() => setForm(f => ({ ...f, pin: genPin() }))} className="text-[12px] font-black shrink-0" style={{ color: PV6[posColor] }}>gerar</button>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5 mb-4">
            <p className="text-[15px] font-black tracking-wide" style={{ color: PV6.gold }}>ATRIBUTOS</p>
            <span className="text-[9.5px] font-bold px-2 py-0.5 flex items-center gap-1" style={{ color: PV6[posColor], border: `1px solid ${PV6[posColor]}`, borderRadius: 3 }}>
              <Crown className="w-2.5 h-2.5" /> SÓ O ORGANIZADOR VÊ E EDITA
            </span>
          </div>
          <div className="space-y-3.5">
            {attrs.map(a => (
              <div key={a.key} className="flex items-center gap-3">
                <span className="w-7 h-7 rounded flex items-center justify-center shrink-0" style={{ background: 'linear-gradient(135deg,#3a2c0d,#1a1508)', border: '1px solid rgba(212,175,55,0.4)' }}>
                  <a.Icon className="w-3.5 h-3.5" style={{ color: PV6.gold }} />
                </span>
                <span className="text-[13.5px] font-bold text-zinc-200 w-[100px] shrink-0 leading-tight">{a.label}</span>
                <input type="range" min="0" max="99" value={form.attrs[a.key]} onChange={(e) => setForm(f => ({ ...f, attrs: { ...f.attrs, [a.key]: Number(e.target.value) } }))} className="flex-1" style={{ accentColor: PV6[posColor] }} />
                <span className="text-[13px] font-black text-zinc-100 w-10 text-center shrink-0 py-1.5" style={{ border: '1.5px solid rgba(255,255,255,0.14)', borderRadius: 4 }}>{form.attrs[a.key]}</span>
              </div>
            ))}
          </div>

          <div className="flex gap-2.5 mt-6">
            <button onClick={() => { if (confirm('Excluir jogador?')) { onDelete(player.id); onClose(); } }} className="flex-1 py-3.5 text-[14px] font-black flex items-center justify-center gap-2 transition-transform active:scale-95" style={{ borderRadius: 5, background: 'rgba(220,38,38,0.08)', border: '1.5px solid #dc2626', color: '#f87171' }}>
              <Trash2 className="w-4 h-4" /> Excluir
            </button>
            <button onClick={onClose} className="flex-1 py-3.5 text-[14px] font-black transition-transform active:scale-95" style={{ borderRadius: 5, background: 'rgba(255,255,255,0.03)', border: '1.5px solid rgba(255,255,255,0.15)', color: '#c5c9d1' }}>Cancelar</button>
            <button onClick={() => { onSave(form); onClose(); }} className="flex-1 py-3.5 text-[14px] font-black flex items-center justify-center gap-2 transition-transform active:scale-95" style={{ borderRadius: 5, background: `linear-gradient(135deg, ${PV6.green}38, ${PV6.green}0f)`, border: `1.5px solid ${PV6.green}`, color: PV6.green, boxShadow: `0 0 14px -2px ${PV6.greenGlow}` }}>
              <Check className="w-4 h-4" /> Salvar
            </button>
          </div>
        </Panel>
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
                <Panel key={g.id} color="gold" cutSize={12} className="w-full text-left transition-transform active:scale-[0.98]" innerStyle={{ padding: 14, cursor: 'pointer' }}>
                  <button onClick={() => onSelect(g.id)} className="w-full text-left">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-black text-xs uppercase tracking-wide" style={{ color: PV6.green }}>{fmtDate(g.date)} {g.horario ? `· ${g.horario}` : ''}</span>
                      <ChevronLeft className="w-4 h-4 text-zinc-600 rotate-180" />
                    </div>
                    <div className="flex gap-4 text-xs text-zinc-400 font-medium">
                      <span className="flex items-center gap-1"><Check className="w-3.5 h-3.5" style={{ color: PV6.green }} /> {confirmados} confirmados</span>
                      <span className="flex items-center gap-1"><DollarSign className="w-3.5 h-3.5" style={{ color: PV6.gold }} /> {pagos} pagos</span>
                    </div>
                  </button>
                </Panel>
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
    <Panel color={active ? 'green' : 'gold'} cutSize={12} className="transition-transform active:scale-95" innerStyle={{ padding: '12px 4px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, cursor: 'pointer' }}>
      <button onClick={onClick} className="flex flex-col items-center gap-1 w-full">
        <Icon className="w-5 h-5" style={{ color: active ? PV6.green : '#a8a29e' }} />
        <span className="text-[10px] font-black leading-tight text-center" style={{ color: active ? PV6.green : '#e5e7eb' }}>{label}</span>
        <span className="text-[8px] text-zinc-500 font-semibold leading-none text-center">{sub}</span>
      </button>
    </Panel>
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
      <Panel color="green" cutSize={18} innerStyle={{ padding: 0 }} className="shadow-lg shadow-black/40 transition-transform active:scale-[0.98]">
      <button onClick={() => onSelect(game.id)} className="w-full text-left">
        <div className="p-4 flex gap-3">
          <div className="rounded-2xl px-3 py-2 text-center shrink-0 w-16" style={{ background: `${PV6.green}18`, border: `1px solid ${PV6.green}44` }}>
            <p className="text-[9px] font-black uppercase" style={{ color: PV6.green }}>{weekday}</p>
            <p className="text-2xl font-black text-white leading-none my-0.5">{day}</p>
            <p className="text-[9px] font-black text-zinc-500 uppercase">{month}</p>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white font-black text-base leading-tight truncate">{game.local || 'Local a definir'}</p>
            <p className="text-zinc-400 text-xs font-semibold">{game.horario ? game.horario : 'Horário a definir'}</p>
            <div className="flex gap-2 mt-2 flex-wrap">
              <span className="text-[10px] font-bold px-2 py-1 rounded-full flex items-center gap-1" style={{ background: `${PV6.green}22`, color: PV6.green }}><Users className="w-3 h-3" /> {confirmados.length} confirmados</span>
              <span className="text-[10px] font-bold px-2 py-1 rounded-full flex items-center gap-1" style={{ background: `${PV6.gold}22`, color: PV6.gold }}><DollarSign className="w-3 h-3" /> {pagos} pagos</span>
            </div>
          </div>
        </div>
        {confirmados.length > 0 && (
          <div className="px-4 py-3 flex items-center gap-1.5 overflow-hidden" style={{ background: `linear-gradient(180deg, ${PV6.greenDark}, #050f0a)` }}>
            {confirmados.slice(0, 7).map(p => <Avatar key={p.id} player={p} size="sm" />)}
            {confirmados.length > 7 && (
              <div className="w-10 h-10 rounded-full bg-black/40 flex items-center justify-center text-white text-[10px] font-black shrink-0">+{confirmados.length - 7}</div>
            )}
          </div>
        )}
        <div className="text-center py-3 font-black text-sm flex items-center justify-center gap-1" style={{ background: `linear-gradient(135deg, ${PV6.green}, ${PV6.greenDark})`, color: '#05100a' }}>
          Ver detalhes do jogo <ChevronLeft className="w-4 h-4 rotate-180" />
        </div>
      </button>
      </Panel>

      <div className="grid grid-cols-2 gap-2.5 mt-2.5">
        <Panel color="gold" cutSize={12} innerStyle={{ padding: 12 }}>
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
            <p className="text-[10px] font-bold flex items-center gap-1" style={{ color: meuStatus === 'sim' ? PV6.green : '#71717a' }}>
              {meuStatus === 'sim' ? <><CheckCircle2 className="w-3 h-3" /> Você confirmou presença</> : 'Você ainda não confirmou'}
            </p>
          )}
        </Panel>
        <Panel color="gold" cutSize={12} innerStyle={{ padding: 12 }}>
          <p className="text-[10px] font-black text-zinc-500 uppercase mb-2 flex items-center gap-1"><DollarSign className="w-3 h-3" /> Pagamentos</p>
          <div className="flex gap-2 mb-2">
            <div><p className="text-lg font-black leading-none" style={{ color: PV6.green }}>{pagos}</p><p className="text-[9px] text-zinc-500 font-bold">Pagos</p></div>
            <div><p className="text-lg font-black leading-none" style={{ color: PV6.gold }}>{pendentesPag}</p><p className="text-[9px] text-zinc-500 font-bold">Pendentes</p></div>
          </div>
          <p className="text-[10px] font-bold flex items-center gap-1" style={{ color: pendentesPag === 0 && confirmados.length > 0 ? PV6.green : '#71717a' }}>
            {pendentesPag === 0 && confirmados.length > 0 ? <><CheckCircle2 className="w-3 h-3" /> Tudo certo! 🎉</> : `R$ ${game.valor || '0'} por pessoa`}
          </p>
        </Panel>
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

function ViewerJogos({ games, players, myId, onVoteMvp, onVoteGoleiro, onVoteEnquete }) {
  const [openId, setOpenId] = useState(null);
  const [showFormation, setShowFormation] = useState(false);
  return (
    <div className="p-4 space-y-3">
      {games.length === 0 && <EmptyState icon={Calendar} text="Nenhuma pelada marcada ainda" sub="Quando o organizador criar um jogo, ele aparece aqui." />}
      {games.map(g => {
        const confirmados = players.filter(p => g.rsvp[p.id] === 'sim');
        const open = openId === g.id;
        const zoeiras = g.mvp ? generateZoeiras(g, players) : [];
        return (
          <Panel key={g.id} color="gold" cutSize={14} innerStyle={{ padding: 0 }}>
            <button onClick={() => { const next = !open; setOpenId(next ? g.id : null); setShowFormation(next && !!g.teams); }} className="w-full text-left p-4 transition-colors active:bg-white/5">
              <p className="font-black text-sm uppercase tracking-wide" style={{ color: PV6.green }}>{fmtDate(g.date)} {g.horario ? `· ${g.horario}` : ''}</p>
              {g.local && <p className="text-xs text-zinc-500 mt-0.5">📍 {g.local}</p>}
            </button>
            {open && (
              <div className="px-4 pb-4 space-y-3 border-t border-white/5 pt-3 animate-[fadein_0.2s_ease-out]">
                {g.teams && (
                  <button onClick={() => setShowFormation(v => !v)} className="text-[11px] font-bold underline block" style={{ color: PV6.green }}>
                    {showFormation ? 'Ver pagamentos' : 'Ver escalação dos times'}
                  </button>
                )}
                {g.teams && showFormation ? (
                  <PitchFormation teams={g.teams} players={players} />
                ) : (
                  <div className="space-y-1.5">
                    {confirmados.length === 0 && <p className="text-xs text-zinc-500">Ninguém confirmado ainda.</p>}
                    {confirmados.map(p => (
                      <div key={p.id} className="flex items-center gap-2">
                        <Avatar player={p} size="sm" />
                        <span className="flex-1 text-xs font-semibold text-zinc-300 truncate">{p.name}</span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={g.payments[p.id] ? { background: `${PV6.green}22`, color: PV6.green } : { background: `${PV6.gold}22`, color: PV6.gold }}>{g.payments[p.id] ? 'Pago' : 'Pendente'}</span>
                      </div>
                    ))}
                  </div>
                )}
                {g.votacaoAberta && !g.mvp && (
                  <div className="bg-amber-500/10 border border-amber-500/25 rounded-xl p-3">
                    <p className="text-xs font-bold text-amber-300">📣 Votação aberta! Vai na aba "Votação" pra votar no MVP, melhor goleiro e bola murcha.</p>
                  </div>
                )}
                {zoeiras.length > 0 && <ZoeiraCard lines={zoeiras} />}
              </div>
            )}
          </Panel>
        );
      })}
    </div>
  );
}

function StatBox({ value, label, color }) {
  return (
    <Panel color="gold" cutSize={10} className="flex-1" innerStyle={{ padding: '10px 4px', textAlign: 'center', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
      <p className={`text-xl font-black leading-none ${color || 'text-white'}`}>{value}</p>
      <p className="text-[9px] font-bold text-zinc-500 uppercase mt-1">{label}</p>
    </Panel>
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

function GameDetail({ game, players, subTab, setSubTab, onBack, onRSVP, onPay, onStat, onDelete, onUpdate, onSorteio, onAbrirVotacao, onApurarVotacao, onFecharCaixa, caixaEntry, onDesfazerCaixa, myId, onVoteMvp, onVoteGoleiro, onVoteEnquete, send }) {
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
        <button onClick={onBack} className="flex items-center gap-1 font-bold text-sm" style={{ color: PV6.green }}><ChevronLeft className="w-4 h-4" /> Jogos</button>
        <button onClick={() => { if (confirm('Excluir este jogo?')) onDelete(game.id); }} className="text-zinc-500"><Trash2 className="w-4 h-4" /></button>
      </div>
      <div className="px-4 pb-3 space-y-1.5">
        <div className="flex gap-2">
          <Panel color="gold" cutSize={10} className="flex-1" innerStyle={{ padding: '8px 10px', display: 'flex', alignItems: 'center', gap: 6 }}>
            <Calendar className="w-3.5 h-3.5 shrink-0" style={{ color: PV6.green }} />
            <input type="date" value={game.date} onChange={(e) => onUpdate({ date: e.target.value })} className="text-sm font-bold text-zinc-100 bg-transparent outline-none w-full" />
          </Panel>
          <Panel color="gold" cutSize={10} innerStyle={{ padding: '8px 10px', display: 'flex', alignItems: 'center', gap: 6 }}>
            <Clock className="w-3.5 h-3.5 shrink-0" style={{ color: PV6.green }} />
            <input type="time" value={game.horario} onChange={(e) => onUpdate({ horario: e.target.value })} className="text-sm font-bold text-zinc-100 bg-transparent outline-none" />
          </Panel>
        </div>
        <Panel color="gold" cutSize={10} innerStyle={{ padding: '8px 10px', display: 'flex', alignItems: 'center', gap: 6 }}>
          <Users className="w-3.5 h-3.5 shrink-0 text-zinc-500" />
          <input value={game.local} onChange={(e) => onUpdate({ local: e.target.value })} placeholder="Local do jogo" className="text-xs text-zinc-300 bg-transparent outline-none w-full" />
        </Panel>
      </div>

      <div className="flex gap-1.5 px-4 mb-3 overflow-x-auto">
        {[
          { id: 'presenca', label: 'Presença', icon: Check },
          { id: 'times', label: 'Times', icon: Swords },
          { id: 'caixa', label: 'Caixa', icon: DollarSign },
          { id: 'sumula', label: 'Súmula', icon: Award },
        ].map(t => (
          <button key={t.id} onClick={() => setSubTab(t.id)} className="flex items-center justify-center gap-1 px-3 py-2 text-xs font-black shrink-0 transition-all" style={{ borderRadius: 5, ...(subTab === t.id ? { background: `linear-gradient(135deg, ${PV6.green}, ${PV6.greenDark})`, color: '#05100a' } : { background: 'rgba(255,255,255,0.02)', border: '1.5px solid rgba(255,255,255,0.12)', color: '#8b93a0' }) }}>
            <t.icon className="w-3.5 h-3.5" /> {t.label}
          </button>
        ))}
      </div>

      <div className="px-4">
        {subTab === 'presenca' && (
          <div className="animate-[fadein_0.2s_ease-out]">
            <div className="flex items-stretch gap-2 mb-3">
              <StatBox value={confirmados.length} label="Confirmados" color="" />
              <StatBox value={pendentes.length} label="Pendentes" color="" />
              <Panel color="blue" cutSize={10} innerStyle={{ padding: '4px 10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <CircleProgress percent={players.length ? (confirmados.length / players.length) * 100 : 0} />
              </Panel>
            </div>
            <div className="flex gap-2 mb-3">
              <button onClick={msgConvite} className="flex-1 flex items-center justify-center gap-1.5 font-bold py-2.5 text-xs transition-transform active:scale-95" style={{ borderRadius: 5, background: `${PV6.green}18`, color: PV6.green, border: `1.5px solid ${PV6.green}55` }}><MessageCircle className="w-3.5 h-3.5" /> Convite</button>
              <button onClick={msgLembrete} className="flex-1 flex items-center justify-center gap-1.5 font-bold py-2.5 text-xs transition-transform active:scale-95" style={{ borderRadius: 5, background: `${PV6.gold}18`, color: PV6.gold, border: `1.5px solid ${PV6.gold}55` }}><Clock className="w-3.5 h-3.5" /> Lembrete</button>
            </div>
            <div className="space-y-2">
              {players.map(p => {
                const status = game.rsvp[p.id];
                return (
                  <Panel key={p.id} color="gold" cutSize={10} innerStyle={{ padding: 10, display: 'flex', alignItems: 'center', gap: 12 }}>
                    <Avatar player={p} size="sm" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-zinc-100 truncate">{p.name}</p>
                      <p className="text-[10px] text-zinc-500 font-semibold">{p.position === 'goleiro' ? 'Goleiro' : 'Linha'} · OVR {overallOf(p)}</p>
                    </div>
                    <button onClick={() => onRSVP(game.id, p.id, 'sim')} className="w-8 h-8 rounded-full flex items-center justify-center transition-colors" style={status === 'sim' ? { background: PV6.green, color: '#05100a' } : { background: 'rgba(255,255,255,0.06)', color: '#71717a' }}><Check className="w-4 h-4" /></button>
                    <button onClick={() => onRSVP(game.id, p.id, 'nao')} className="w-8 h-8 rounded-full flex items-center justify-center transition-colors" style={status === 'nao' ? { background: '#dc2626', color: '#fff' } : { background: 'rgba(255,255,255,0.06)', color: '#71717a' }}><X className="w-4 h-4" /></button>
                  </Panel>
                );
              })}
              {players.length === 0 && <EmptyState icon={Users} text="Cadastre jogadores na aba Elenco primeiro" />}
            </div>
          </div>
        )}

        {subTab === 'times' && (
          <div className="animate-[fadein_0.2s_ease-out]">
            <button onClick={onSorteio} className="w-full mb-3 flex items-center justify-center gap-2 font-black py-3 text-sm transition-transform active:scale-[0.98]" style={{ borderRadius: 5, background: `linear-gradient(135deg, ${PV6.green}, ${PV6.greenDark})`, color: '#05100a' }}><Shuffle className="w-4 h-4" /> Sortear 3 times (5 linha + 1 gol)</button>
            {confirmados.length > 0 && confirmados.length < 18 && (
              <p className="text-[11px] text-zinc-500 mb-3 text-center">Ideal: 15 de linha + 3 goleiros confirmados. Com o que tiver, o sorteio remaneja.</p>
            )}
            {!game.teams ? (
              <p className="text-center text-sm text-zinc-500 py-10">Confirme presenças e sorteie os times.</p>
            ) : (
              <>
                <button onClick={() => setFormationView(v => !v)} className="text-[11px] font-bold underline mb-3 block" style={{ color: PV6.green }}>
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

        {subTab === 'caixa' && (() => {
          const arrecadado = players.reduce((sum, p) => sum + (Number(game.payments[p.id]) || 0), 0);
          const custoQuadra = Math.round(((Number(game.duracaoMin) || 0) / 30) * (Number(game.valorQuadra30) || 0));
          const sobra = arrecadado - custoQuadra;
          return (
          <div className="animate-[fadein_0.2s_ease-out] space-y-3">
            <div className="flex items-stretch gap-2">
              <StatBox value={`R$ ${arrecadado}`} label="Arrecadado" color="" />
              <StatBox value={devendo.length} label="Pendentes" color="" />
            </div>
            <Panel color="gold" cutSize={10} innerStyle={{ padding: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
              <span className="text-xs font-bold text-zinc-400 uppercase">Valor por pessoa</span>
              <input value={game.valor} onChange={(e) => onUpdate({ valor: e.target.value })} placeholder="R$" className="flex-1 text-right text-sm font-bold text-zinc-100 outline-none bg-transparent" />
            </Panel>
            <button onClick={msgCobranca} className="w-full flex items-center justify-center gap-2 font-bold py-2.5 text-sm transition-transform active:scale-[0.98]" style={{ borderRadius: 5, background: `${PV6.gold}18`, color: PV6.gold, border: `1.5px solid ${PV6.gold}55` }}><MessageCircle className="w-4 h-4" /> Cobrar pendentes no WhatsApp</button>

            <div className="space-y-2">
              {players.map(p => {
                const pago = Number(game.payments[p.id]) || 0;
                const cor = game.valor && pago >= Number(game.valor) ? PV6.green : pago > 0 ? PV6.gold : '#71717a';
                return (
                  <Panel key={p.id} color="gold" cutSize={10} innerStyle={{ padding: 10, display: 'flex', alignItems: 'center', gap: 12 }}>
                    <Avatar player={p} size="sm" />
                    <span className="flex-1 text-sm font-semibold text-zinc-100 truncate">{p.name}</span>
                    <div className="flex items-center gap-1 shrink-0">
                      <span className="text-[11px] text-zinc-500">R$</span>
                      <input type="number" value={game.payments[p.id] ?? ''} onChange={(e) => onPay(game.id, p.id, e.target.value)}
                        className="w-16 bg-transparent text-right text-sm font-black outline-none" style={{ color: cor, border: '1.5px solid rgba(255,255,255,0.14)', borderRadius: 4, padding: '5px 8px' }} placeholder="0" />
                    </div>
                  </Panel>
                );
              })}
              {players.length === 0 && <EmptyState icon={Users} text="Cadastre jogadores na aba Elenco primeiro" />}
            </div>

            <p className="text-xs font-black text-zinc-400 uppercase pt-2 flex items-center gap-1.5"><Wallet className="w-3.5 h-3.5" style={{ color: PV6.gold }} /> Dados da quadra</p>
            <Panel color="gold" cutSize={10} innerStyle={{ padding: 12 }}>
              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="text-[9.5px] font-bold text-zinc-500 uppercase">Valor / 30min</label>
                  <div className="flex items-center gap-1 mt-1" style={{ border: '1.5px solid rgba(255,255,255,0.14)', borderRadius: 4, padding: '7px 8px' }}>
                    <span className="text-xs text-zinc-500">R$</span>
                    <input type="number" value={game.valorQuadra30} onChange={(e) => onUpdate({ valorQuadra30: e.target.value })} placeholder="0" className="w-full bg-transparent text-sm font-bold text-zinc-100 outline-none" />
                  </div>
                </div>
                <div className="flex-1">
                  <label className="text-[9.5px] font-bold text-zinc-500 uppercase">Duração (min)</label>
                  <div className="flex items-center gap-1 mt-1" style={{ border: '1.5px solid rgba(255,255,255,0.14)', borderRadius: 4, padding: '7px 8px' }}>
                    <Clock className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                    <input type="number" value={game.duracaoMin} onChange={(e) => onUpdate({ duracaoMin: e.target.value })} placeholder="60" className="w-full bg-transparent text-sm font-bold text-zinc-100 outline-none" />
                  </div>
                </div>
              </div>
            </Panel>

            {custoQuadra > 0 && (
              <>
                <p className="text-xs font-black text-zinc-400 uppercase pt-1 flex items-center gap-1.5">🧮 Fechamento automático</p>
                <Panel color="green" cutSize={10} innerStyle={{ padding: 14 }}>
                  <div className="flex items-center justify-between py-1 text-[12.5px]"><span className="text-zinc-400">Custo da quadra</span><span className="font-bold text-zinc-100">R$ {custoQuadra}</span></div>
                  <div className="flex items-center justify-between py-1 text-[12.5px]"><span className="text-zinc-400">Arrecadado</span><span className="font-bold text-zinc-100">R$ {arrecadado}</span></div>
                  <div className="h-px my-1.5" style={{ background: 'rgba(255,255,255,0.1)' }} />
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[12.5px] font-black" style={{ color: PV6.gold }}>{sobra >= 0 ? 'SOBRA PRO CAIXA' : 'FALTOU'}</span>
                    <span className="text-2xl font-black" style={{ color: sobra >= 0 ? PV6.green : '#f87171' }}>{sobra >= 0 ? '+' : '−'}R$ {Math.abs(sobra)}</span>
                  </div>
                  {game.caixaLancado ? (
                    <>
                    <p className="text-[11px] text-zinc-500 text-center mt-3 flex items-center justify-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" style={{ color: PV6.green }} /> Já lançado no caixa do grupo</p>
                    {caixaEntry && (
                      <button onClick={() => { if (confirm('Desfazer esse lançamento? Ele vai sumir do extrato e você poderá fechar o caixa dessa pelada de novo.')) onDesfazerCaixa(caixaEntry.id); }} className="w-full mt-2 py-2 text-[11.5px] font-bold flex items-center justify-center gap-1.5" style={{ borderRadius: 5, background: 'rgba(220,38,38,0.08)', color: '#f87171' }}>
                        <Trash2 className="w-3.5 h-3.5" /> Desfazer lançamento
                      </button>
                    )}
                    </>
                  ) : (
                    <button onClick={() => { if (confirm(`Confirmar? Isso vai lançar ${sobra >= 0 ? `+R$ ${sobra}` : `−R$ ${Math.abs(sobra)}`} no caixa do grupo. Dá pra desfazer depois na aba Finanças (excluindo a linha do extrato).`)) onFecharCaixa(sobra); }} className="w-full mt-3 py-2.5 text-[13px] font-black flex items-center justify-center gap-2 transition-transform active:scale-95" style={{ borderRadius: 5, background: `linear-gradient(135deg, ${PV6.green}, ${PV6.greenDark})`, color: '#05100a' }}>
                      <Check className="w-4 h-4" /> Confirmar e mandar pro caixa do grupo
                    </button>
                  )}
                </Panel>
              </>
            )}
          </div>
          );
        })()}


        {subTab === 'sumula' && (
          <div className="space-y-3 animate-[fadein_0.2s_ease-out]">
            {confirmados.length > 0 && !game.mvp && !game.votacaoAberta && (
              <button onClick={onAbrirVotacao} className="w-full flex items-center justify-center gap-2 font-black py-3 text-sm transition-transform active:scale-[0.98]" style={{ borderRadius: 5, background: `linear-gradient(135deg, ${PV6.gold}, ${PV6.goldDark})`, color: '#050608' }}>🏁 Encerrar pelada e abrir votação</button>
            )}
            {game.votacaoAberta && !game.mvp && (
              <div className="space-y-3">
                <Panel color="gold" cutSize={10} innerStyle={{ padding: 12 }}>
                  <p className="text-xs font-bold" style={{ color: PV6.gold }}>📣 Votação aberta! Chama a galera pra votar na aba "Votação" (MVP, melhor goleiro e bola murcha).</p>
                </Panel>
                <button onClick={onApurarVotacao} className="w-full flex items-center justify-center gap-2 font-black py-3 text-sm transition-transform active:scale-[0.98]" style={{ borderRadius: 5, background: `linear-gradient(135deg, ${PV6.green}, ${PV6.greenDark})`, color: '#05100a' }}>✅ Apurar resultado e fechar votação</button>
              </div>
            )}
            {game.mvp && (
              <Panel color="gold" cutSize={10} innerStyle={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div className="flex items-center gap-2">
                  <Star className="w-4 h-4 shrink-0" style={{ color: PV6.gold }} />
                  <span className="text-xs font-bold text-zinc-400">MVP:</span>
                  <span className="text-sm font-bold text-zinc-100">{players.find(p => p.id === game.mvp)?.name}</span>
                </div>
                {game.melhorGoleiroId && (
                  <div className="flex items-center gap-2">
                    <Shield className="w-4 h-4 shrink-0" style={{ color: PV6.blue }} />
                    <span className="text-xs font-bold text-zinc-400">Melhor goleiro:</span>
                    <span className="text-sm font-bold text-zinc-100">{players.find(p => p.id === game.melhorGoleiroId)?.name}</span>
                  </div>
                )}
              </Panel>
            )}
            <button onClick={msgSumula} className="w-full flex items-center justify-center gap-2 font-bold py-2.5 text-sm transition-transform active:scale-[0.98]" style={{ borderRadius: 5, background: `${PV6.green}18`, color: PV6.green, border: `1.5px solid ${PV6.green}55` }}><MessageCircle className="w-4 h-4" /> Mandar súmula no WhatsApp</button>
            {game.mvp && <ZoeiraCard lines={generateZoeiras(game, players)} />}
            {players.map(p => {
              const s = game.stats[p.id] || {};
              const isGk = p.position === 'goleiro';
              return (
                <Panel key={p.id} color={isGk ? 'blue' : 'gold'} cutSize={10} innerStyle={{ padding: 12 }}>
                  <div className="flex items-center gap-2 mb-2">
                    <Avatar player={p} size="sm" />
                    <span className="text-sm font-bold text-zinc-100 flex-1 truncate">{p.name}</span>
                    {isGk && <span className="text-[9px] font-black px-2 py-0.5 rounded-full uppercase" style={{ color: PV6.blue, background: `${PV6.blue}22` }}>Goleiro</span>}
                    {game.mvp === p.id && <Star className="w-4 h-4" style={{ color: PV6.gold }} />}
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
                </Panel>
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
  const colors = ['green', 'blue', 'gold'];
  const color = colors[colorIdx % colors.length];
  return (
    <Panel color={color} cutSize={10} innerStyle={{ padding: 8 }}>
      <p className="text-[11px] font-black uppercase mb-1.5" style={{ color: PV6[color] }}>{title}</p>
      <div className="space-y-1.5">
        {list.map(p => (
          <div key={p.id} className="flex items-center gap-1">
            <Avatar player={p} size="sm" />
            <span className="text-[11px] font-semibold truncate text-zinc-200">{p.name}</span>
          </div>
        ))}
      </div>
    </Panel>
  );
}

function StatField({ label, icon: Icon, value, onChange }) {
  return (
    <div className="flex items-center gap-1 px-1.5 py-1.5" style={{ border: '1px solid rgba(255,255,255,0.1)', borderRadius: 4, background: 'rgba(0,0,0,0.25)' }}>
      <Icon className="w-3 h-3 text-zinc-500 shrink-0" />
      <span className="text-[10px] text-zinc-400 font-medium shrink-0 truncate">{label}</span>
      <input type="number" min="0" value={value ?? ''} onChange={(e) => onChange(e.target.value)} className="w-full text-right text-sm font-bold text-zinc-100 bg-transparent outline-none" placeholder="0" />
    </div>
  );
}

function TechCounter({ icon: Icon, value, label, color }) {
  return (
    <Panel color={color} cutSize={12} className="flex-1" innerStyle={{ padding: '10px 8px', minHeight: 72, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 4 }}>
      <span className="absolute top-0 left-[10%] right-[10%] h-[2px] blur-[1px]" style={{ background: `linear-gradient(90deg, transparent, ${PV6[color]}, transparent)` }} />
      <Icon className="w-4.5 h-4.5" style={{ color: PV6[color], width: 18, height: 18 }} />
      <p className="text-2xl font-black leading-none" style={{ color: PV6[color] }}>{value}</p>
      <p className="text-[9px] font-bold uppercase tracking-widest text-zinc-400">{label}</p>
    </Panel>
  );
}

function ElencoTab({ players, onAdd, onOpenEdit, onApprovePhoto, onRejectPhoto }) {
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
  const pending = players.filter(p => p.fotoPendente);

  return (
    <div className="relative p-3">
      {pending.length > 0 && (
        <Panel color="gold" cutSize={14} className="mb-3.5" innerStyle={{ padding: 12 }}>
          <p className="text-xs font-black uppercase mb-2.5 flex items-center gap-1.5" style={{ color: PV6.gold }}><Camera className="w-3.5 h-3.5" /> Fotos aguardando aprovação ({pending.length})</p>
          <div className="space-y-2">
            {pending.map(p => (
              <div key={p.id} className="flex items-center gap-2.5 rounded-xl p-2" style={{ background: 'rgba(0,0,0,0.35)' }}>
                <img src={p.fotoPendente} alt={p.name} className="w-12 h-12 rounded-full object-cover" style={{ boxShadow: `0 0 0 2px ${PV6.gold}` }} />
                <span className="flex-1 text-sm font-bold text-zinc-100 truncate">{p.name}</span>
                <button onClick={() => onApprovePhoto(p.id)} className="w-8 h-8 rounded-full bg-emerald-600 flex items-center justify-center transition-transform active:scale-90"><Check className="w-4 h-4 text-white" /></button>
                <button onClick={() => onRejectPhoto(p.id)} className="w-8 h-8 rounded-full bg-rose-600 flex items-center justify-center transition-transform active:scale-90"><X className="w-4 h-4 text-white" /></button>
              </div>
            ))}
          </div>
        </Panel>
      )}

      {players.length > 0 && (
        <div className="relative flex gap-2 mb-3.5">
          <TechCounter icon={Users} value={players.length} label="Jogadores" color="green" />
          <TechCounter icon={Footprints} value={linhaCount} label="Linha" color="gold" />
          <TechCounter icon={Shield} value={golCount} label="Goleiros" color="blue" />
        </div>
      )}

      <Panel color="gold" cutSize={18} className="mb-3.5" innerStyle={{ padding: 18 }}>
        <p className="text-[15px] font-black uppercase mb-3.5 tracking-wider flex items-center gap-1.5" style={{ color: PV6.gold }}>
          Adicionar jogador
          <span className="flex gap-[3px] ml-auto">
            <span className="w-2 h-[2px] skew-x-[-25deg]" style={{ background: PV6.gold, opacity: 0.6 }} />
            <span className="w-2 h-[2px] skew-x-[-25deg]" style={{ background: PV6.gold, opacity: 0.6 }} />
            <span className="w-2 h-[2px] skew-x-[-25deg]" style={{ background: PV6.gold, opacity: 0.6 }} />
          </span>
        </p>
        <div className="flex items-center gap-2.5 mb-3.5 px-3.5 py-3" style={{ border: `1.5px solid ${PV6.gold}59`, background: 'rgba(255,255,255,0.02)', borderRadius: 4 }}>
          <User className="w-4 h-4 shrink-0 text-zinc-500" />
          <input value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
            placeholder="Nome do jogador" className="flex-1 bg-transparent text-sm outline-none text-zinc-100 placeholder:text-zinc-500" />
        </div>
        <div className="flex gap-2.5">
          <button onClick={() => setPosition('linha')} className="flex-1 flex items-center justify-center gap-2 py-3 text-[13px] font-black transition-colors" style={{ borderRadius: 5, ...(position === 'linha' ? { background: `linear-gradient(135deg, ${PV6.green}28, ${PV6.green}0d)`, border: `1.5px solid ${PV6.green}`, color: PV6.green, boxShadow: `0 0 14px -2px ${PV6.greenGlow}` } : { background: 'rgba(255,255,255,0.02)', border: '1.5px solid rgba(255,255,255,0.12)', color: '#8b93a0' }) }}>
            <Footprints className="w-4 h-4" /> LINHA
          </button>
          <button onClick={() => setPosition('goleiro')} className="flex-1 flex items-center justify-center gap-2 py-3 text-[13px] font-black transition-colors" style={{ borderRadius: 5, ...(position === 'goleiro' ? { background: `linear-gradient(135deg, ${PV6.blue}28, ${PV6.blue}0d)`, border: `1.5px solid ${PV6.blue}`, color: PV6.blue, boxShadow: `0 0 14px -2px ${PV6.blueGlow}` } : { background: 'rgba(255,255,255,0.02)', border: '1.5px solid rgba(255,255,255,0.12)', color: '#8b93a0' }) }}>
            <Shield className="w-4 h-4" /> GOLEIRO
          </button>
          <button onClick={handleAdd} className="w-14 flex items-center justify-center shrink-0 transition-transform active:scale-90" style={{ borderRadius: 5, background: `linear-gradient(135deg, ${PV6.green}, ${PV6.greenDark})`, boxShadow: `0 0 16px -2px ${PV6.greenGlow}` }}>
            <Plus className="w-5 h-5" style={{ color: '#05100a' }} />
          </button>
        </div>
      </Panel>

      {players.length > 0 && (
        <Panel color="gold" cutSize={14} className="mb-3.5" innerStyle={{ padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
          <Search className="w-4 h-4 shrink-0 text-zinc-500" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar jogador..." className="flex-1 bg-transparent text-sm outline-none text-zinc-100 placeholder:text-zinc-500" />
          <ChevronRight className="w-4 h-4 rotate-90 shrink-0" style={{ color: PV6.gold }} />
        </Panel>
      )}

      <div className="relative space-y-2.5">
        {filtered.map(p => {
          const overall = overallOf(p);
          const isGk = p.position === 'goleiro';
          const posColor = isGk ? 'blue' : 'green';
          return (
            <Panel key={p.id} color={posColor} cutSize={14} className="w-full text-left transition-transform active:scale-[0.98]"
              innerStyle={{ padding: '10px 14px 10px 10px', display: 'flex', alignItems: 'center', gap: 12, minHeight: 74, cursor: 'pointer' }}>
              <div onClick={() => onOpenEdit(p)} className="flex items-center gap-3 w-full">
                <span className="absolute left-0 top-[12%] bottom-[12%] w-[3px] rounded" style={{ background: `linear-gradient(180deg, transparent, ${PV6[posColor]}, transparent)`, boxShadow: `0 0 10px 1px ${PV6[posColor]}` }} />
                <div className="relative shrink-0 w-14 h-14 rounded-full p-[2px]" style={{ background: `conic-gradient(from 180deg, ${PV6[posColor]}, ${PV6[posColor + 'Dark']}, ${PV6[posColor]}, ${PV6[posColor + 'Dark']}, ${PV6[posColor]})` }}>
                  <Avatar player={p} />
                  <span className="absolute -bottom-1 -left-1 w-5 h-5 rounded-full flex items-center justify-center" style={{ background: PV6[posColor + 'Dark'], border: '2px solid #05070c' }}>
                    {isGk ? <Shield className="w-2.5 h-2.5" style={{ color: PV6.blue }} /> : <Footprints className="w-2.5 h-2.5" style={{ color: PV6.green }} />}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[16px] font-black text-white truncate">{p.name}</p>
                  <p className="text-[11.5px] text-zinc-400 mt-0.5">{isGk ? 'Goleiro' : 'Linha'} · #{p.numero}</p>
                  <p className="text-[10px] text-zinc-600 mt-0.5">PIN {p.pin || '----'}</p>
                </div>
                <span className="shrink-0 px-3.5 py-1.5 text-[13px] font-black" style={{ borderRadius: 3, background: `linear-gradient(135deg, ${PV6[posColor + 'Dark']}, ${PV6[posColor + 'Dark']}99)`, border: `1px solid ${PV6[posColor]}`, color: PV6[posColor], boxShadow: `0 0 12px -2px ${PV6[posColor + 'Glow']}`, clipPath: 'polygon(8px 0,100% 0,100% 100%,0 100%,0 8px)' }}>{overall} OVR</span>
                <ChevronRight className="w-4 h-4 shrink-0" style={{ color: PV6.gold, opacity: 0.7 }} />
              </div>
            </Panel>
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
    <button onClick={onClick} className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-black transition-colors" style={{ borderRadius: 5, ...(active ? { background: `linear-gradient(135deg, ${PV6.green}28, ${PV6.green}0d)`, border: `1.5px solid ${PV6.green}`, color: PV6.green, boxShadow: `0 0 12px -2px ${PV6.greenGlow}` } : { background: 'rgba(255,255,255,0.02)', border: '1.5px solid rgba(255,255,255,0.12)', color: '#8b93a0' }) }}>
      <Icon className="w-3.5 h-3.5" /> {label}
    </button>
  );
}

function RankingList({ list, valueKey, unit, onOpenCard, myId, showCrown }) {
  if (list.length === 0) return <p className="text-xs text-zinc-500 text-center py-4">Sem dados ainda.</p>;
  return (
    <Panel color="gold" cutSize={14} innerStyle={{ padding: 0 }} className="animate-[fadein_0.2s_ease-out]">
      <div className="divide-y divide-white/5">
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
    </Panel>
  );
}

function Podium({ top3, onOpenCard, unit = 'pts' }) {
  if (top3.length === 0) return null;
  const [second, first, third] = [top3[1], top3[0], top3[2]];
  const slot = (r, place) => {
    if (!r) return <div className="flex-1" />;
    const heights = { 1: 'h-24', 2: 'h-14', 3: 'h-10' };
    const medalColor = { 1: 'text-amber-400', 2: 'text-slate-300', 3: 'text-orange-400' };
    const barGrad = { 1: 'from-amber-400 to-amber-200', 2: 'from-slate-400 to-slate-200', 3: 'from-orange-400 to-orange-200' };
    return (
      <button onClick={() => onOpenCard?.(r.player)} className="relative flex-1 flex flex-col items-center gap-1.5 transition-transform active:scale-95">
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
        <span className={`font-black text-emerald-400 ${place === 1 ? 'text-base' : 'text-xs'}`}>{r.pts} {unit}</span>
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
    <Panel color="gold" cutSize={14} innerStyle={{ padding: 12 }}>
      <p className="text-xs font-black uppercase mb-2 flex items-center gap-1.5" style={{ color: PV6.gold }}><Sparkles className="w-3.5 h-3.5" /> Resumo da temporada</p>
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
    </Panel>
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
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-40 p-4 animate-[fadein_0.2s_ease-out]" onClick={onClose}>
      <div className="w-full max-w-sm max-h-[90vh] overflow-y-auto animate-[popin_0.22s_ease-out]" onClick={(e) => e.stopPropagation()}>
      <Panel color="gold" cutSize={16} innerStyle={{ padding: 0 }}>
        <div className="p-4">
          <h3 className="font-black text-white mb-3 flex items-center gap-2"><Swords className="w-4 h-4" style={{ color: PV6.green }} /> Comparar jogadores</h3>
          <div className="grid grid-cols-2 gap-2 mb-4">
            <select value={aId} onChange={(e) => setAId(e.target.value)} className="bg-transparent text-xs text-zinc-100 px-2 py-2" style={{ border: '1.5px solid rgba(255,255,255,0.14)', borderRadius: 4 }}>
              <option value="" className="bg-zinc-900">Jogador 1</option>
              {players.map(p => <option key={p.id} value={p.id} className="bg-zinc-900">{p.name}</option>)}
            </select>
            <select value={bId} onChange={(e) => setBId(e.target.value)} className="bg-transparent text-xs text-zinc-100 px-2 py-2" style={{ border: '1.5px solid rgba(255,255,255,0.14)', borderRadius: 4 }}>
              <option value="" className="bg-zinc-900">Jogador 2</option>
              {players.map(p => <option key={p.id} value={p.id} className="bg-zinc-900">{p.name}</option>)}
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
              <button onClick={share} className="w-full mt-4 flex items-center justify-center gap-2 font-black py-3 text-sm transition-transform active:scale-95" style={{ borderRadius: 5, background: `linear-gradient(135deg, ${PV6.green}38, ${PV6.green}0f)`, border: `1.5px solid ${PV6.green}`, color: PV6.green, boxShadow: `0 0 14px -2px ${PV6.greenGlow}` }}>
                <Share2 className="w-4 h-4" /> Compartilhar comparativo
              </button>
            </>
          )}
        </div>
        <button onClick={onClose} className="w-full text-zinc-400 font-bold text-sm py-3" style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>Fechar</button>
      </Panel>
      </div>
    </div>
  );
}

function BolaoCard({ label, icon: Icon, value, onChange, options, placeholder }) {
  return (
    <div>
      <p className="text-xs font-bold text-zinc-400 uppercase mb-1.5 flex items-center gap-1.5"><Icon className="w-3.5 h-3.5" style={{ color: PV6.gold }} /> {label}</p>
      <select value={value} onChange={(e) => onChange(e.target.value)} className="w-full bg-transparent px-3 py-2.5 text-sm text-zinc-100 outline-none" style={{ border: `1.5px solid rgba(255,255,255,0.14)`, borderRadius: 4 }}>
        <option value="" className="bg-zinc-900">{placeholder}</option>
        {options.map(p => <option key={p.id} value={p.id} className="bg-zinc-900">{p.name}</option>)}
      </select>
    </div>
  );
}

function WhoAlreadyBet({ confirmados, palpites }) {
  const apostaram = confirmados.filter(p => palpites?.[p.id]);
  if (confirmados.length === 0) return null;
  return (
    <Panel color="green" cutSize={12} innerStyle={{ padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 10 }}>
      <div className="flex -space-x-2 shrink-0">
        {apostaram.slice(0, 5).map(p => <Avatar key={p.id} player={p} size="sm" />)}
      </div>
      <p className="text-[11px] font-semibold text-zinc-400 flex-1">
        {apostaram.length === 0 ? 'Ninguém apostou ainda — seja o primeiro!' : `${apostaram.length} de ${confirmados.length} já apostaram`}
      </p>
    </Panel>
  );
}

function BolaoResultCard({ game, players }) {
  const res = resolveBolao(game, players);
  if (!res) return null;
  const { categorias } = bolaoPoolResult(game, players);
  const nome = (id) => players.find(p => p.id === id)?.name || '?';
  const nomes = (ids) => ids.map(nome).join(', ');
  const catLine = (label, emoji, resultLabel, catKey) => {
    const cat = categorias[catKey];
    if (!cat || cat.pool === 0) return null;
    return (
      <div key={catKey}>
        <p className="text-xs text-zinc-300">{emoji} {label}: <span className="font-bold text-zinc-100">{resultLabel}</span></p>
        {cat.vencedores.length > 0 ? (
          <p className="text-emerald-400 font-semibold text-[11px] mt-0.5">💰 Bolo de {cat.pool} moedas dividido entre {cat.vencedores.length}: {cat.share} moedas pra {cat.vencedores.map(nome).join(', ')}</p>
        ) : (
          <p className="text-rose-400 font-semibold text-[11px] mt-0.5">😬 Ninguém acertou — {cat.pool} moedas foram pro ralo</p>
        )}
      </div>
    );
  };
  return (
    <Panel color="gold" cutSize={14} innerStyle={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
      <p className="text-[10px] font-black uppercase" style={{ color: PV6.gold }}>🏆 Resultado da pelada de {fmtDate(game.date)}</p>
      {catLine('Artilheiro', '⚽', res.artilheiros.length ? nomes(res.artilheiros) : '-', 'artilheiro')}
      {catLine('MVP', '👑', res.mvp ? nome(res.mvp) : '-', 'mvp')}
      {res.frango && catLine('Levou frango', '🐔', res.frango.length ? nomes(res.frango) : '-', 'frango')}
    </Panel>
  );
}

function BolaoTab({ games, players, myId, onSetPalpite, onOpenCard }) {
  const proximo = React.useMemo(() => {
    const semResultado = games.filter(g => !g.mvp);
    return [...semResultado].sort((a, b) => a.date.localeCompare(b.date))[0] || null;
  }, [games]);

  const ultimoResolvido = React.useMemo(() => {
    const resolvidos = games.filter(g => g.mvp);
    return [...resolvidos].sort((a, b) => b.date.localeCompare(a.date))[0] || null;
  }, [games]);

  const confirmados = proximo ? players.filter(p => proximo.rsvp[p.id] === 'sim') : [];
  const linha = confirmados.filter(p => p.position !== 'goleiro');
  const goleiros = confirmados.filter(p => p.position === 'goleiro');
  const myPalpite = proximo?.palpites?.[myId];

  const [form, setForm] = useState({ artilheiro: '', mvp: '', frango: '' });

  const leaderboard = React.useMemo(() => {
    return players
      .map(p => ({ player: p, moedas: moedasAtuais(p, players, games) }))
      .filter(r => r.moedas > 0)
      .sort((a, b) => b.moedas - a.moedas);
  }, [games, players]);

  const minhasMoedasRaw = myId ? moedasAtuais(players.find(p => p.id === myId) || {}, players, games) : 0;
  const minhasMoedas = useCountUp(Math.max(minhasMoedasRaw, 0), 900);
  const top3 = leaderboard.slice(0, 3).map(r => ({ player: r.player, pts: r.moedas }));
  const resto = leaderboard.slice(3);

  const custoSelecionado = (form.artilheiro ? APOSTA_CUSTO.artilheiro : 0) + (form.mvp ? APOSTA_CUSTO.mvp : 0) + (form.frango ? APOSTA_CUSTO.frango : 0);
  const saldoInsuficiente = custoSelecionado > minhasMoedasRaw;

  const submit = () => {
    if (custoSelecionado === 0 || saldoInsuficiente) return;
    onSetPalpite(proximo.id, myId, form);
  };

  return (
    <div className="p-4 space-y-5">
      {myId && (
        <Panel color="gold" cutSize={16} innerStyle={{ padding: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
          <div className="w-12 h-12 rounded-full flex items-center justify-center shrink-0" style={{ background: `${PV6.gold}22` }}>
            <DollarSign className="w-6 h-6" style={{ color: PV6.gold }} />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-wide" style={{ color: PV6.gold, opacity: 0.85 }}>Suas moedas</p>
            <p className="text-3xl font-black leading-none" style={{ color: PV6.gold }}>{minhasMoedas}</p>
          </div>
        </Panel>
      )}

      {ultimoResolvido && <BolaoResultCard game={ultimoResolvido} players={players} />}

      <div>
        <p className="text-xs font-black text-zinc-400 uppercase mb-2 flex items-center gap-1.5"><Sparkles className="w-3.5 h-3.5" style={{ color: PV6.gold }} /> 🔥 Palpite quente da vez</p>
        {!proximo ? (
          <EmptyState icon={Sparkles} text="Sem jogo aberto pro bolão agora" sub="Assim que tiver um jogo novo, dá pra palpitar aqui" />
        ) : (
          <div className="space-y-2.5">
            <WhoAlreadyBet confirmados={confirmados} palpites={proximo.palpites} />
            {!myId ? (
              <Panel color="gold" cutSize={14} innerStyle={{ padding: 16, textAlign: 'center' }}>
                <p className="text-sm text-zinc-400">Escolha sua identidade (no cadeado 🔒) pra entrar na brincadeira!</p>
              </Panel>
            ) : myPalpite ? (
              <Panel color="gold" cutSize={14} innerStyle={{ padding: 16 }}>
                <p className="text-sm font-bold mb-2" style={{ color: PV6.gold }}>🍀 Aposta feita! Suas moedas já saíram do bolso:</p>
                <div className="text-xs text-zinc-300 space-y-1">
                  {myPalpite.artilheiro && <p>⚽ Artilheiro: <span className="font-bold">{players.find(p => p.id === myPalpite.artilheiro)?.name}</span> <span style={{ color: PV6.gold }}>(-{APOSTA_CUSTO.artilheiro})</span></p>}
                  {myPalpite.mvp && <p>👑 MVP: <span className="font-bold">{players.find(p => p.id === myPalpite.mvp)?.name}</span> <span style={{ color: PV6.gold }}>(-{APOSTA_CUSTO.mvp})</span></p>}
                  {myPalpite.frango && <p>🐔 Leva frango: <span className="font-bold">{players.find(p => p.id === myPalpite.frango)?.name}</span> <span style={{ color: PV6.gold }}>(-{APOSTA_CUSTO.frango})</span></p>}
                </div>
              </Panel>
            ) : minhasMoedasRaw < APOSTA_CUSTO.frango ? (
              <Panel color="blue" cutSize={14} innerStyle={{ padding: 16, textAlign: 'center' }}>
                <p className="text-sm font-bold" style={{ color: '#f87171' }}>😬 Você zerou as moedas!</p>
                <p className="text-xs text-zinc-400 mt-1">Joga a próxima pelada (ou ganha uma votação) pra recuperar e voltar a apostar.</p>
              </Panel>
            ) : (
              <Panel color="gold" cutSize={14} innerStyle={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
                <p className="text-[11px] font-bold" style={{ color: PV6.gold, opacity: 0.85 }}>💰 É aposta de verdade: acerta e leva o bolo de quem errou. Errou, perde a moeda.</p>
                <BolaoCard label={`Quem vai ser o artilheiro? (${APOSTA_CUSTO.artilheiro} moedas)`} icon={Target} value={form.artilheiro} onChange={(v) => setForm(f => ({ ...f, artilheiro: v }))} options={linha} placeholder="Escolher jogador" />
                <BolaoCard label={`Quem vai ser o MVP? (${APOSTA_CUSTO.mvp} moedas)`} icon={Crown} value={form.mvp} onChange={(v) => setForm(f => ({ ...f, mvp: v }))} options={confirmados} placeholder="Escolher jogador" />
                {goleiros.length > 1 && (
                  <BolaoCard label={`Quem vai levar frango? (${APOSTA_CUSTO.frango} moeda) 🐔`} icon={Shield} value={form.frango} onChange={(v) => setForm(f => ({ ...f, frango: v }))} options={goleiros} placeholder="Escolher goleiro" />
                )}
                {custoSelecionado > 0 && (
                  <p className={`text-xs font-bold ${saldoInsuficiente ? 'text-rose-400' : 'text-zinc-400'}`}>
                    Custo total: {custoSelecionado} moedas {saldoInsuficiente && ` — você só tem ${minhasMoedasRaw}`}
                  </p>
                )}
                <button onClick={submit} disabled={custoSelecionado === 0 || saldoInsuficiente} className="w-full font-black text-sm py-3 transition-transform active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed" style={{ borderRadius: 5, background: `linear-gradient(135deg, ${PV6.gold}, ${PV6.goldDark})`, color: '#050608' }}>🔥 Confirmar aposta</button>
              </Panel>
            )}
          </div>
        )}
      </div>

      <div>
        <p className="text-xs font-black text-zinc-400 uppercase mb-2 flex items-center gap-1.5"><DollarSign className="w-3.5 h-3.5" style={{ color: PV6.gold }} /> Ranking de moedas</p>
        {leaderboard.length === 0 ? (
          <EmptyState icon={DollarSign} text="Ninguém ganhou moedas ainda" sub="Elas aparecem aqui conforme os jogos vão acontecendo" />
        ) : (
          <>
            <Podium top3={top3} onOpenCard={onOpenCard} unit="moedas" />
            {resto.length > 0 && <RankingList list={resto.map((r, i) => ({ player: r.player, moedas: r.moedas }))} valueKey="moedas" unit="moedas" onOpenCard={onOpenCard} myId={myId} />}
          </>
        )}
      </div>
    </div>
  );
}

function FinancasTab({ caixa, games, players, isOrganizer, onLancar, onSetPayment, onExcluir }) {
  const [showLancar, setShowLancar] = useState(false);
  const saldo = caixa.reduce((sum, e) => sum + (Number(e.valor) || 0), 0);
  const jogoAtual = games[0] || null;
  const confirmados = jogoAtual ? players.filter(p => jogoAtual.rsvp[p.id] === 'sim') : [];
  const valorCombinado = jogoAtual ? Number(jogoAtual.valor) || 0 : 0;

  return (
    <div className="p-4 space-y-5">
      <Panel color="green" cutSize={16} innerStyle={{ padding: 22, textAlign: 'center' }}>
        <p className="text-[11px] font-black uppercase tracking-widest text-zinc-400">Caixa do grupo</p>
        <p className="text-[40px] font-black leading-none my-1" style={{ color: PV6.green, textShadow: `0 0 20px ${PV6.greenGlow}` }}>R$ {saldo}</p>
        <p className="text-[11px] text-zinc-500">Guardado pra bola, colete, churrasco...</p>
      </Panel>

      {isOrganizer && (
        <button onClick={() => setShowLancar(true)} className="w-full py-3 text-[13px] font-black flex items-center justify-center gap-2 transition-transform active:scale-95" style={{ borderRadius: 5, background: `linear-gradient(135deg, ${PV6.gold}, ${PV6.goldDark})`, color: '#050608' }}>
          <Plus className="w-4 h-4" /> Lançar movimentação
        </button>
      )}

      <div>
        <p className="text-xs font-black text-zinc-400 uppercase mb-2 flex items-center gap-1.5"><Wallet className="w-3.5 h-3.5" style={{ color: PV6.gold }} /> Extrato</p>
        {caixa.length === 0 ? (
          <EmptyState icon={Wallet} text="Nada lançado no caixa ainda" sub="A sobra de cada pelada entra aqui automático" />
        ) : (
          <Panel color="gold" cutSize={14} innerStyle={{ padding: 0 }}>
            <div className="divide-y divide-white/5">
              {caixa.map(e => (
                <div key={e.id} className="flex items-center gap-3 px-3.5 py-2.5">
                  <span className="w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{ background: e.valor >= 0 ? `${PV6.green}22` : 'rgba(248,113,113,0.15)' }}>
                    {e.tipo === 'auto' ? <Trophy className="w-3.5 h-3.5" style={{ color: PV6.green }} /> : e.valor >= 0 ? <ArrowUp className="w-3.5 h-3.5" style={{ color: PV6.green }} /> : <ArrowDown className="w-3.5 h-3.5" style={{ color: '#f87171' }} />}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-[12.5px] font-bold text-zinc-100 truncate">{e.desc}</p>
                    <p className="text-[10px] text-zinc-500 mt-0.5">{e.tipo === 'auto' ? 'Automático' : 'Lançado pelo organizador'}</p>
                  </div>
                  <span className="text-[13px] font-black shrink-0" style={{ color: e.valor >= 0 ? PV6.green : '#f87171' }}>{e.valor >= 0 ? '+' : '−'}R$ {Math.abs(e.valor)}</span>
                  {isOrganizer && (
                    <button onClick={() => { if (confirm(`Excluir "${e.desc}" do extrato? Isso ajusta o saldo do caixa.`)) onExcluir(e.id); }} className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 transition-transform active:scale-90" style={{ background: 'rgba(220,38,38,0.10)' }}>
                      <Trash2 className="w-3.5 h-3.5" style={{ color: '#f87171' }} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </Panel>
        )}
      </div>

      {jogoAtual && confirmados.length > 0 && (
        <div>
          <p className="text-xs font-black text-zinc-400 uppercase mb-2 flex items-center gap-1.5"><DollarSign className="w-3.5 h-3.5" style={{ color: PV6.gold }} /> Pagamentos — Pelada de {fmtDate(jogoAtual.date)}</p>
          <Panel color="gold" cutSize={14} innerStyle={{ padding: 0 }}>
            <div className="divide-y divide-white/5">
              {confirmados.map(p => {
                const pago = Number(jogoAtual.payments[p.id]) || 0;
                const pct = valorCombinado > 0 ? Math.min(100, (pago / valorCombinado) * 100) : 0;
                const cor = pct >= 100 ? PV6.green : pct > 0 ? PV6.gold : '#71717a';
                return (
                  <div key={p.id} className="flex items-center gap-3 px-3.5 py-3">
                    <Avatar player={p} size="sm" />
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-bold text-zinc-100 truncate">{p.name}</p>
                      <div className="h-1 rounded-full mt-1.5" style={{ background: 'rgba(255,255,255,0.08)' }}>
                        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: cor }} />
                      </div>
                    </div>
                    {isOrganizer ? (
                      <div className="flex items-center gap-1 shrink-0">
                        <span className="text-[11px] text-zinc-500">R$</span>
                        <input type="number" value={jogoAtual.payments[p.id] ?? ''} onChange={(e) => onSetPayment(jogoAtual.id, p.id, e.target.value)}
                          className="w-14 bg-transparent text-right text-[13px] font-black outline-none" style={{ color: cor, border: '1.5px solid rgba(255,255,255,0.14)', borderRadius: 4, padding: '4px 6px' }} placeholder="0" />
                      </div>
                    ) : (
                      <div className="text-right shrink-0">
                        <p className="text-[13px] font-black" style={{ color: cor }}>R$ {pago}</p>
                        <p className="text-[10px] text-zinc-500">de R$ {valorCombinado}</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </Panel>
        </div>
      )}

      {showLancar && <LancarMovimentacaoModal onClose={() => setShowLancar(false)} onConfirm={(desc, valor, tipo) => { onLancar(desc, valor, tipo); setShowLancar(false); }} />}
    </div>
  );
}

function LancarMovimentacaoModal({ onClose, onConfirm }) {
  const [tipo, setTipo] = useState('saida');
  const [desc, setDesc] = useState('');
  const [valor, setValor] = useState('');
  const tags = [
    { label: 'Bola', icon: '⚽' }, { label: 'Colete', icon: '🎽' }, { label: 'Churrasco', icon: '🔥' },
    { label: 'Material', icon: '🩹' }, { label: 'Outro', icon: '📦' },
  ];
  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-40 p-6 animate-[fadein_0.2s_ease-out]" onClick={onClose}>
      <div className="w-full max-w-xs" onClick={(e) => e.stopPropagation()}>
        <Panel color="gold" cutSize={18} innerStyle={{ padding: 22 }}>
          <p className="text-[17px] font-black text-center flex items-center justify-center gap-2"><Wallet className="w-4 h-4" style={{ color: PV6.gold }} /> Lançar movimentação</p>
          <p className="text-[11.5px] text-zinc-500 text-center mb-4 mt-1">Registra uma entrada ou saída manual no caixa</p>

          <div className="flex gap-2.5 mb-4">
            <button onClick={() => setTipo('entrada')} className="flex-1 py-2.5 text-[12.5px] font-black flex items-center justify-center gap-1.5" style={{ borderRadius: 5, ...(tipo === 'entrada' ? { background: `${PV6.green}22`, border: `1.5px solid ${PV6.green}`, color: PV6.green } : { background: 'rgba(255,255,255,0.02)', border: '1.5px solid rgba(255,255,255,0.12)', color: '#8b93a0' }) }}>
              <ArrowUp className="w-3.5 h-3.5" /> Entrada
            </button>
            <button onClick={() => setTipo('saida')} className="flex-1 py-2.5 text-[12.5px] font-black flex items-center justify-center gap-1.5" style={{ borderRadius: 5, ...(tipo === 'saida' ? { background: 'rgba(220,38,38,0.12)', border: '1.5px solid #dc2626', color: '#f87171' } : { background: 'rgba(255,255,255,0.02)', border: '1.5px solid rgba(255,255,255,0.12)', color: '#8b93a0' }) }}>
              <ArrowDown className="w-3.5 h-3.5" /> Saída
            </button>
          </div>

          <label className="text-[10.5px] font-bold text-zinc-500 uppercase">Descrição</label>
          <div className="flex items-center gap-2 mt-1.5 mb-3 px-3 py-2.5" style={{ border: '1.5px solid rgba(255,255,255,0.14)', borderRadius: 4 }}>
            <ShoppingCart className="w-4 h-4 text-zinc-500 shrink-0" />
            <input value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Ex: Comprou bola nova" className="flex-1 bg-transparent text-sm text-zinc-100 outline-none placeholder:text-zinc-500" />
          </div>

          <div className="flex gap-1.5 flex-wrap mb-4">
            {tags.map(t => (
              <button key={t.label} onClick={() => setDesc(t.label)} className="text-[10.5px] font-bold px-2.5 py-1.5 rounded-full" style={desc === t.label ? { background: `${PV6.gold}22`, border: `1px solid ${PV6.gold}`, color: PV6.gold } : { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.12)', color: '#c5c9d1' }}>
                {t.icon} {t.label}
              </button>
            ))}
          </div>

          <label className="text-[10.5px] font-bold text-zinc-500 uppercase">Valor</label>
          <div className="flex items-center gap-2 mt-1.5 mb-5 px-3 py-2.5" style={{ border: '1.5px solid rgba(255,255,255,0.14)', borderRadius: 4 }}>
            <span className="text-sm font-bold text-zinc-400">R$</span>
            <input type="number" value={valor} onChange={(e) => setValor(e.target.value)} placeholder="0" className="flex-1 bg-transparent text-sm font-bold text-zinc-100 outline-none" />
          </div>

          <div className="flex gap-2.5">
            <button onClick={onClose} className="flex-1 py-3 text-[13.5px] font-black" style={{ borderRadius: 5, background: 'rgba(255,255,255,0.03)', border: '1.5px solid rgba(255,255,255,0.15)', color: '#c5c9d1' }}>Cancelar</button>
            <button onClick={() => desc && valor && onConfirm(desc, valor, tipo)} className="flex-1 py-3 text-[13.5px] font-black flex items-center justify-center gap-1.5" style={{ borderRadius: 5, background: `linear-gradient(135deg, ${PV6.gold}, ${PV6.goldDark})`, color: '#050608' }}>
              <Check className="w-4 h-4" /> Lançar
            </button>
          </div>
        </Panel>
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
