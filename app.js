/* Interface do app. A lógica testável mora em nucleo.js. Dados ficam só no aparelho (localStorage). */
(function () {
  'use strict';
  var TB = window.TB, $app = document.getElementById('app'), $cam = document.getElementById('camada');
  var CHAVE = 'treino-bernardo-v1', FCMAX = 190;
  var IC = {
    ok: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
    no: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round"><path d="M7 7l10 10M17 7L7 17"/></svg>',
    info: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.01"/></svg>',
    x: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>',
    zap: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.2-.4.2-.4.7-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.7 11.8 11.8 0 0 0 4.5 4c1.7.7 2.3.8 3.2.6a2.7 2.7 0 0 0 1.8-1.3 2.2 2.2 0 0 0 .2-1.3c-.1-.1-.3-.2-.5-.3z"/></svg>',
    chev: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M9 5l7 7-7 7"/></svg>',
    voltar: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5l-7 7 7 7"/></svg>'
  };

  /* ---------- estado salvo ---------- */
  function carregar() {
    try { var s = JSON.parse(localStorage.getItem(CHAVE)); if (s && s.v === 1) return s; } catch (e) {}
    return { v: 1, checks: {}, reg: {}, dias: {}, perfil: {}, peso: [] };
  }
  var E = carregar();
  function salvar() { try { localStorage.setItem(CHAVE, JSON.stringify(E)); } catch (e) {} }

  /* "Hoje" pode ser simulado com ?hoje=aaaa-mm-dd, só para teste. */
  var param = new URLSearchParams(location.search).get('hoje');
  function hoje() { return /^\d{4}-\d{2}-\d{2}$/.test(param || '') ? param : TB.iso(new Date()); }

  var T = null, V = { tela: 'hoje', dia: hoje(), abertoMob: false };

  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function md(s) { return esc(s).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>'); }
  function num(v) { return String(v).replace('.', ','); }
  function cap(s) { s = String(s); return s.charAt(0).toUpperCase() + s.slice(1); }
  function img(ex, cls) {
    return '<div class="ph' + (cls ? ' ' + cls : '') + '"><img src="img/' + esc(ex.Imagem) + '.png" alt="" loading="lazy" onerror="this.remove()"></div>';
  }

  /* ---------- marcações ---------- */
  function checks(data, ex, n) {
    var d = E.checks[data] = E.checks[data] || {}, a = d[ex.id] || [];
    while (a.length < n) a.push(false);
    return a.slice(0, n);
  }
  function feitas(data, ex, n) { return checks(data, ex, n).filter(Boolean).length; }
  /* Toque na série k: marca da 1 até a k. Tocar de novo na última marcada desmarca só ela. */
  function marcarSerie(data, ex, n, k) {
    var atual = feitas(data, ex, n), novo = (k === atual) ? k - 1 : k;
    E.checks[data] = E.checks[data] || {};
    E.checks[data][ex.id] = Array.from({ length: n }, function (_, i) { return i < novo; });
    salvar(); return { antes: atual, depois: novo };
  }
  function feito(data, ex, n) { return checks(data, ex, n).every(Boolean); }

  function itensDoDia(data) {
    var s = TB.sessaoDoDia(T, data), out = [];
    T.mobilidade.blocos.forEach(function (b) { b.itens.forEach(function (ex) { out.push({ ex: ex, mob: true }); }); });
    if (s) s.blocos.forEach(function (b) { b.itens.forEach(function (ex) { out.push({ ex: ex, mob: false }); }); });
    return out;
  }
  function progresso(data) {
    var it = itensDoDia(data), f = it.filter(function (x) { return feito(data, x.ex, TB.numSeries(T, x.ex, data, x.mob)); }).length;
    return { feitos: f, total: it.length };
  }

  /* Concluir (ou desfazer) um dia marca (ou desmarca) todos os itens dele. Vale para o botão e para a semana do perfil. */
  function marcarDia(data, feitoDia) {
    if (feitoDia) E.dias[data] = true; else delete E.dias[data];
    E.checks[data] = E.checks[data] || {};
    itensDoDia(data).forEach(function (x) { E.checks[data][x.ex.id] = Array(TB.numSeries(T, x.ex, data, x.mob)).fill(feitoDia); });
    salvar();
  }

  function regDe(id) { return E.reg[id] = E.reg[id] || []; }
  function setReg(id, data, v) {
    var l = regDe(id).filter(function (x) { return x.d !== data; });
    if (v !== '' && !isNaN(+v)) l.push({ d: data, v: +v });
    l.sort(function (a, b) { return a.d < b.d ? -1 : 1; });
    E.reg[id] = l; salvar();
  }

  /* ---------- tela Hoje ---------- */
  function semanaTopo() {
    var seg = TB.segundaDe(V.dia), h = hoje(), out = '';
    for (var k = 0; k < 7; k++) {
      var s = TB.somaDias(seg, k), st = TB.estadoDia(E.dias, s, h, T.inicio), c = 'day';
      if (st === 'f' || st === 's' || st === 'x') c += ' ' + st;
      if (k >= 5) c += ' fds';
      if (s === V.dia) c += ' sel';
      if (s === h) c += ' hoje';
      out += '<button class="' + c + '" data-dia="' + s + '" aria-label="' + TB.dataLonga(s) + '">' + TB.CURTO_DIA[k + 1] + '<i></i></button>';
    }
    return '<nav class="week" aria-label="Semana">' + out + '</nav>';
  }

  function cardEx(ex, data, mob, idx) {
    var n = TB.numSeries(T, ex, data, mob), a = checks(data, ex, n), ok = a.every(Boolean);
    var meta = esc(ex.Dose) + (ex.Descanso ? ' · descanso ' + esc(ex.Descanso) : '');
    var temZona = /tiros|z2|longo/i.test(ex.nome);
    var h = '<div class="card' + (ok ? ' done' : '') + (temZona ? ' pad' : '') + '" data-ex="' + idx + '">';
    h += '<div class="row"><button class="abre" data-abre="' + idx + '">' + img(ex) +
      '<div class="t"><h3>' + esc(ex.nome) + '</h3><p>' + meta + '</p></div></button>' +
      (ok ? '<div class="chk">' + IC.ok + '</div>' : '') + '</div>';
    {
      if (ex.Registro !== 'nada') {
        var hj = (regDe(ex.id).filter(function (x) { return x.d === data; })[0] || {}).v;
        var ant = TB.ultimoAntes(regDe(ex.id), data);
        var rot = { carga: 'Carga', ajuda: 'Ajuda', tempo: 'Tempo' }[ex.Registro], un = ex.Registro === 'tempo' ? 's' : 'kg';
        h += '<div class="log"><label class="field"><small>' + rot + '</small><input inputmode="decimal" data-reg="' + idx + '" value="' +
          (hj === undefined ? '' : num(hj)) + '" aria-label="' + rot + ' em ' + un + '"><em>' + un + '</em></label>' +
          '<p class="last">' + (ant ? 'Última vez: <b>' + num(ant.v) + ' ' + un + '</b>' : 'Primeira vez') +
          (ex.Registro === 'ajuda' ? '<br>Menos ajuda = mais forte' : '') + '</p></div>';
      }
      if (n === 1) {
        h += '<div class="acoes"><span></span><button class="marca' + (ok ? ' ok' : '') + '" data-set="' + idx + ':1" aria-pressed="' + ok + '"><span class="bolinha">' +
          (ok ? IC.ok : '') + '</span>' + (ok ? 'Feito' : 'Marcar como feito') + '</button></div>';
      } else {
        var k = a.filter(Boolean).length;
        h += '<div class="series"><span>Séries</span><div class="pills">';
        for (var i = 1; i <= n; i++) {
          h += '<button class="pill' + (i <= k ? ' ok' : '') + '" data-set="' + idx + ':' + i + '" aria-label="Série ' + i + (i <= k ? ', feita' : '') + '">' + (i <= k ? IC.ok : i) + '</button>';
        }
        h += '</div></div>';
      }
    }
    if (/tiros/i.test(ex.nome)) h += zona([[0, 114, ''], [114, 133, 'Leve ≤133', 'calm'], [133, 162, ''], [162, FCMAX, 'Tiro 162–180', 'hot']], [133, 162]);
    if (/z2/i.test(ex.nome)) h += zona([[100, 114, ''], [114, 133, 'Z2 114–133', 'calm'], [133, FCMAX, '']], [114, 133]);
    if (/longo/i.test(ex.nome)) h += zona([[100, 133, 'Leve, abaixo de 133', 'calm'], [133, FCMAX, '']], [133]);
    return h + '</div>';
  }

  function zona(faixas, marcas) {
    var ini = 100, tot = FCMAX - ini, cols = faixas.map(function (f) { return ((Math.min(f[1], FCMAX) - Math.max(f[0], ini)) / tot * 100).toFixed(1) + '%'; });
    var cor = { calm: 'background:var(--calm-soft);color:var(--calm)', hot: 'background:var(--hot-soft);color:var(--hot)' };
    var h = '<div class="zbar" style="grid-template-columns:' + cols.join(' ') + '">';
    faixas.forEach(function (f) { h += '<div style="' + (cor[f[3]] || 'background:#F1EFEA') + '">' + esc(f[2]) + '</div>'; });
    h += '</div><div class="zticks">';
    marcas.forEach(function (m) { h += '<span style="left:' + ((m - ini) / tot * 100).toFixed(1) + '%">' + m + '</span>'; });
    return h + '<span style="right:0;transform:none">' + FCMAX + ' bpm</span></div>';
  }

  var LISTA = []; // exercícios da tela atual, por índice
  function telaHoje() {
    var d = V.dia, h = hoje(), s = TB.sessaoDoDia(T, d), sem = TB.indiceSemana(T, d) + 1, pr = progresso(d);
    LISTA = [];
    var nomeP = T.titulo.replace(/^Treino d[oa] /, '');
    var html = '<header class="top"><button class="perfil-btn" data-perfil="1" aria-label="Abrir perfil e frequência"><span class="av sm">' +
      esc(nomeP.charAt(0)) + '</span><span class="pt"><b>' + esc(nomeP) + '</b><small>Perfil e frequência</small></span>' + IC.chev + '</button>' +
      '<button class="icon" data-ir="orient" aria-label="Orientações">' + IC.info + '</button></header>' + semanaTopo();
    var nome = s ? s.nome : (TB.diaSemana(d) === 7 ? 'Descanso' : 'Livre');
    html += '<section class="hero"><p class="eyebrow">' + TB.dataLonga(d) + (d === h ? ' · hoje' : '') + ' · semana ' + sem + '</p>' +
      '<h1>' + esc(nome) + '</h1>' + (s && s.nota ? '<p class="nota">' + esc(s.nota.replace(/Vale nas semanas.*$/, '').trim() || '') + '</p>' : '') +
      '<div class="bar"><span style="width:' + Math.round(100 * pr.feitos / pr.total) + '%"></span></div>' +
      '<p class="small">' + pr.feitos + ' de ' + pr.total + ' itens</p></section>';
    if (!s) html += '<section class="sec"><p class="nota" style="padding:0 4px 8px">' +
      (TB.diaSemana(d) === 7 ? 'Domingo é livre. Se quiser, faça a mobilidade. Se treinar, conta como extra.' : 'Sem treino marcado para hoje.') + '</p></section>';

    // Mobilidade
    var mob = T.mobilidade.blocos[0].itens, mf = mob.filter(function (ex) { return feito(d, ex, TB.numSeries(T, ex, d, true)); }).length;
    html += '<section class="sec"><div class="card' + (mf === mob.length ? ' done' : '') + '"><div class="row">' +
      '<div class="t"><h3>1. Mobilidade</h3><p>' + mf + ' de ' + mob.length + ' · ~20 min</p></div>' +
      (mf < mob.length ? '<button class="btn pri sm" data-guia="1">' + (mf ? 'Continuar' : 'Fazer guiada') + '</button>' : '<div class="chk">' + IC.ok + '</div>') + '</div>' +
      '<div class="acoes"><button class="lnk" data-mob="1">' + (V.abertoMob ? 'Fechar lista' : 'Ver a lista') + '</button>' +
      '<button class="marca' + (mf === mob.length ? ' ok' : '') + '" data-mobfeita="1" aria-pressed="' + (mf === mob.length) + '"><span class="bolinha">' +
      (mf === mob.length ? IC.ok : '') + '</span>' + (mf === mob.length ? 'Feita' : 'Marcar como feita') + '</button></div></div>';
    if (V.abertoMob) mob.forEach(function (ex) { LISTA.push({ ex: ex, mob: true }); html += cardEx(ex, d, true, LISTA.length - 1); });
    html += '</section>';

    // Blocos do dia
    if (s) s.blocos.forEach(function (b, bi) {
      var n = b.itens.filter(function (ex) { return feito(d, ex, TB.numSeries(T, ex, d, false)); }).length;
      html += '<section class="sec"><div class="sech"><h2>' + (bi + 2) + '. ' + esc(b.nome) + '</h2><span>' + n + ' de ' + b.itens.length + '</span></div>';
      b.itens.forEach(function (ex) { LISTA.push({ ex: ex, mob: false }); html += cardEx(ex, d, false, LISTA.length - 1); });
      html += '</section>';
    });

    if (d <= h) {
      html += '<div class="concluir">' + (E.dias[d]
        ? '<button class="btn pri full" data-concluir="0" aria-pressed="true"><span class="bola">' + IC.ok + '</span>Treino concluído</button>'
        : '<button class="btn sec2 full" data-concluir="1" aria-pressed="false">Concluir treino</button>') + '</div>';
    }
    $app.innerHTML = html;
  }

  /* ---------- detalhe ---------- */
  function abrirDetalhe(item) {
    var ex = item.ex, l = regDe(ex.id), h = '';
    h += '<div class="scrim" data-fechar="1"></div><div class="sheet" role="dialog" aria-modal="true" aria-label="' + esc(ex.nome) + '">' +
      '<div class="grab"></div><div class="row" style="justify-content:space-between;align-items:flex-start"><h1>' + esc(ex.nome) + '</h1>' +
      '<button class="icon" data-fechar="1" aria-label="Fechar">' + IC.x + '</button></div>' +
      '<div class="chips"><span class="chip">' + esc(ex.Dose) + '</span>' + (ex.Descanso ? '<span class="chip">Descanso ' + esc(ex.Descanso) + '</span>' : '') + '</div>' +
      img(ex, 'big') + '<h2 class="h">Como fazer</h2><ol class="steps">' +
      ex.passos.map(function (p) { return '<li>' + md(p) + '</li>'; }).join('') + '</ol>';
    if (ex['Atenção']) h += '<p class="note">' + md(cap(ex['Atenção'])) + '</p>';
    if (ex['Se não tiver']) h += '<p class="note calm"><b>Se não tiver:</b> ' + md(ex['Se não tiver']) + '</p>';
    if (ex['Evolução']) h += '<h2 class="h">Como evoluir</h2><p class="nota">' + md(cap(ex['Evolução'])) + '</p>';
    if (ex.Registro !== 'nada' && l.length) {
      var un = ex.Registro === 'tempo' ? 's' : 'kg';
      h += '<h2 class="h">Sua evolução</h2><div class="card pad chart">' + grafico(l, un) +
        '<p>' + ({ carga: 'Carga', ajuda: 'Ajuda', tempo: 'Tempo' }[ex.Registro]) + ' em ' + un + ', por dia de treino.' +
        (ex.Registro === 'ajuda' ? ' A linha descendo é progresso.' : '') + '</p></div>';
    }
    var termo = ex.Busca || ex.nome;
    h += '<a class="google" href="https://www.google.com/search?q=' + encodeURIComponent(termo) + '" target="_blank" rel="noopener">' +
      '<span>Ficou em dúvida?<b>Pesquisar "' + esc(termo) + '" no Google</b></span>' + IC.chev + '</a>';
    $cam.innerHTML = h + '</div>';
  }

  function grafico(l, un) {
    var pts = l.slice(-8), W = 300, H = 110, vs = pts.map(function (p) { return p.v; });
    var mn = Math.min.apply(null, vs), mx = Math.max.apply(null, vs); if (mx === mn) { mx += 1; mn -= 1; }
    function X(i) { return pts.length === 1 ? W / 2 : 16 + i * (W - 32) / (pts.length - 1); }
    function Y(v) { return 24 + (mx - v) / (mx - mn) * (H - 52); }
    var poly = pts.map(function (p, i) { return X(i).toFixed(0) + ',' + Y(p.v).toFixed(0); }).join(' ');
    var g = '<svg viewBox="0 0 ' + W + ' ' + H + '" width="100%" role="img" aria-label="Evolução em ' + un + '">' +
      '<polyline points="' + poly + '" fill="none" stroke="#1F6F50" stroke-width="2.5" stroke-linejoin="round"/>';
    pts.forEach(function (p, i) {
      g += '<circle cx="' + X(i).toFixed(0) + '" cy="' + Y(p.v).toFixed(0) + '" r="4" fill="#1F6F50"/>' +
        '<text x="' + X(i).toFixed(0) + '" y="' + (Y(p.v) - 9).toFixed(0) + '" font-size="11" font-weight="700" text-anchor="middle" fill="#4B5751">' + num(p.v) + '</text>' +
        '<text x="' + X(i).toFixed(0) + '" y="' + (H - 4) + '" font-size="10.5" text-anchor="middle" fill="#6B756F">' + TB.dataCurta(p.d) + '</text>';
    });
    return g + '</svg>';
  }

  /* ---------- descanso ---------- */
  var timer = null;
  function descanso(seg) {
    clearInterval(timer);
    var fim = Date.now() + seg * 1000, el = document.getElementById('dock');
    if (!el) { el = document.createElement('div'); el.id = 'dock'; document.body.appendChild(el); }
    function tick() {
      var r = Math.max(0, Math.round((fim - Date.now()) / 1000));
      if (r === 0) {
        clearInterval(timer); bip();
        el.className = 'dock fim';
        el.innerHTML = '<div><div class="lbl">Descanso</div><div class="tm">Pode ir</div></div><div class="db"></div><button class="btn ghost" data-pular="1">Ok</button>';
        setTimeout(function () { if (el.className === 'dock fim') el.remove(); }, 5000);
        return;
      }
      el.className = 'dock';
      el.innerHTML = '<div><div class="lbl">Descanso</div><div class="tm">' + Math.floor(r / 60) + ':' + String(r % 60).padStart(2, '0') + '</div></div>' +
        '<div class="db"><span style="width:' + (100 - 100 * r / seg).toFixed(0) + '%"></span></div><button class="btn ghost" data-pular="1">Pular</button>';
    }
    tick(); timer = setInterval(tick, 250);
  }
  function bip() {
    try { if (navigator.vibrate) navigator.vibrate([200, 100, 200]); } catch (e) {}
    try {
      var c = new (window.AudioContext || window.webkitAudioContext)(), o = c.createOscillator(), g = c.createGain();
      o.frequency.value = 880; g.gain.value = .08; o.connect(g); g.connect(c.destination); o.start(); o.stop(c.currentTime + .25);
    } catch (e) {}
  }

  /* ---------- mobilidade guiada (simples: o tempo ele acompanha no relógio) ---------- */
  var G = null;
  function abrirGuia() {
    var mob = T.mobilidade.blocos[0].itens, d = V.dia, i = 0;
    while (i < mob.length - 1 && feito(d, mob[i], TB.numSeries(T, mob[i], d, true))) i++;
    G = { i: i }; desenharGuia();
  }
  function desenharGuia() {
    var mob = T.mobilidade.blocos[0].itens, ex = mob[G.i], d = V.dia, tempo = TB.tempoGuiado(ex);
    var segs = mob.map(function (m, k) { return '<i class="' + (k === G.i ? 'c' : feito(d, m, TB.numSeries(T, m, d, true)) ? 'd' : '') + '"></i>'; }).join('');
    var h = '<div class="guia" role="dialog" aria-modal="true" aria-label="Mobilidade guiada"><div><div class="gtop"><button class="icon" data-gfechar="1" aria-label="Fechar">' + IC.x + '</button>' +
      '<b style="font-size:14px">Mobilidade · ' + (G.i + 1) + ' de ' + mob.length + '</b><span style="width:44px"></span></div>' +
      '<div class="segs" style="grid-template-columns:repeat(' + mob.length + ',1fr)">' + segs + '</div>' +
      '<div style="padding:0 16px">' + img(ex, 'big') + '</div>' +
      '<div style="padding:16px 20px 0;text-align:center"><h1 style="font-size:24px;letter-spacing:-.4px">' + esc(ex.nome) + '</h1></div>' +
      '<p class="dose-g">' + esc(ex.Dose) + '</p>' +
      (tempo ? '<p class="nota" style="text-align:center;margin:0 20px">Acompanhe o tempo no seu relógio.</p>' : '') +
      '<ol class="steps" style="padding:14px 20px 0">' + ex.passos.map(function (p) { return '<li>' + md(p) + '</li>'; }).join('') + '</ol>';
    if (ex['Atenção']) h += '<p class="note" style="margin:10px 20px 0">' + md(cap(ex['Atenção'])) + '</p>';
    h += '</div><div class="ctrl"><button class="btn sec2" data-g="voltar"' + (G.i === 0 ? ' disabled' : '') + '>Voltar</button>' +
      '<button class="btn pri" data-g="feito">Feito</button><button class="btn sec2" data-g="pular">Pular</button></div></div>';
    $cam.innerHTML = h;
    var g = document.querySelector('.guia'); if (g) g.scrollTop = 0;
  }
  function guiaIr(i) {
    if (i >= T.mobilidade.blocos[0].itens.length) { fecharGuia(); return; }
    G.i = Math.max(0, i); desenharGuia();
  }
  function guiaFeito() {
    var ex = T.mobilidade.blocos[0].itens[G.i], n = TB.numSeries(T, ex, V.dia, true);
    E.checks[V.dia] = E.checks[V.dia] || {}; E.checks[V.dia][ex.id] = Array(n).fill(true); salvar();
    guiaIr(G.i + 1);
  }
  function fecharGuia() { G = null; $cam.innerHTML = ''; render(); }

  /* ---------- perfil ---------- */
  function desenharPerfil() {
    var velha = document.querySelector('.sheet.perfil'), sc = velha ? velha.scrollTop : 0;
    $cam.innerHTML = '<div class="scrim" data-fecharperfil="1"></div><div class="sheet perfil" role="dialog" aria-modal="true" aria-label="Perfil">' +
      '<div class="sheet-top"><div class="grab"></div><div class="row" style="justify-content:space-between"><b style="font-size:17px">Perfil</b>' +
      '<button class="icon" data-fecharperfil="1" aria-label="Fechar">' + IC.x + '</button></div></div>' + telaPerfil() + '</div>';
    var nova = document.querySelector('.sheet.perfil'); if (nova) nova.scrollTop = sc;
    var f = document.getElementById('f-np'); if (f) f.focus();
  }
  function telaPerfil() {
    var h = hoje(), html = '', nomeP = T.titulo.replace(/^Treino d[oa] /, '');
    html += '<div class="id"><div class="av">' + esc(nomeP.charAt(0)) + '</div><div><h1 style="font-size:24px">' + esc(nomeP) +
      '</h1><p class="meta" style="margin:0">Treinando desde ' + TB.dataCurta(T.inicio) + '</p></div></div><section class="sec">';

    // 1) Esta semana (o "Concluir treino" e o toque na bolinha marcam o mesmo registro)
    var seg = TB.segundaDe(h), strip = '';
    for (var k = 0; k < 7; k++) {
      var s = TB.somaDias(seg, k), st = TB.estadoDia(E.dias, s, h, T.inicio);
      if (k >= 5 && st === 'c') st = 'o';
      strip += '<button data-toggle="' + s + '"' + (s > h ? ' disabled' : '') + ' class="' + (s === h ? 'hojec' : '') + '" aria-label="' + TB.dataLonga(s) +
        '"><span>' + TB.CURTO_DIA[k + 1] + '</span><span class="dot ' + st + '">' + (st === 'f' || st === 's' ? IC.ok : st === 'x' ? IC.no : '') +
        '</span><span class="dt">' + +s.slice(8) + '</span></button>';
    }
    html += '<div class="card pad"><div class="wkh"><h2>Esta semana</h2><span>Hoje é ' + TB.NOMES_DIA[TB.diaSemana(h)].toLowerCase() + ', ' +
      TB.dataCurta(h) + '</span></div><div class="strip">' + strip + '</div></div>';

    // 2) Frequência total
    if (h < T.inicio) {
      html += '<div class="sech" style="padding-top:20px"><h2>Frequência total</h2></div><div class="card pad"><p class="nota" style="margin:0">' +
        'A contagem começa na ' + TB.dataLonga(T.inicio).toLowerCase() + '. Dias marcados antes disso aparecem em "Esta semana", mas não entram no total.</p></div>' +
        '<button class="btn pri full" style="margin-top:14px" data-enviar="1">Enviar resumo ao JP</button>';
      return html + '</section>';
    }
    var fq = TB.frequencia(T, E.dias, h), sems = fq.semanas.slice(-8), base = fq.semanas.length - sems.length;
    html += '<div class="sech" style="padding-top:20px"><h2>Frequência total</h2><span>' + fq.semanas.length + ' semana' + (fq.semanas.length > 1 ? 's' : '') +
      (fq.extras ? ' · ' + fq.extras + ' extra' + (fq.extras > 1 ? 's' : '') : '') + '</span></div>' +
      '<div class="card pad"><div class="stats"><div><b>' + fq.feitos + '</b><small>feitos</small></div><div><b style="color:var(--hot)">' + fq.furados +
      '</b><small>furados</small></div><div><b style="color:var(--accent)">' + (fq.aproveitamento === null ? '—' : fq.aproveitamento + '%') + '</b><small>aproveitamento</small></div></div>' +
      '<div class="cal"><span></span>' + TB.CURTO_DIA.slice(1).map(function (x) { return '<span>' + x + '</span>'; }).join('');
    sems.forEach(function (w, i) {
      html += '<span class="wk">Sem ' + (base + i + 1) + '</span>' + w.map(function (c) {
        var st = c.estado; if (TB.diaSemana(c.data) >= 6 && st === 'c') st = 'o';
        return '<span class="dot ' + st + '">' + (st === 'f' || st === 's' ? IC.ok : st === 'x' ? IC.no : '') + '</span>';
      }).join('');
    });
    html += '</div><div class="leg"><span><i class="dot f">' + IC.ok + '</i>Feito</span><span><i class="dot x">' + IC.no + '</i>Furou</span><span><i class="dot s">' +
      IC.ok + '</i>Extra</span><span><i class="dot h"></i>Hoje</span></div></div>' +
      '<button class="btn pri full" style="margin-top:4px" data-enviar="1">Enviar resumo ao JP</button>';

    return html + '</section>';
  }

  function lerNum(v) { return parseFloat(String(v).replace(',', '.')); }

  /* ---------- orientações ---------- */
  function telaOrient() {
    $app.innerHTML = '<div class="back"><button class="icon" data-ir="hoje" aria-label="Voltar">' + IC.voltar + '</button><b>Orientações</b>' +
      (T.whatsapp ? '<a class="zap" href="https://wa.me/' + T.whatsapp + '" target="_blank" rel="noopener">' + IC.zap + 'Falar com o JP</a>' : '') + '</div>' +
      '<section class="sec"><div class="card pad"><ul class="orient">' + T.orientacoes.map(function (o) { return '<li>' + md(o) + '</li>'; }).join('') + '</ul></div></section>';
  }

  function render() {
    if (V.tela === 'orient') telaOrient(); else telaHoje();
    if (V.perfil) desenharPerfil();
  }

  /* ---------- eventos ---------- */
  document.addEventListener('click', function (e) {
    var b = e.target.closest('button,[data-fechar],[data-fecharperfil],summary'); if (!b) return;
    var ds = b.dataset;
    if (ds.ir) { V.tela = ds.ir; render(); scrollTo(0, 0); return; }
    if (ds.dia) { V.dia = ds.dia; render(); return; }
    if (ds.mob) { V.abertoMob = !V.abertoMob; render(); return; }
    if (ds.abre) { abrirDetalhe(LISTA[+ds.abre]); return; }
    if (ds.fechar) { $cam.innerHTML = ''; return; }
    if (ds.perfil) { V.perfil = true; desenharPerfil(); return; }
    if (ds.fecharperfil) { V.perfil = false; V.editPeso = false; $cam.innerHTML = ''; return; }
    if (ds.mobfeita) {
      var mob = T.mobilidade.blocos[0].itens, todos = mob.every(function (x) { return feito(V.dia, x, TB.numSeries(T, x, V.dia, true)); });
      E.checks[V.dia] = E.checks[V.dia] || {};
      mob.forEach(function (x) { E.checks[V.dia][x.id] = Array(TB.numSeries(T, x, V.dia, true)).fill(!todos); });
      salvar(); render(); return;
    }
    if (ds.cancelarpeso) { V.editPeso = false; desenharPerfil(); return; }
    if (ds.set) {
      var p = ds.set.split(':'), it = LISTA[+p[0]], n = TB.numSeries(T, it.ex, V.dia, it.mob), r = marcarSerie(V.dia, it.ex, n, +p[1]);
      var seg = TB.descansoSeg(it.ex);
      if (r.depois > r.antes && r.depois < n && seg && V.dia === hoje()) descanso(seg);
      render(); return;
    }
    if (ds.pular) { clearInterval(timer); var dk = document.getElementById('dock'); if (dk) dk.remove(); return; }
    if (ds.concluir) { marcarDia(V.dia, ds.concluir === '1'); render(); return; }
    if (ds.guia) { abrirGuia(); return; }
    if (ds.gfechar) { fecharGuia(); return; }
    if (ds.g === 'voltar') { guiaIr(G.i - 1); return; }
    if (ds.g === 'pular') { guiaIr(G.i + 1); return; }
    if (ds.g === 'feito') { guiaFeito(); return; }
    if (ds.toggle) { marcarDia(ds.toggle, !E.dias[ds.toggle]); render(); return; }
    if (ds.peso) { V.editPeso = true; desenharPerfil(); return; }
    if (ds.salvarpeso) {
      var v = lerNum(document.getElementById('f-np').value);
      if (!(v > 20 && v < 300)) { alert('Confira o peso: use só números, como 80,5.'); return; }
      var hj = hoje(); E.peso = E.peso.filter(function (x) { return x.d !== hj; }); E.peso.push({ d: hj, kg: v });
      E.peso.sort(function (a, c) { return a.d < c.d ? -1 : 1; }); V.editPeso = false; salvar(); render(); return;
    }
    if (ds.enviar) { location.href = 'https://wa.me/' + (T.whatsapp || '') + '?text=' + encodeURIComponent(TB.resumo(T, E, hoje())); return; }
  });
  document.addEventListener('change', function (e) {
    var i = e.target.dataset && e.target.dataset.reg; if (i === undefined) return;
    var v = lerNum(e.target.value); setReg(LISTA[+i].ex.id, V.dia, isNaN(v) ? '' : v); render();
  });
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape' || !$cam.innerHTML) return;
    if (G) fecharGuia(); else { V.perfil = false; V.editPeso = false; $cam.innerHTML = ''; }
  });

  /* Folha arrastável: puxar para baixo, com o conteúdo no topo, fecha. Vale para toda folha. */
  var arr = null;
  document.addEventListener('touchstart', function (e) {
    var sh = e.target.closest('.sheet'); if (!sh) return;
    var naAlca = !!e.target.closest('.grab,.sheet-top');
    if (sh.scrollTop > 0 && !naAlca) return;
    arr = { sh: sh, y0: e.touches[0].clientY, dy: 0 };
    sh.style.transition = 'none';
  }, { passive: true });
  document.addEventListener('touchmove', function (e) {
    if (!arr) return;
    arr.dy = Math.max(0, e.touches[0].clientY - arr.y0);
    if (arr.dy > 0) { arr.sh.style.transform = 'translateY(' + arr.dy + 'px)'; if (e.cancelable) e.preventDefault(); }
  }, { passive: false });
  document.addEventListener('touchend', function () {
    if (!arr) return;
    var sh = arr.sh, fecha = arr.dy > 110; arr = null;
    sh.style.transition = 'transform .2s ease';
    if (fecha) {
      sh.style.transform = 'translateY(100%)';
      setTimeout(function () { V.perfil = false; V.editPeso = false; $cam.innerHTML = ''; }, 180);
    } else sh.style.transform = '';
  });

  /* ---------- início ---------- */
  fetch('treino.md', { cache: 'no-cache' }).then(function (r) {
    if (!r.ok) throw new Error('não consegui abrir o treino.md (' + r.status + ')');
    return r.text();
  }).then(function (txt) {
    T = TB.lerTreino(txt); render();
  }).catch(function (e) {
    $app.innerHTML = '<div class="erro"><b>O treino não abriu.</b><br>' + esc(e.message) + '<br><br>Se você editou o treino.md, confira essa linha.</div>';
  });
  if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js');
})();
