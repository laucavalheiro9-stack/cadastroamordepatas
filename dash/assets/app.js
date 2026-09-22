/* =========================================================================
   AMOR DE PATAS — Dashboard de Marketing
   Lógica de filtros, KPIs, funil de marketing e gráficos (Chart.js)
   ========================================================================= */

(function () {
  "use strict";

  const LEADS = AMOR_DE_PATAS_LEADS; // vindo de assets/data.js
  const TOTAL_N = LEADS.length;

  const root = document.documentElement;
  const cssVar = (name) => getComputedStyle(root).getPropertyValue(name).trim();

  // ---------------------------------------------------------------------
  // Ordem fixa das categorias (para atribuir cores de forma consistente
  // e nunca "ciclar" o significado das cores entre um filtro e outro)
  // ---------------------------------------------------------------------
  const ORIGEM_ORDER = ["Instagram", "Indicação", "Google", "WhatsApp", "TikTok", "Facebook", "Outro"];
  const ESPECIE_ORDER = ["Cachorro", "Gato", "Outro"];
  const INTERESSE_ORDER = ["Roupinhas personalizadas", "Acessórios", "Carteirinha personalizada", "Ainda não identificado", "Presentes para pets"];
  const BAIRRO_ORDER = ["Vila Fátima", "Jardim Presidente Dutra", "Vila Augusta", "Taboão", "Cabuçu", "Cumbica", "Vila Galvão", "Paraventi", "Outros bairros"];

  function seriesColors() {
    return [
      cssVar("--series-1"), cssVar("--series-2"), cssVar("--series-3"), cssVar("--series-4"),
      cssVar("--series-5"), cssVar("--series-6"), cssVar("--series-7"), cssVar("--series-8"),
    ];
  }

  function chartTextColor() { return cssVar("--text-secondary"); }
  function chartGridColor() { return cssVar("--gridline"); }
  function chartInkColor() { return cssVar("--text-primary"); }

  // ---------------------------------------------------------------------
  // Popula os selects de filtro com as opções presentes na base
  // ---------------------------------------------------------------------
  function uniqueSorted(arr, orderRef) {
    const set = Array.from(new Set(arr));
    if (orderRef) {
      set.sort((a, b) => orderRef.indexOf(a) - orderRef.indexOf(b));
    } else {
      set.sort();
    }
    return set;
  }

  function fillSelect(id, values) {
    const el = document.getElementById(id);
    const current = el.value;
    const firstOption = el.querySelector("option");
    el.innerHTML = "";
    el.appendChild(firstOption);
    values.forEach((v) => {
      const opt = document.createElement("option");
      opt.value = v;
      opt.textContent = v;
      el.appendChild(opt);
    });
    if (values.includes(current)) el.value = current;
  }

  fillSelect("fOrigem", uniqueSorted(LEADS.map(l => l.origem), ORIGEM_ORDER));
  fillSelect("fBairro", uniqueSorted(LEADS.map(l => l.bairro), BAIRRO_ORDER));
  fillSelect("fEspecie", uniqueSorted(LEADS.map(l => l.especie), ESPECIE_ORDER));
  fillSelect("fInteresse", uniqueSorted(LEADS.map(l => l.interesse), INTERESSE_ORDER));

  // ---------------------------------------------------------------------
  // Filtro
  // ---------------------------------------------------------------------
  const filterIds = ["fOrigem", "fBairro", "fEspecie", "fInteresse", "fMql", "fConsentimento", "fNovidades", "fMultiPet"];
  const fieldMap = {
    fOrigem: "origem", fBairro: "bairro", fEspecie: "especie", fInteresse: "interesse",
    fMql: "mql", fConsentimento: "consentimento", fNovidades: "aceitaNovidades", fMultiPet: "multiPet",
  };

  function getFilters() {
    const f = {};
    filterIds.forEach((id) => {
      const v = document.getElementById(id).value;
      if (v) f[fieldMap[id]] = v;
    });
    return f;
  }

  function applyFilters(leads, filters) {
    return leads.filter((lead) => Object.entries(filters).every(([k, v]) => lead[k] === v));
  }

  // ---------------------------------------------------------------------
  // Agregações genéricas
  // ---------------------------------------------------------------------
  function countBy(leads, field) {
    const map = new Map();
    leads.forEach((l) => map.set(l[field], (map.get(l[field]) || 0) + 1));
    return map;
  }

  function toOrderedPairs(map, orderRef) {
    const keys = orderRef ? orderRef.filter((k) => map.has(k)) : Array.from(map.keys());
    return keys.map((k) => [k, map.get(k)]);
  }

  /**
   * Agrupa categorias menores em "Outros" quando excedem maxSlots (limite da
   * paleta categórica). Se a base já tiver uma categoria "catch-all" com o
   * mesmo nome do bucket "Outros" (ex.: "Outros bairros"), ela é sempre
   * somada ao bucket agregado em vez de competir por uma vaga no top N —
   * isso evita duas barras com o mesmo rótulo no gráfico.
   */
  function topNPlusOther(pairs, maxSlots, otherLabel) {
    const catchAll = pairs.find((p) => p[0] === otherLabel);
    const named = pairs.filter((p) => p[0] !== otherLabel).sort((a, b) => b[1] - a[1]);

    if (named.length + (catchAll ? 1 : 0) <= maxSlots) return pairs;

    const keepCount = catchAll ? maxSlots - 1 : maxSlots;
    const top = named.slice(0, keepCount);
    const overflow = named.slice(keepCount);
    const overflowSum = overflow.reduce((s, p) => s + p[1], 0) + (catchAll ? catchAll[1] : 0);
    if (overflowSum > 0) top.push([otherLabel, overflowSum]);
    return top;
  }

  // ---------------------------------------------------------------------
  // Formatação
  // ---------------------------------------------------------------------
  const pct = (n, d) => (d === 0 ? "0%" : `${((n / d) * 100).toFixed(1)}%`);
  const fmt = new Intl.NumberFormat("pt-BR");

  // ---------------------------------------------------------------------
  // Charts — instâncias globais para poder destruir/recriar ao filtrar
  // ---------------------------------------------------------------------
  const charts = {};
  const CHART_GRID_ORIGINAL_HTML = document.getElementById("chartGrid").innerHTML;

  if (window.ChartDataLabels) {
    Chart.register(window.ChartDataLabels);
  }
  Chart.defaults.font.family = "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif";
  Chart.defaults.plugins.legend.labels.usePointStyle = true;
  Chart.defaults.plugins.tooltip.padding = 10;
  Chart.defaults.plugins.tooltip.cornerRadius = 8;
  Chart.defaults.plugins.tooltip.titleFont = { weight: "700" };

  function destroyChart(key) {
    if (charts[key]) { charts[key].destroy(); delete charts[key]; }
  }

  function baseScales(extra) {
    return Object.assign({
      x: { ticks: { color: chartTextColor(), font: { size: 11 } }, grid: { color: chartGridColor() }, border: { display: false } },
      y: { ticks: { color: chartTextColor(), font: { size: 11 } }, grid: { display: false }, border: { display: false } },
    }, extra || {});
  }

  function horizontalBar(canvasId, key, labels, data, color, opts) {
    destroyChart(key);
    const ctx = document.getElementById(canvasId).getContext("2d");
    charts[key] = new Chart(ctx, {
      type: "bar",
      data: {
        labels,
        datasets: [{
          label: (opts && opts.datasetLabel) || "Leads",
          data,
          backgroundColor: color,
          borderRadius: 6,
          borderSkipped: false,
          maxBarThickness: 26,
        }],
      },
      options: {
        indexAxis: "y",
        responsive: true,
        maintainAspectRatio: false,
        layout: { padding: { right: 34 } },
        animation: { duration: 500 },
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (c) => ` ${fmt.format(c.parsed.x)} leads (${pct(c.parsed.x, TOTAL_N)})`,
            },
          },
          datalabels: {
            anchor: "end", align: "end", offset: 4, clamp: true, clip: false,
            color: chartInkColor(),
            font: { weight: "700", size: 11 },
            formatter: (v) => fmt.format(v),
          },
        },
        scales: baseScales({
          x: {
            ticks: { color: chartTextColor() },
            grid: { color: chartGridColor() },
            beginAtZero: true,
            suggestedMax: Math.ceil((Math.max(...data, 1) * 1.15) / 10) * 10,
          },
        }),
      },
    });
  }

  function doughnut(canvasId, key, labels, data, colors) {
    destroyChart(key);
    const ctx = document.getElementById(canvasId).getContext("2d");
    charts[key] = new Chart(ctx, {
      type: "doughnut",
      data: { labels, datasets: [{ data, backgroundColor: colors, borderColor: cssVar("--surface-1"), borderWidth: 3 }] },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: "62%",
        animation: { duration: 500 },
        plugins: {
          legend: { position: "bottom", labels: { color: chartTextColor(), font: { size: 11 }, padding: 14 } },
          tooltip: { callbacks: { label: (c) => ` ${c.label}: ${fmt.format(c.parsed)} (${pct(c.parsed, TOTAL_N)})` } },
          datalabels: {
            color: "#fff",
            font: { weight: "800", size: 12 },
            formatter: (v, ctx) => {
              const total = ctx.chart.data.datasets[0].data.reduce((a, b) => a + b, 0);
              return total ? pct(v, total) : "";
            },
          },
        },
      },
    });
  }

  function stackedGroupedBar(canvasId, key, labels, datasets) {
    destroyChart(key);
    const ctx = document.getElementById(canvasId).getContext("2d");
    charts[key] = new Chart(ctx, {
      type: "bar",
      data: { labels, datasets },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 500 },
        plugins: {
          legend: { position: "bottom", labels: { color: chartTextColor(), font: { size: 11 } } },
          tooltip: { mode: "index", intersect: false },
          datalabels: { display: false },
        },
        scales: {
          x: { stacked: true, ticks: { color: chartTextColor(), font: { size: 10 } }, grid: { display: false }, border: { display: false } },
          y: { stacked: true, beginAtZero: true, ticks: { color: chartTextColor() }, grid: { color: chartGridColor() }, border: { display: false } },
        },
      },
    });
  }

  // ---------------------------------------------------------------------
  // Render principal
  // ---------------------------------------------------------------------
  function render() {
    const filters = getFilters();
    const filtered = applyFilters(LEADS, filters);
    const n = filtered.length;
    const colors = seriesColors();

    // ---- contador de filtro ----
    document.getElementById("filteredCount").textContent = fmt.format(n);

    // ---- KPIs ----
    const mqlCount = filtered.filter((l) => l.mql === "Sim").length;
    const consentCount = filtered.filter((l) => l.consentimento === "Sim").length;
    const novidadesCount = filtered.filter((l) => l.aceitaNovidades === "Sim").length;
    const multiPetCount = filtered.filter((l) => l.multiPet === "Sim").length;

    document.getElementById("kpiTotal").textContent = fmt.format(n);
    document.getElementById("kpiTotalSub").textContent = n === TOTAL_N ? "100% da base" : `${pct(n, TOTAL_N)} da base total (${TOTAL_N})`;

    document.getElementById("kpiMql").textContent = fmt.format(mqlCount);
    document.getElementById("kpiMqlSub").textContent = `${pct(mqlCount, n)} da seleção`;

    document.getElementById("kpiConsentimento").textContent = fmt.format(consentCount);
    document.getElementById("kpiConsentimentoSub").textContent = `${pct(consentCount, n)} da seleção`;

    document.getElementById("kpiNovidades").textContent = fmt.format(novidadesCount);
    document.getElementById("kpiNovidadesSub").textContent = `${pct(novidadesCount, n)} da seleção`;

    // ---- Insight banner ----
    const topOrigemPair = toOrderedPairs(countBy(filtered, "origem"), ORIGEM_ORDER).sort((a, b) => b[1] - a[1])[0];
    const topInteressePair = toOrderedPairs(countBy(filtered, "interesse"), INTERESSE_ORDER).sort((a, b) => b[1] - a[1])[0];
    document.getElementById("insightText").textContent = n === 0
      ? "Nenhum lead corresponde aos filtros selecionados. Ajuste os filtros para ver os dados."
      : `${fmt.format(mqlCount)} leads estão classificados como MQL (${pct(mqlCount, n)}); ${fmt.format(multiPetCount)} possuem mais de um pet (${pct(multiPetCount, n)}). ` +
        (topOrigemPair ? `Principal origem: ${topOrigemPair[0]} (${fmt.format(topOrigemPair[1])} leads). ` : "") +
        (topInteressePair ? `Maior interesse inicial: ${topInteressePair[0]}.` : "");

    // ---- Funil (sequencial: total → consentimento → MQL → aceita novidades) ----
    renderFunnel(filtered);

    // ---- Empty state para gráficos ----
    if (n === 0) {
      document.getElementById("chartGrid").innerHTML = `<div class="empty-state" style="grid-column:1/-1">
        <span class="emoji">🐾</span> Nenhum lead encontrado para esta combinação de filtros.</div>`;
      document.getElementById("leadsTableBody").innerHTML = "";
      document.getElementById("tableMoreInfo").textContent = "";
      Object.keys(charts).forEach(destroyChart);
      return;
    } else if (document.getElementById("chartGrid").querySelector(".empty-state")) {
      document.getElementById("chartGrid").innerHTML = CHART_GRID_ORIGINAL_HTML;
      document.querySelectorAll(".chart-toggle-table").forEach((btn) => {
        btn.addEventListener("click", () => {
          const key = btn.dataset.target;
          const wrap = document.getElementById(`table-${key}`);
          const showing = !wrap.classList.contains("d-none");
          wrap.classList.toggle("d-none");
          btn.textContent = showing ? "Ver tabela ▾" : "Ocultar tabela ▴";
        });
      });
    }

    // ---- Gráfico: Origem ----
    const origemPairs = toOrderedPairs(countBy(filtered, "origem"), ORIGEM_ORDER);
    horizontalBar("chartOrigem", "origem", origemPairs.map(p => p[0]), origemPairs.map(p => p[1]), colors[0]);
    renderTable("origem", ["Origem", "Leads", "%"], origemPairs.map(([k, v]) => [k, fmt.format(v), pct(v, n)]));

    // ---- Gráfico: Espécie (doughnut) ----
    const especiePairs = toOrderedPairs(countBy(filtered, "especie"), ESPECIE_ORDER);
    doughnut("chartEspecie", "especie", especiePairs.map(p => p[0]), especiePairs.map(p => p[1]), [colors[0], colors[1], colors[2]]);
    renderTable("especie", ["Espécie", "Leads", "%"], especiePairs.map(([k, v]) => [k, fmt.format(v), pct(v, n)]));

    // ---- Gráfico: Interesse inicial ----
    const interessePairs = toOrderedPairs(countBy(filtered, "interesse"), INTERESSE_ORDER);
    horizontalBar("chartInteresse", "interesse", interessePairs.map(p => p[0]), interessePairs.map(p => p[1]), colors[4]);
    renderTable("interesse", ["Interesse", "Leads", "%"], interessePairs.map(([k, v]) => [k, fmt.format(v), pct(v, n)]));

    // ---- Gráfico: Bairros (top + outros) ----
    const bairroPairsRaw = toOrderedPairs(countBy(filtered, "bairro"), BAIRRO_ORDER);
    const bairroPairs = topNPlusOther(bairroPairsRaw, 7, "Outros bairros").sort((a, b) => b[1] - a[1]);
    horizontalBar("chartBairro", "bairro", bairroPairs.map(p => p[0]), bairroPairs.map(p => p[1]), colors[2]);
    renderTable("bairro", ["Bairro", "Leads", "%"], bairroPairs.map(([k, v]) => [k, fmt.format(v), pct(v, n)]));

    // ---- Gráfico: MQL por origem (empilhado) ----
    const origemLabels = origemPairs.map(p => p[0]);
    const mqlSim = origemLabels.map((o) => filtered.filter((l) => l.origem === o && l.mql === "Sim").length);
    const mqlNao = origemLabels.map((o) => filtered.filter((l) => l.origem === o && l.mql === "Não").length);
    stackedGroupedBar("chartMqlOrigem", "mqlOrigem", origemLabels, [
      { label: "MQL", data: mqlSim, backgroundColor: cssVar("--status-good"), borderRadius: 4, maxBarThickness: 34 },
      { label: "Não MQL", data: mqlNao, backgroundColor: cssVar("--text-muted"), borderRadius: 4, maxBarThickness: 34 },
    ]);
    renderTable("mqlOrigem", ["Origem", "MQL", "Não MQL", "Total"], origemLabels.map((o, i) => [o, fmt.format(mqlSim[i]), fmt.format(mqlNao[i]), fmt.format(mqlSim[i] + mqlNao[i])]));

    // ---- Gráfico: multi-pet (doughnut) ----
    const multiPairs = [["Sim", multiPetCount], ["Não", n - multiPetCount]];
    doughnut("chartMultiPet", "multipet", multiPairs.map(p => p[0]), multiPairs.map(p => p[1]), [cssVar("--brand-gold-500"), cssVar("--text-muted")]);
    renderTable("multipet", ["Possui +1 pet", "Leads", "%"], multiPairs.map(([k, v]) => [k, fmt.format(v), pct(v, n)]));

    // ---- Tabela detalhada de leads ----
    renderLeadsTable(filtered);
  }

  function renderFunnel(filtered) {
    const stageTotal = filtered.length;
    const stageConsent = filtered.filter((l) => l.consentimento === "Sim");
    const stageMql = stageConsent.filter((l) => l.mql === "Sim");
    const stageNovidades = stageMql.filter((l) => l.aceitaNovidades === "Sim");

    const stages = [
      { emoji: "📥", name: "Leads totais", count: stageTotal, ref: stageTotal },
      { emoji: "✅", name: "Consentimento (LGPD)", count: stageConsent.length, ref: stageTotal },
      { emoji: "🔥", name: "MQL qualificado", count: stageMql.length, ref: stageTotal },
      { emoji: "📬", name: "Aceita novidades", count: stageNovidades.length, ref: stageTotal },
    ];

    const wrap = document.getElementById("funnelWrap");
    wrap.innerHTML = "";
    let prevCount = null;
    stages.forEach((s, idx) => {
      const convFromTotal = pct(s.count, stageTotal);
      const dropFromPrev = prevCount === null ? null : prevCount - s.count;

      const stageEl = document.createElement("div");
      stageEl.className = "funnel-stage";
      stageEl.dataset.stage = String(idx);
      stageEl.innerHTML = `
        <div class="funnel-stage-name"><span class="emoji">${s.emoji}</span> ${s.name}</div>
        <div class="funnel-bar-track">
          <div class="funnel-bar-fill" style="width:0%">${fmt.format(s.count)}</div>
        </div>
        <div class="funnel-meta">
          <span class="conv-rate">${convFromTotal}</span>
          do total filtrado
        </div>
      `;
      wrap.appendChild(stageEl);

      if (dropFromPrev !== null && dropFromPrev > 0) {
        const dropEl = document.createElement("div");
        dropEl.className = "funnel-drop";
        dropEl.textContent = `↓ -${fmt.format(dropFromPrev)} leads não avançaram para esta etapa`;
        wrap.appendChild(dropEl);
      }
      prevCount = s.count;
    });

    // anima a largura após inserir no DOM
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const fills = wrap.querySelectorAll(".funnel-bar-fill");
        stages.forEach((s, i) => {
          const widthPct = stageTotal === 0 ? 0 : (s.count / stageTotal) * 100;
          fills[i].style.width = Math.max(widthPct, s.count > 0 ? 8 : 0) + "%";
        });
      });
    });
  }

  function renderTable(key, headers, rows) {
    const el = document.getElementById(`table-${key}`);
    let html = "<table class='chart-table'><thead><tr>" + headers.map((h, i) => `<th${i > 0 ? " class='num'" : ""}>${h}</th>`).join("") + "</tr></thead><tbody>";
    rows.forEach((r) => {
      html += "<tr>" + r.map((c, i) => `<td${i > 0 ? " class='num'" : ""}>${c}</td>`).join("") + "</tr>";
    });
    html += "</tbody></table>";
    el.innerHTML = html;
  }

  function renderLeadsTable(filtered) {
    const body = document.getElementById("leadsTableBody");
    const MAX_ROWS = 60;
    const rows = filtered.slice(0, MAX_ROWS);
    body.innerHTML = rows.map((l) => `
      <tr>
        <td>${l.id}</td>
        <td>${l.origem}</td>
        <td>${l.bairro}</td>
        <td>${l.especie}</td>
        <td>${l.interesse}</td>
        <td>${badge(l.mql)}</td>
        <td>${badge(l.consentimento)}</td>
        <td>${badge(l.aceitaNovidades)}</td>
        <td>${badge(l.multiPet)}</td>
      </tr>
    `).join("");
    const info = document.getElementById("tableMoreInfo");
    info.textContent = filtered.length > MAX_ROWS
      ? `Exibindo as primeiras ${MAX_ROWS} de ${fmt.format(filtered.length)} linhas filtradas.`
      : `Exibindo todas as ${fmt.format(filtered.length)} linhas filtradas.`;
  }

  function badge(v) {
    return `<span class="badge-pill ${v === "Sim" ? "badge-yes" : "badge-no"}">${v === "Sim" ? "✔ Sim" : "✕ Não"}</span>`;
  }

  // ---------------------------------------------------------------------
  // Eventos
  // ---------------------------------------------------------------------
  filterIds.forEach((id) => document.getElementById(id).addEventListener("change", render));

  document.getElementById("btnReset").addEventListener("click", () => {
    filterIds.forEach((id) => (document.getElementById(id).value = ""));
    render();
  });

  document.querySelectorAll(".chart-toggle-table").forEach((btn) => {
    btn.addEventListener("click", () => {
      const key = btn.dataset.target;
      const wrap = document.getElementById(`table-${key}`);
      const showing = !wrap.classList.contains("d-none");
      wrap.classList.toggle("d-none");
      btn.textContent = showing ? "Ver tabela ▾" : "Ocultar tabela ▴";
    });
  });

  document.getElementById("btnTheme").addEventListener("click", (e) => {
    const isDark = root.getAttribute("data-theme") === "dark";
    root.setAttribute("data-theme", isDark ? "light" : "dark");
    e.currentTarget.textContent = isDark ? "🌙 Modo escuro" : "☀️ Modo claro";
    // recria os gráficos para pegar as novas cores de tema
    render();
  });

  document.getElementById("btnFullscreen").addEventListener("click", () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen();
    }
  });

  // Primeira renderização
  render();
})();
