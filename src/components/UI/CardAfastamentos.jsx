import React, { useMemo } from 'react';

// ─── Regras do Anexo 13A por zona ──────────────────────────────────────────
const REGRAS_ZONA = {
  eixo1:     { frontalAte2: 'alinhamento', frontal3a4: 3.0, frontalAFI: 5.0, latFundAte2: 0, latFundALFI: 2.0, usaAlinhamento: true },
  intensivo: { frontalAte2: 3.0,           frontal3a4: 5.0, frontalAFI: 5.0, latFundAte2: 0, latFundALFI: 2.0, usaAlinhamento: false },
  eixo2:     { frontalAte2: 'alinhamento', frontal3a4: 3.0, frontalAFI: 5.0, latFundAte2: 0, latFundALFI: 2.0, usaAlinhamento: true },
  moderado:  { frontalAte2: 3.0,           frontal3a4: 5.0, frontalAFI: 5.0, latFundAte2: 0, latFundALFI: 2.0, usaAlinhamento: false },
  historica: { frontalAte2: 'alinhamento', frontal3a4: 5.0, frontalAFI: 5.0, latFundAte2: 0, latFundALFI: 2.0, usaAlinhamento: true },
  transicao1:{ frontalAte2: 4.0,           frontal3a4: 5.0, frontalAFI: 5.0, latFundAte2: 0, latFundALFI: 2.0, usaAlinhamento: false },
  transicao2:{ frontalAte2: 10.0,          frontal3a4: 10.0,frontalAFI: null,latFundAte2: 3.0, latFundALFI: null, usaAlinhamento: false },
};

// ─── Cálculo central de afastamentos exigidos ─────────────────────────────
function calcExigidos(zonaKey, numPav) {
  const regra = REGRAS_ZONA[zonaKey];
  if (!regra) return null;

  const n = parseInt(numPav) || 0;

  // TRANSIÇÃO 2 – regra especial
  if (zonaKey === 'transicao2') {
    if (n > 4) return { bloqueio: true, frontal: null, latFund: null };
    if (n >= 3) return { aviso_hotel: true, frontal: 10.0, latFund: 10.0 };
    return { frontal: 10.0, latFund: 3.0 };
  }

  // Até 2 pavimentos
  if (n <= 2) {
    return {
      frontal: regra.frontalAte2, // pode ser 'alinhamento'
      latFund: 0,
    };
  }

  // 3 a 4 pavimentos
  if (n <= 4) {
    return { frontal: regra.frontal3a4, latFund: 2.0 };
  }

  // Acima de 4 – fórmula progressiva
  const AFR  = regra.frontalAFI  + (n - 4) * 0.20;
  const ALFR = regra.latFundALFI + (n - 4) * 0.20;
  return { frontal: AFR, latFund: ALFR, progressivo: true, n };
}

