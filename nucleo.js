/* Núcleo do app: leitura do treino.md, datas, semana A/B, séries, frequência e resumo.
   Sem DOM, para poder ser testado no Node (.contexto/testes.js). */
(function (raiz) {
  'use strict';

  var DIAS = { 'segunda': 1, 'terça': 2, 'quarta': 3, 'quinta': 4, 'sexta': 5, 'sábado': 6, 'domingo': 7 };
  var NOMES_DIA = ['', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'];
  var CURTO_DIA = ['', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];
  var MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro',
    'outubro', 'novembro', 'dezembro'];
  var REGISTROS = { 'carga': 1, 'ajuda': 1, 'tempo': 1, 'nada': 1 };
  var CAMPOS = ['Dose', 'Descanso', 'Registro', 'Imagem', 'Busca', 'Atenção', 'Evolução', 'Se não tiver'];

  function erro(linha, msg) {
    var e = new Error('treino.md, linha ' + linha + ': ' + msg);
    e.linha = linha;
    return e;
  }

  function slug(s) {
    return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
      .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  }

  /* Lê o treino.md. Falha fechada: qualquer linha fora do formato lança erro com o número da linha. */
  function lerTreino(md) {
    // Comentários viram linhas em branco, para a numeração continuar batendo com o arquivo.
    md = md.replace(/<!--[\s\S]*?-->/g, function (m) { return m.replace(/[^\n]/g, ''); });
    var linhas = md.split('\n');
    var t = { titulo: '', whatsapp: '', inicio: null, orientacoes: [], mobilidade: null, dias: {} };
    var secao = null, bloco = null, ex = null, emLista = false;

    function fecharEx(n) {
      if (!ex) return;
      ['Dose', 'Registro', 'Imagem'].forEach(function (c) {
        if (!ex[c]) throw erro(ex.linha, '"' + ex.nome + '" está sem o campo "' + c + ':"');
      });
      if (!ex.passos.length) throw erro(ex.linha, '"' + ex.nome + '" está sem "Como fazer:"');
      ex = null; emLista = false;
    }

    for (var i = 0; i < linhas.length; i++) {
      var n = i + 1, ln = linhas[i].replace(/\s+$/, '');
      if (!ln.trim()) { continue; }
      var m;
      if ((m = ln.match(/^# (.+)$/))) { t.titulo = m[1].trim(); continue; }
      if ((m = ln.match(/^WhatsApp do JP:\s*(.*)$/))) {
        var dig = m[1].replace(/\D/g, '');
        if (m[1].trim() && !/^\d{12,13}$/.test(dig)) throw erro(n, 'WhatsApp do JP precisa ter DDI e DDD, como 55 21 99999-9999');
        t.whatsapp = dig; continue;
      }
      if ((m = ln.match(/^Início: .*?(\d{2})\/(\d{2})\/(\d{4})/))) {
        t.inicio = m[3] + '-' + m[2] + '-' + m[1]; continue;
      }
      if ((m = ln.match(/^## (.+)$/))) {
        fecharEx(n); bloco = null;
        var cab = m[1].trim();
        if (cab === 'Orientações gerais') { secao = { tipo: 'orientacoes' }; continue; }
        var p = cab.split(' — ');
        if (p.length !== 2) throw erro(n, 'título de dia precisa ser "## Dia — Nome", veio "' + cab + '"');
        var chave = p[0].trim().toLowerCase();
        if (chave === 'todos os dias') {
          secao = t.mobilidade = { tipo: 'mobilidade', nome: p[1].trim(), nota: '', blocos: [] };
        } else if (DIAS[chave]) {
          var d = DIAS[chave], nome = p[1].trim(), variante = null, vm = nome.match(/^Perna ([AB])$/);
          if (vm) variante = vm[1];
          secao = { tipo: 'dia', dia: d, nome: nome, variante: variante, nota: '', blocos: [] };
          t.dias[d] = t.dias[d] || {};
          var k = variante || '-';
          if (t.dias[d][k]) throw erro(n, 'dia repetido: "' + cab + '"');
          t.dias[d][k] = secao;
        } else {
          throw erro(n, 'dia desconhecido: "' + p[0] + '"');
        }
        continue;
      }
      if ((m = ln.match(/^### (.+)$/))) {
        fecharEx(n);
        if (!secao || secao.tipo === 'orientacoes') throw erro(n, 'bloco fora de um dia');
        bloco = { nome: m[1].trim(), itens: [] };
        secao.blocos.push(bloco);
        continue;
      }
      if ((m = ln.match(/^#### (.+)$/))) {
        fecharEx(n);
        if (!bloco) throw erro(n, 'exercício fora de um bloco ("### ...")');
        ex = { nome: m[1].trim(), id: slug(m[1]), linha: n, passos: [] };
        bloco.itens.push(ex);
        continue;
      }
      if (secao && secao.tipo === 'orientacoes') {
        if ((m = ln.match(/^- (.+)$/))) { t.orientacoes.push(m[1]); continue; }
        throw erro(n, 'nas orientações, cada item começa com "- "');
      }
      if (ex) {
        if (ln === 'Como fazer:') { emLista = true; continue; }
        if (emLista && (m = ln.match(/^\d+\. (.+)$/))) { ex.passos.push(m[1]); continue; }
        var achou = false;
        for (var c = 0; c < CAMPOS.length; c++) {
          var pref = CAMPOS[c] + ':';
          if (ln.indexOf(pref) === 0) {
            var v = ln.slice(pref.length).trim();
            if (!v) throw erro(n, 'campo "' + pref + '" vazio');
            if (CAMPOS[c] === 'Registro' && !REGISTROS[v]) {
              throw erro(n, 'Registro tem de ser carga, ajuda, tempo ou nada; veio "' + v + '"');
            }
            ex[CAMPOS[c]] = v; achou = true; emLista = false; break;
          }
        }
        if (!achou) throw erro(n, 'linha não reconhecida dentro de "' + ex.nome + '": "' + ln + '"');
        continue;
      }
      if (secao && secao.tipo !== 'orientacoes' && !bloco) { secao.nota += (secao.nota ? ' ' : '') + ln; continue; }
      if (!secao) continue; // texto solto antes do primeiro dia (subtítulo)
      throw erro(n, 'linha fora de lugar: "' + ln + '"');
    }
    fecharEx(linhas.length);
    if (!t.inicio) throw erro(1, 'falta a linha "Início: ... dd/mm/aaaa"');
    if (!t.mobilidade) throw erro(1, 'falta a seção "## Todos os dias — Mobilidade"');
    return t;
  }

  /* ---------- datas (sempre em horário local, formato aaaa-mm-dd) ---------- */
  function iso(d) {
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }
  function data(s) { var p = s.split('-'); return new Date(+p[0], +p[1] - 1, +p[2]); }
  function somaDias(s, n) { var d = data(s); d.setDate(d.getDate() + n); return iso(d); }
  function diaSemana(s) { var w = data(s).getDay(); return w === 0 ? 7 : w; } // 1 = segunda … 7 = domingo
  function segundaDe(s) { return somaDias(s, 1 - diaSemana(s)); }
  function diasEntre(a, b) { return Math.round((data(b) - data(a)) / 864e5); }
  function dataLonga(s) { var d = data(s); return NOMES_DIA[diaSemana(s)] + ', ' + d.getDate() + ' de ' + MESES[d.getMonth()]; }
  function dataCurta(s) { var p = s.split('-'); return p[2] + '/' + p[1]; }

  /* Semana do programa: 0 na semana do início. Antes do início conta como a semana 0. */
  function indiceSemana(t, s) { return Math.max(0, Math.floor(diasEntre(segundaDe(t.inicio), segundaDe(s)) / 7)); }
  function variantePerna(t, s) { return indiceSemana(t, s) % 2 === 0 ? 'A' : 'B'; }

  function sessaoDoDia(t, s) {
    var d = diaSemana(s), o = t.dias[d];
    if (!o) return null;
    return o['-'] || o[variantePerna(t, s)] || null;
  }

  /* Séries a marcar. Semanas 1 e 2: uma a menos em quem tem 3 ou mais (fora a mobilidade). */
  function numSeries(t, ex, s, mobilidade) {
    var m = String(ex.Dose).match(/^(\d+)\s*×/);
    if (!m) return 1;
    var n = +m[1];
    if (!mobilidade && n >= 3 && indiceSemana(t, s) < 2) n -= 1;
    return n;
  }
  function descansoSeg(ex) { var m = String(ex.Descanso || '').match(/(\d+)\s*s/); return m ? +m[1] : 0; }

  /* Tempo do modo guiado: "60 s por lado" → {s:60, lados:2}; "1 × 30–45 s" → {s:30, lados:1}. */
  function tempoGuiado(ex) {
    var d = String(ex.Dose), m;
    if ((m = d.match(/(\d+)\s*s por lado/))) return { s: +m[1], lados: 2 };
    if ((m = d.match(/^(?:\d+\s*×\s*)?(\d+)(?:–\d+)?\s*s$/))) return { s: +m[1], lados: 1 };
    return null;
  }

  /* ---------- frequência ---------- */
  /* Estado de um dia: f feito, x furou, h hoje pendente, c futuro, s fim de semana feito, o fim de semana vazio. */
  function estadoDia(dias, s, hoje, inicio) {
    var fds = diaSemana(s) >= 6, feito = !!dias[s];
    if (fds) return feito ? 's' : 'o';
    if (feito) return 'f';
    if (s < inicio) return 'c';
    if (s === hoje) return 'h';
    return s < hoje ? 'x' : 'c';
  }
  function frequencia(t, dias, hoje) {
    var ini = segundaDe(t.inicio), fim = somaDias(segundaDe(hoje), 6), semanas = [], f = 0, x = 0, e = 0;
    for (var seg = ini; seg <= fim; seg = somaDias(seg, 7)) {
      var linha = [];
      for (var k = 0; k < 7; k++) {
        var s = somaDias(seg, k), st = estadoDia(dias, s, hoje, t.inicio);
        if (st === 'f') f++; if (st === 'x') x++; if (st === 's') e++;
        linha.push({ data: s, estado: st });
      }
      semanas.push(linha);
    }
    return { semanas: semanas, feitos: f, furados: x, extras: e, aproveitamento: f + x ? Math.round(100 * f / (f + x)) : null };
  }

  function idade(nasc, hoje) {
    var a = data(nasc), h = data(hoje), i = h.getFullYear() - a.getFullYear();
    if (h.getMonth() < a.getMonth() || (h.getMonth() === a.getMonth() && h.getDate() < a.getDate())) i--;
    return i;
  }

  /* Último registro antes da data (para "semana passada"). */
  function ultimoAntes(lista, s) {
    var r = null;
    (lista || []).forEach(function (x) { if (x.d < s && (!r || x.d >= r.d)) r = x; });
    return r;
  }

  function num(v) { return String(v).replace('.', ','); }

  function resumo(t, est, hoje) {
    var fq = frequencia(t, est.dias || {}, hoje), L = [];
    L.push('Treino do Bernardo — resumo de ' + dataCurta(hoje));
    L.push('Frequência: ' + fq.feitos + ' feitos, ' + fq.furados + ' furados' +
      (fq.aproveitamento === null ? '' : ', ' + fq.aproveitamento + '% de aproveitamento') +
      (fq.extras ? ', ' + fq.extras + ' extra' + (fq.extras > 1 ? 's' : '') : ''));
    var nomes = {};
    [t.mobilidade].concat(Object.keys(t.dias).reduce(function (a, d) {
      return a.concat(Object.keys(t.dias[d]).map(function (k) { return t.dias[d][k]; }));
    }, [])).forEach(function (se) { se.blocos.forEach(function (b) { b.itens.forEach(function (ex) { nomes[ex.id] = ex; }); }); });
    var reg = est.reg || {}, ids = Object.keys(reg).filter(function (id) { return reg[id].length && nomes[id]; });
    if (ids.length) {
      L.push('Cargas (última vez):');
      ids.forEach(function (id) {
        var l = reg[id][reg[id].length - 1], ex = nomes[id];
        var un = ex.Registro === 'tempo' ? ' s' : ' kg', pre = ex.Registro === 'ajuda' ? 'ajuda ' : '';
        L.push('- ' + ex.nome + ': ' + pre + num(l.v) + un + ' (' + dataCurta(l.d) + ')');
      });
    }
    return L.join('\n');
  }

  var api = {
    lerTreino: lerTreino, slug: slug, iso: iso, somaDias: somaDias, diaSemana: diaSemana, segundaDe: segundaDe,
    dataLonga: dataLonga, dataCurta: dataCurta, indiceSemana: indiceSemana, variantePerna: variantePerna,
    sessaoDoDia: sessaoDoDia, numSeries: numSeries, descansoSeg: descansoSeg, tempoGuiado: tempoGuiado,
    estadoDia: estadoDia, frequencia: frequencia, idade: idade, ultimoAntes: ultimoAntes, resumo: resumo,
    NOMES_DIA: NOMES_DIA, CURTO_DIA: CURTO_DIA
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else raiz.TB = api;
})(this);