// ─── Componente principal ─────────────────────────────────────────────────
export function CardAfastamentos({
  zonaKey,          // string key de ZONAS_ANEXO13 (vem do card 1)
  numPavimentos,    // string/number (vem do card 1)
  // estados locais — controlados pelo pai
  nsapl, setNsapl,
  esquina, setEsquina,
  adotaAlinhamento, setAdotaAlinhamento,
  frontal1, setFrontal1,
  frontal2, setFrontal2,
  lateral, setLateral,
  fundos, setFundos,
}) {
  const exig = useMemo(() => calcExigidos(zonaKey, numPavimentos), [zonaKey, numPavimentos]);
  const n = parseInt(numPavimentos) || 0;
  const regra = REGRAS_ZONA[zonaKey] || null;
  const usaAlinhamento = regra?.usaAlinhamento && n <= 2;

  // ── Resultado da validação ──
  const resultado = useMemo(() => {
    if (!exig || !zonaKey) return null;
    if (exig.bloqueio) return { status: 'bloqueio' };

    const pF1 = parseFloat(frontal1?.replace(',', '.'));
    const pF2 = parseFloat(frontal2?.replace(',', '.'));
    const pLat = parseFloat(lateral?.replace(',', '.'));
    const pFund = parseFloat(fundos?.replace(',', '.'));

    // Alinhamento predominante adotado (Art. 142)
    if (usaAlinhamento && adotaAlinhamento) return { status: 'condicionado' };

    const frontalExig = exig.frontal;
    const latFundExig = exig.latFund;

    const erros = [];

    // Frontal 1
    if (typeof frontalExig === 'number') {
      if (isNaN(pF1) || pF1 < frontalExig)
        erros.push(`Recuo Frontal (Testada Principal): Exigido ≥ ${frontalExig.toFixed(2)} m | Projetado: ${isNaN(pF1) ? '—' : pF1.toFixed(2)} m`);
    }
    // Frontal 2 (esquina)
    if (esquina === 'sim' && typeof frontalExig === 'number') {
      if (isNaN(pF2) || pF2 < frontalExig)
        erros.push(`Recuo Frontal (Testada Secundária): Exigido ≥ ${frontalExig.toFixed(2)} m | Projetado: ${isNaN(pF2) ? '—' : pF2.toFixed(2)} m`);
    }
    // Lateral
    if (latFundExig > 0) {
      if (isNaN(pLat) || pLat < latFundExig)
        erros.push(`Recuo Lateral: Exigido ≥ ${latFundExig.toFixed(2)} m | Projetado: ${isNaN(pLat) ? '—' : pLat.toFixed(2)} m`);
    }
    // Fundos
    if (latFundExig > 0) {
      if (isNaN(pFund) || pFund < latFundExig)
        erros.push(`Recuo de Fundos: Exigido ≥ ${latFundExig.toFixed(2)} m | Projetado: ${isNaN(pFund) ? '—' : pFund.toFixed(2)} m`);
    }

    if (erros.length > 0) return { status: 'reprovado', erros };
    if (exig.aviso_hotel) return { status: 'hotel' };
    return { status: 'aprovado' };
  }, [exig, zonaKey, frontal1, frontal2, lateral, fundos, esquina, adotaAlinhamento, usaAlinhamento]);

  // ── Helpers de estilo ──
  const toggleBtn = (ativo, cor) => ({
    flex: 1, fontSize: '10px', padding: '4px 6px', fontWeight: '600',
    borderRadius: '4px', border: `1px solid ${ativo ? cor : 'var(--border)'}`,
    background: ativo ? `${cor}22` : 'transparent',
    color: ativo ? cor : 'var(--text2)', cursor: 'pointer',
  });

  const inputStyle = (disabled) => ({
    padding: '4px 8px', fontSize: '12px', borderRadius: '4px',
    border: '1px solid var(--border)', background: disabled ? 'rgba(0,0,0,0.04)' : 'var(--card-bg)',
    color: 'var(--text1)', width: '100%',
  });

  const rowStyle = { display: 'grid', gridTemplateColumns: '170px 1fr', gap: '8px', alignItems: 'center', fontSize: '12px' };

  // ── Rótulo da badge de status do cabeçalho ──
  const headerBadge = nsapl
    ? { label: 'NSAPL', bg: 'rgba(107,114,128,0.12)', border: 'rgba(107,114,128,0.3)', color: '#6b7280' }
    : null;

  // ── Textos de parecer legal ──
  const parecerTexto = () => {
    if (!resultado) return '';
    switch (resultado.status) {
      case 'bloqueio':
        return `O projeto possui ${n} pavimento(s), o que é expressamente PROIBIDO para a Zona de Transição 2. A legislação municipal determina que edificações acima de 04 (quatro) pavimentos não são permitidas nesta zona. Base Legal: Art. 148, Inciso III, da LC nº 034/2022.`;
      case 'hotel':
        return `⚠️ ATENÇÃO: Edificações de 3 a 4 pavimentos na Zona de Transição 2 são permitidas APENAS para equipamentos especiais de hotelaria e resorts (Art. 148, II). Verifique o uso do projeto antes de aprovar.`;
      case 'condicionado':
        return `O afastamento frontal foi validado com base na adoção do alinhamento predominante da face da quadra. Para que a aprovação seja efetivada, é OBRIGATÓRIA a apresentação de Memorial Justificativo Simplificado contendo a planta da quadra com a locação das edificações vizinhas e Levantamento Fotográfico da fachada. Base Legal: Artigo 142, Parágrafo Único, Incisos I e II da LC nº 034/2022.`;
      case 'aprovado':
        return `Os afastamentos do projeto estão em conformidade com os parâmetros estabelecidos pelos Artigos 140 a 149 e Anexo 13A da LC nº 034/2022 para a zona ${zonaKey?.toUpperCase()} com ${n} pavimento(s).`;
      case 'reprovado':
        return `INCONFORMIDADE DETECTADA. Os seguintes afastamentos não atendem ao Plano Diretor (Artigos 140 a 149 e Anexo 13A da LC nº 034/2022):\n\n${resultado.erros.join('\n')}\n\nAção corretiva: Adequar a implantação do projeto para atender aos recuos mínimos exigidos para a zona ${zonaKey?.toUpperCase()} com ${n} pavimento(s).`;
      default: return '';
    }
  };

  // ── Render da badge de resultado ──
  const renderBadge = () => {
    if (!resultado) return null;
    const s = resultado.status;
    let bg, border, color, icon, texto;
    if (s === 'aprovado')     { bg='rgba(34,197,94,0.1)';   border='rgba(34,197,94,0.3)';   color='var(--green)';  icon='✔️'; texto='AFASTAMENTOS EM CONFORMIDADE'; }
    else if (s === 'condicionado') { bg='rgba(245,158,11,0.1)'; border='rgba(245,158,11,0.3)'; color='#d97706'; icon='⚠️'; texto='AFASTAMENTO CONDICIONADO AO ALINHAMENTO PREDOMINANTE'; }
    else if (s === 'hotel')   { bg='rgba(245,158,11,0.1)'; border='rgba(245,158,11,0.3)'; color='#d97706'; icon='⚠️'; texto='USO CONDICIONADO – HOTELARIA/RESORT (Art. 148, II)'; }
    else if (s === 'bloqueio'){ bg='rgba(239,68,68,0.1)';   border='rgba(239,68,68,0.3)';   color='var(--red)';    icon='❌'; texto='INCONFORMIDADE DETECTADA — GABARITO NÃO PERMITIDO'; }
    else                      { bg='rgba(239,68,68,0.1)';   border='rgba(239,68,68,0.3)';   color='var(--red)';    icon='❌'; texto='INCONFORMIDADE DETECTADA'; }

    return (
      <div style={{ padding: '10px 14px', background: bg, border: `1px solid ${border}`, borderRadius: '6px', color, fontWeight: '700', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '8px', marginTop: '12px' }}>
        <span style={{ fontSize: '16px' }}>{icon}</span>
        <span>{texto}</span>
      </div>
    );
  };

  // ── Tabela comparativa ──
  const renderTabela = () => {
    if (!exig || exig.bloqueio || !zonaKey) return null;
    const frontalExig = exig.frontal;
    const latFundExig = exig.latFund;
    const pF1 = parseFloat(frontal1?.replace(',', '.'));
    const pLat = parseFloat(lateral?.replace(',', '.'));
    const pFund = parseFloat(fundos?.replace(',', '.'));

    const linhas = [];
    const cor = (ok) => ok ? 'var(--green)' : 'var(--red)';
    const icone = (ok) => ok ? '✔️' : '❌';

    if (typeof frontalExig === 'number') {
      const ok = !isNaN(pF1) && pF1 >= frontalExig;
      linhas.push({ label: 'Frontal (Testada Principal)', exig: `${frontalExig.toFixed(2)} m`, proj: isNaN(pF1) ? '—' : `${pF1.toFixed(2)} m`, ok });
    } else if (frontalExig === 'alinhamento') {
      linhas.push({ label: 'Frontal', exig: 'Alinhamento predominante (Art. 142)', proj: frontal1 || '—', ok: true, info: true });
    }

    if (esquina === 'sim' && typeof frontalExig === 'number') {
      const pF2v = parseFloat(frontal2?.replace(',', '.'));
      const ok2 = !isNaN(pF2v) && pF2v >= frontalExig;
      linhas.push({ label: 'Frontal (Testada Secundária)', exig: `${frontalExig.toFixed(2)} m`, proj: isNaN(pF2v) ? '—' : `${pF2v.toFixed(2)} m`, ok: ok2 });
    }

    if (latFundExig === 0) {
      linhas.push({ label: 'Lateral / Fundos', exig: '0,00 m (nulo)', proj: '—', ok: true, info: true });
    } else {
      const okLat = !isNaN(pLat) && pLat >= latFundExig;
      const okFund = !isNaN(pFund) && pFund >= latFundExig;
      linhas.push({ label: 'Lateral', exig: `${latFundExig.toFixed(2)} m`, proj: isNaN(pLat) ? '—' : `${pLat.toFixed(2)} m`, ok: okLat });
      linhas.push({ label: 'Fundos', exig: `${latFundExig.toFixed(2)} m`, proj: isNaN(pFund) ? '—' : `${pFund.toFixed(2)} m`, ok: okFund });
    }

    return (
      <div style={{ marginTop: '14px', border: '1px solid var(--border)', borderRadius: '6px', overflow: 'hidden', fontSize: '11px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 32px', background: 'rgba(0,0,0,0.04)', padding: '6px 10px', fontWeight: '600', color: 'var(--text2)' }}>
          <span>Parâmetro</span><span>Exigido (Lei)</span><span>Projetado</span><span></span>
        </div>
        {linhas.map((l, i) => (
          <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 32px', padding: '6px 10px', borderTop: '1px solid var(--border)', background: i % 2 === 0 ? 'transparent' : 'rgba(0,0,0,0.01)' }}>
            <span style={{ color: 'var(--text2)' }}>{l.label}</span>
            <span style={{ color: 'var(--blue)', fontWeight: '500' }}>{l.exig}</span>
            <span style={{ fontWeight: '500' }}>{l.proj}</span>
            <span style={{ textAlign: 'center', color: l.info ? 'var(--text3)' : cor(l.ok) }}>{l.info ? 'ℹ️' : icone(l.ok)}</span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div style={{ marginBottom: '28px' }}>
      {/* ── Cabeçalho do card ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
        <h3 style={{ fontSize: '15px', fontWeight: '600', color: 'var(--text1)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
          📏 5. Análise de Afastamentos{nsapl ? ' - NSAPL' : ''}
          {headerBadge && (
            <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '4px', background: headerBadge.bg, border: `1px solid ${headerBadge.border}`, color: headerBadge.color, fontWeight: '700' }}>
              {headerBadge.label}
            </span>
          )}
        </h3>
        <button
          type="button"
          onClick={() => setNsapl(!nsapl)}
          style={{
            fontSize: '11px', padding: '4px 12px', fontWeight: '700', borderRadius: '4px', cursor: 'pointer',
            border: `1px solid ${nsapl ? '#6b7280' : 'var(--border)'}`,
            background: nsapl ? 'rgba(107,114,128,0.12)' : 'transparent',
            color: nsapl ? '#6b7280' : 'var(--text2)',
          }}
        >
          NSAPL
        </button>
      </div>

      {/* ── Conteúdo do card (desabilitado se NSAPL) ── */}
      <div style={{
        padding: '16px', border: '1px solid var(--border)', borderRadius: '8px',
        background: nsapl ? 'rgba(0,0,0,0.02)' : 'var(--card-bg)',
        opacity: nsapl ? 0.5 : 1, pointerEvents: nsapl ? 'none' : 'auto',
        transition: 'opacity 0.2s',
      }}>

        {/* Zona e Pavimentos — lidos do card 1 */}
        <div style={{ display: 'flex', gap: '12px', marginBottom: '14px', flexWrap: 'wrap' }}>
          <div style={{ fontSize: '11px', padding: '6px 10px', borderRadius: '4px', background: 'var(--body-bg)', border: '1px solid var(--border)', color: 'var(--text2)' }}>
            🗺️ Zona: <strong style={{ color: 'var(--text1)' }}>{zonaKey ? zonaKey.toUpperCase() : '—'}</strong>
          </div>
          <div style={{ fontSize: '11px', padding: '6px 10px', borderRadius: '4px', background: 'var(--body-bg)', border: '1px solid var(--border)', color: 'var(--text2)' }}>
            🏢 Pavimentos: <strong style={{ color: 'var(--text1)' }}>{numPavimentos || '—'}</strong>
          </div>
          {!zonaKey && (
            <div style={{ fontSize: '11px', padding: '6px 10px', borderRadius: '4px', background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.3)', color: '#d97706' }}>
              ⚠️ Selecione a Zona e Pavimentos no Card 1
            </div>
          )}
        </div>

        {/* HARD BLOCK — Transição 2 > 4 pav */}
        {exig?.bloqueio && (
          <div style={{ padding: '12px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '6px', color: 'var(--red)', fontSize: '12px', fontWeight: '600', marginBottom: '12px' }}>
            🚫 GABARITO PROIBIDO — {n} pavimentos na Zona Transição 2 ultrapassam o limite legal de 04 pavimentos (Art. 148, III, LC 034/2022). Nenhum afastamento será calculado.
          </div>
        )}

        {!exig?.bloqueio && (
          <>
            {/* ── Lote de Esquina ── */}
            <div style={{ marginBottom: '12px' }}>
              <span style={{ display: 'block', fontSize: '12px', fontWeight: '500', marginBottom: '6px', color: 'var(--text2)' }}>Lote de Esquina?</span>
              <div style={{ display: 'flex', gap: '6px' }}>
                {[{v:'sim',l:'SIM',c:'var(--green)'},{v:'nao',l:'NÃO',c:'var(--blue)'},{v:'nsapl',l:'NSAPL',c:'var(--text2)'}].map(opt => (
                  <button key={opt.v} type="button" onClick={() => setEsquina(opt.v)} style={toggleBtn(esquina === opt.v, opt.c)}>
                    {opt.l}
                  </button>
                ))}
              </div>
            </div>

            {/* ── Toggle Alinhamento Predominante (Art.142) ── */}
            {usaAlinhamento && (
              <div style={{ marginBottom: '12px', padding: '10px', background: 'rgba(59,130,246,0.05)', border: '1px solid rgba(59,130,246,0.2)', borderRadius: '6px', fontSize: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
                  <span style={{ color: 'var(--text2)', lineHeight: '1.4' }}>
                    Deseja adotar o <strong>Alinhamento Predominante da via</strong> (Art. 142)?
                  </span>
                  <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                    {[{v:true,l:'SIM',c:'#d97706'},{v:false,l:'NÃO',c:'var(--blue)'}].map(opt => (
                      <button key={String(opt.v)} type="button" onClick={() => setAdotaAlinhamento(opt.v)} style={toggleBtn(adotaAlinhamento === opt.v, opt.c)}>
                        {opt.l}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ── Inputs de recuos ── */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '4px' }}>

              {/* Frontal 1 */}
              <div style={rowStyle}>
                <span>Recuo Frontal{esquina === 'sim' ? ' — Testada Principal' : ''} (m):</span>
                <input
                  type="number" step="0.01" min="0"
                  value={frontal1}
                  onChange={e => setFrontal1(e.target.value)}
                  placeholder={exig?.frontal === 'alinhamento' ? 'Alinhamento da via...' : `Mín. ${typeof exig?.frontal === 'number' ? exig.frontal.toFixed(2) : '—'} m`}
                  style={inputStyle(false)}
                />
              </div>

              {/* Frontal 2 — só se esquina = sim */}
              {esquina === 'sim' && (
                <div style={rowStyle}>
                  <span>Recuo Frontal — Testada Secundária (m):</span>
                  <input
                    type="number" step="0.01" min="0"
                    value={frontal2}
                    onChange={e => setFrontal2(e.target.value)}
                    placeholder={typeof exig?.frontal === 'number' ? `Mín. ${exig.frontal.toFixed(2)} m` : ''}
                    style={inputStyle(false)}
                  />
                </div>
              )}

              {/* Lateral */}
              <div style={rowStyle}>
                <span>Recuo Lateral Projetado (m):</span>
                <input
                  type="number" step="0.01" min="0"
                  value={lateral}
                  onChange={e => setLateral(e.target.value)}
                  placeholder={exig?.latFund === 0 ? 'Nulo (0,00 m)' : `Mín. ${exig?.latFund?.toFixed(2) ?? '—'} m`}
                  style={inputStyle(false)}
                />
              </div>

              {/* Fundos */}
              <div style={rowStyle}>
                <span>Recuo de Fundos Projetado (m):</span>
                <input
                  type="number" step="0.01" min="0"
                  value={fundos}
                  onChange={e => setFundos(e.target.value)}
                  placeholder={exig?.latFund === 0 ? 'Nulo (0,00 m)' : `Mín. ${exig?.latFund?.toFixed(2) ?? '—'} m`}
                  style={inputStyle(false)}
                />
              </div>
            </div>

            {/* ── Tabela comparativa ── */}
            {renderTabela()}

            {/* ── Badge de resultado ── */}
            {renderBadge()}

            {/* ── Parecer legal ── */}
            {resultado && (
              <div style={{ marginTop: '10px' }}>
                <label style={{ fontSize: '11px', color: 'var(--text3)', fontWeight: '600', display: 'block', marginBottom: '4px' }}>
                  📋 Parecer Legal Automatizado (Art. 140–149 e Anexo 13A — LC 034/2022):
                </label>
                <textarea
                  readOnly
                  value={parecerTexto()}
                  rows={5}
                  style={{
                    width: '100%', fontSize: '11px', lineHeight: '1.6', padding: '8px 10px',
                    border: '1px solid var(--border)', borderRadius: '6px', resize: 'vertical',
                    background: 'rgba(0,0,0,0.02)', color: 'var(--text1)', fontFamily: 'inherit',
                  }}
                />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
