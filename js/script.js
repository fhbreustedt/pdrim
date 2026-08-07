// Adiciona um efeito de entrada suave nos cards ao carregar a página
document.addEventListener('DOMContentLoaded', () => {
    const cards = document.querySelectorAll('.card');
    
    cards.forEach((card, index) => {
        card.style.opacity = '0';
        card.style.transition = 'opacity 0.5s ease-in-out';
        
        setTimeout(() => {
            card.style.opacity = '1';
        }, index * 150); // Faz os cards aparecerem um por um
    });

    checkInitiativeState();
    injectEvaluationButtons();
});

function checkInitiativeState() {
    let hasData = false;
    let initiativeName = '';

    PDRIM_KEYS.forEach((key, index) => {
        const data = localStorage.getItem(key);
        if (data && data !== '[]' && data !== '{}') {
            if (index === 0) {
                try { const parsed = JSON.parse(data); if (parsed.processName || parsed.sec1?.length > 0 || parsed.sec2?.length > 0) hasData = true; if(parsed.processName) initiativeName = parsed.processName; } catch(e) {}
            } else if (index === 2) {
                if (data !== '[]') hasData = true;
            } else {
                hasData = true;
            }
        }
    });

    if (hasData) {
        const btnExp = document.getElementById('btn-export-init'); if(btnExp) btnExp.style.display = 'inline-block';
        const btnPdf = document.getElementById('btn-pdf-init'); if(btnPdf) btnPdf.style.display = 'inline-block';
        const btnZer = document.getElementById('btn-zerar-init'); if(btnZer) btnZer.style.display = 'inline-block';
    } else {
        const btnExp = document.getElementById('btn-export-init'); if(btnExp) btnExp.style.display = 'none';
        const btnPdf = document.getElementById('btn-pdf-init'); if(btnPdf) btnPdf.style.display = 'none';
        const btnZer = document.getElementById('btn-zerar-init'); if(btnZer) btnZer.style.display = 'none';
        const headerName = document.getElementById('header-initiative-name'); if(headerName) headerName.style.display = 'none';
    }
    
    if (initiativeName) {
        const headerName = document.getElementById('header-initiative-name');
        const headerText = document.getElementById('header-initiative-text');
        if (headerName && headerText) { headerText.innerText = initiativeName; headerName.style.display = 'block'; }
    }
}

// ==========================================
// FUNÇÕES GLOBAIS DA INICIATIVA (INDEX)
// ==========================================

const PDRIM_KEYS = ['pdrim_prep_v10_9', 'pdrim_desc_v10_9', 'pdrim_rac_v10_9', 'pdrim_imp_v10_9', 'pdrim_mon_v10_9'];

const EVAL_QUESTIONS = [
    { id: 1, etapa: 'PREPARAR', persp: 'REQ', dim: 'EFT', text: 'Foram declarados objetivos claros de melhoria de eficiência e mitigação de riscos.' },
    { id: 2, etapa: 'DESCOBRIR', persp: 'REQ', dim: 'EFT', text: 'O mapa do processo atual sinaliza visualmente a localização dos riscos.' },
    { id: 3, etapa: 'RACION.', persp: 'REQ', dim: 'EFT', text: 'O novo desenho integra os controles de risco diretamente no fluxo de trabalho.' },
    { id: 4, etapa: 'IMPLEMENT.', persp: 'REQ', dim: 'EFT', text: 'As ações de tratamento modificam o fluxo para eliminar a causa-raiz do risco.' },
    { id: 5, etapa: 'MONITOR.', persp: 'REQ', dim: 'EFT', text: 'Foram definidos indicadores formais para monitorar eficiência (KPIs) e riscos (KRIs).' },
    { id: 6, etapa: 'PREPARAR', persp: 'UTIL', dim: 'EFT', text: 'Os membros da equipe possuem conhecimentos em processos e em riscos.' },
    { id: 7, etapa: 'DESCOBRIR', persp: 'UTIL', dim: 'EFT', text: 'O diagnóstico aponta desperdícios (atividades sem valor) junto com a identificação de riscos.' },
    { id: 8, etapa: 'RACION.', persp: 'UTIL', dim: 'EFT', text: 'O plano de implementação prevê a eliminação de atividades identificadas como desperdício.' },
    { id: 9, etapa: 'IMPLEMENT.', persp: 'UTIL', dim: 'EFT', text: 'Os controles propostos são viáveis considerando os recursos e prazos da instituição.' },
    { id: 10, etapa: 'MONITOR.', persp: 'UTIL', dim: 'EFT', text: 'Os indicadores (KPIs e KRIs) são apresentados em painel integrado para análise conjunta de desempenho e risco.' },
    { id: 11, etapa: 'PREPARAR', persp: 'REQ', dim: 'FUC', text: 'Foram realizadas dinâmicas participativas para levantar as necessidades reais dos envolvidos.' },
    { id: 12, etapa: 'DESCOBRIR', persp: 'REQ', dim: 'FUC', text: 'O mapeamento atual foi construído em oficinas colaborativas com os executores.' },
    { id: 13, etapa: 'RACION.', persp: 'REQ', dim: 'FUC', text: 'A identificação de riscos usa elementos visuais (cores/ícones) para rápida leitura da criticidade.' },
    { id: 14, etapa: 'IMPLEMENT.', persp: 'REQ', dim: 'FUC', text: 'Os manuais são orientados à tarefa e usam linguagem simples (livre de tecnicismo).' },
    { id: 15, etapa: 'MONITOR.', persp: 'REQ', dim: 'FUC', text: 'Existem canais simples para os usuários reportarem dificuldades na execução.' },
    { id: 16, etapa: 'PREPARAR', persp: 'UTIL', dim: 'FUC', text: 'O escopo e objetivos foram apresentados de forma visual (ex: Canvas) para fácil entendimento.' },
    { id: 17, etapa: 'DESCOBRIR', persp: 'UTIL', dim: 'FUC', text: 'O desenho do processo usa uma linguagem acessível para servidores sem formação técnica em processos.' },
    { id: 18, etapa: 'RACION.', persp: 'UTIL', dim: 'FUC', text: 'O novo fluxo foi simulado com usuários para testar os controles antes da implementação.' },
    { id: 19, etapa: 'IMPLEMENT.', persp: 'UTIL', dim: 'FUC', text: 'A capacitação priorizou a prática do novo processo (oficinas) em vez de apenas teoria.' },
    { id: 20, etapa: 'MONITOR.', persp: 'UTIL', dim: 'FUC', text: 'O painel de indicadores permite acesso e navegação autônoma.' },
    { id: 21, etapa: 'PREPARAR', persp: 'REQ', dim: 'TEG', text: 'Estão definidos o Dono do Processo e o Gestor de Riscos.' },
    { id: 22, etapa: 'DESCOBRIR', persp: 'REQ', dim: 'TEG', text: 'O processo foi documentado usando uma notação padronizada (BPMN) compreensível a terceiros.' },
    { id: 23, etapa: 'RACION.', persp: 'REQ', dim: 'TEG', text: 'O desenho evidencia a separação entre quem executa e quem controla (segregação de funções).' },
    { id: 24, etapa: 'IMPLEMENT.', persp: 'REQ', dim: 'TEG', text: 'Os controles implementados geram evidências documentais acessíveis e auditáveis.' },
    { id: 25, etapa: 'MONITOR.', persp: 'REQ', dim: 'TEG', text: 'Há registros (logs) que rastreiam a autoria e data das decisões.' },
    { id: 26, etapa: 'PREPARAR', persp: 'UTIL', dim: 'TEG', text: 'O plano de comunicação estabelece canais claros de acesso à informação para os interessados.' },
    { id: 27, etapa: 'DESCOBRIR', persp: 'UTIL', dim: 'TEG', text: 'O desenho do processo foi validado pelos executores como fiel à realidade operacional.' },
    { id: 28, etapa: 'RACION.', persp: 'UTIL', dim: 'TEG', text: 'Foram formalizadas as regras de negócio e os critérios de decisão.' },
    { id: 29, etapa: 'IMPLEMENT.', persp: 'UTIL', dim: 'TEG', text: 'A documentação de processos e riscos está centralizada em um repositório digital único e acessível.' },
    { id: 30, etapa: 'MONITOR.', persp: 'UTIL', dim: 'TEG', text: 'Os indicadores estão disponíveis em painéis de fácil leitura para prestação de contas.' }
];

function injectEvaluationButtons() {
    const activeStep = document.querySelector('.bc-step.active');
    if (activeStep) {
        const stepName = activeStep.innerText.trim().toUpperCase();
        let etapaMap = {
            'PREPARAR': 'PREPARAR',
            'DESCOBRIR': 'DESCOBRIR',
            'RACIONALIZAR': 'RACION.',
            'IMPLEMENTAR': 'IMPLEMENT.',
            'MONITORAR': 'MONITOR.'
        };
        const etapa = etapaMap[stepName];
        if (etapa) {
            const dropdown = document.querySelector('.dropdown-content');
            if (dropdown) {
                dropdown.insertAdjacentHTML('beforeend', `<a href="#" onclick="openEvaluationModal('${etapa}'); return false;" style="color: var(--accent); border-top: 1px solid #e2e8f0; font-weight: bold;">📊 Avaliar Artefato</a>`);
            }
        }
    }
}

function openEvaluationModal(etapaFiltro = null) {
    let overlay = document.getElementById('evalOverlay');
    if (!overlay) {
        const evalStyles = document.createElement('style');
        evalStyles.innerHTML = `
            .eval-panel { width: 35%; min-width: 450px; height: 100%; background: #f8fafc; position: fixed; right: 0; top: 0; z-index: 100000; box-shadow: -5px 0 25px rgba(0,0,0,0.3); display: flex; flex-direction: column; transform: translateX(100%); transition: transform 0.3s ease-out; }
            .eval-panel.open { transform: translateX(0); }
            .eval-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(15, 23, 42, 0.4); z-index: 99999; display: none; opacity: 0; transition: opacity 0.3s ease-out; }
            .eval-overlay.open { display: block; opacity: 1; }
            .eval-header { background: #fff; padding: 20px; border-bottom: 1px solid var(--border-color); display: flex; justify-content: space-between; align-items: center; }
            .eval-content { padding: 20px; overflow-y: auto; flex: 1; }
            .eval-question { background: #fff; padding: 15px; border-radius: 8px; border: 1px solid var(--border-color); margin-bottom: 15px; }
            .eval-question-text { font-size: 0.9rem; font-weight: 600; color: var(--text-main); margin-bottom: 10px; }
            .eval-question-tags { display: flex; gap: 6px; margin-bottom: 10px; }
            .eval-tag { font-size: 0.65rem; padding: 2px 6px; border-radius: 4px; background: #e2e8f0; color: #475569; font-weight: bold; }
            .eval-likert { display: flex; justify-content: space-between; gap: 4px; }
            .eval-likert-opt { flex: 1; text-align: center; padding: 8px 4px; background: #f1f5f9; border: 1px solid #cbd5e1; border-radius: 4px; cursor: pointer; font-size: 0.75rem; font-weight: 600; color: #64748b; transition: all 0.2s; }
            .eval-likert-opt:hover { background: #e2e8f0; }
            .eval-likert-opt.selected { background: var(--accent); color: #fff; border-color: var(--accent); }
            .eval-results { margin-top: 20px; padding-top: 20px; border-top: 2px dashed var(--border-color); }
            .eval-score-card { background: #fff; border: 1px solid var(--border-color); padding: 15px; border-radius: 8px; margin-bottom: 10px; display: flex; align-items: center; gap: 15px; }
            .eval-score-circle { width: 60px; height: 60px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 1.2rem; font-weight: bold; color: #fff; text-shadow: 0 1px 2px rgba(0,0,0,0.3); }
            .eval-score-info { flex: 1; }
            .eval-score-title { font-size: 0.8rem; color: #64748b; text-transform: uppercase; font-weight: bold; margin-bottom: 4px; }
            .eval-score-class { font-size: 1.1rem; font-weight: 800; color: var(--text-main); }
            .eval-score-action { font-size: 0.75rem; color: #475569; margin-top: 4px; }
            .eval-iframe { position: fixed; top: 0; left: 0; width: 65%; height: 100%; border: none; z-index: 99998; display: none; opacity: 0; transition: opacity 0.3s ease-out; background: #f8fafc; }
            .eval-iframe.open { display: block; opacity: 1; }
            .eval-panel.fullscreen { width: 100% !important; min-width: 100% !important; }
            .eval-iframe.hidden { display: none !important; }
        `;
        document.head.appendChild(evalStyles);

        const iframe = document.createElement('iframe');
        iframe.id = 'evalIframe';
        iframe.className = 'eval-iframe';
        iframe.onload = () => {
            try {
                iframe.contentWindow.document.addEventListener('click', () => { closeEvaluationModal(); });
                const style = iframe.contentWindow.document.createElement('style');
                style.innerHTML = `
                    .no-print, .breadcrumbs, .header-controls, footer, .global-actions, .btn-main, .dropdown, button, input[type="file"], .btn-edit-action { display: none !important; }
                    body { padding-top: 20px; }
                    .container, .preparar-wrapper, .racionalizar { margin-top: 0 !important; }
                    a, input, select, textarea { pointer-events: none !important; }
                `;
                iframe.contentWindow.document.head.appendChild(style);
            } catch(e) {}
        };
        document.body.appendChild(iframe);

        overlay = document.createElement('div');
        overlay.id = 'evalOverlay';
        overlay.className = 'eval-overlay';
        overlay.onclick = (e) => {
            if (e.target === overlay) closeEvaluationModal();
        };
        document.body.appendChild(overlay);

        const panel = document.createElement('div');
        panel.id = 'evalPanel';
        panel.className = 'eval-panel';
        overlay.appendChild(panel);
    }

    const panel = document.getElementById('evalPanel');
    const iframe = document.getElementById('evalIframe');
    const answers = JSON.parse(localStorage.getItem('pdrim_evaluation_v10_9') || '{}');

    let displayQuestions = EVAL_QUESTIONS;
    let title = 'Avaliação Completa da Iniciativa';
    if (etapaFiltro) {
        displayQuestions = EVAL_QUESTIONS.filter(q => q.etapa === etapaFiltro);
        title = `Avaliação: ${etapaFiltro}`;
    }

    const isIndexPage = !window.location.pathname.includes('preparar.html') && 
                        !window.location.pathname.includes('descobrir.html') && 
                        !window.location.pathname.includes('racionalizar.html') && 
                        !window.location.pathname.includes('implementar.html') && 
                        !window.location.pathname.includes('monitorar.html');

    if (isIndexPage && etapaFiltro) {
        const ETAPA_URLS = { 'PREPARAR': 'preparar.html', 'DESCOBRIR': 'descobrir.html', 'RACION.': 'racionalizar.html', 'IMPLEMENT.': 'implementar.html', 'MONITOR.': 'monitorar.html' };
        if (iframe.src.indexOf(ETAPA_URLS[etapaFiltro]) === -1) {
            iframe.src = ETAPA_URLS[etapaFiltro];
        }
        document.getElementById('evalOverlay').style.width = '35%';
        document.getElementById('evalOverlay').style.left = '65%';
        document.getElementById('evalOverlay').style.background = 'rgba(15, 23, 42, 0.7)';
        iframe.classList.add('open');
    } else {
        if (iframe) iframe.classList.remove('open');
        document.getElementById('evalOverlay').style.width = '100%';
        document.getElementById('evalOverlay').style.left = '0';
        document.getElementById('evalOverlay').style.background = 'rgba(15, 23, 42, 0.4)';
    }

    let qHtml = '';
    displayQuestions.forEach(q => {
        const val = answers[q.id];
        let optsHtml = '';
        for (let i = 0; i <= 5; i++) {
            const isSel = val === i ? 'selected' : '';
            optsHtml += `<div class="eval-likert-opt ${isSel}" data-qid="${q.id}" data-val="${i}" onclick="setEvalAnswer(${q.id}, ${i})">${i}</div>`;
        }
        qHtml += `
            <div class="eval-question">
                <div class="eval-question-tags">
                    <span class="eval-tag">${q.etapa}</span>
                    <span class="eval-tag">${q.persp === 'REQ' ? 'Requisitos' : 'Utilidade'}</span>
                    <span class="eval-tag">${q.dim}</span>
                </div>
                <div class="eval-question-text">${q.id}. ${q.text}</div>
                <div class="eval-likert">
                    ${optsHtml}
                </div>
                <div style="display:flex; justify-content:space-between; font-size: 0.65rem; color: #94a3b8; margin-top: 4px; font-weight: bold;">
                    <span>Discordo<br>Plenamente (0)</span>
                    <span style="text-align:right;">Concordo<br>Plenamente (5)</span>
                </div>
            </div>
        `;
    });

    panel.innerHTML = `
        <div id="evalRadialChart" class="no-print" style="position: absolute; left: -40px; top: 20px; width: 80px; height: 80px; border-radius: 50%; display: none; align-items: center; justify-content: center; box-shadow: -2px 2px 10px rgba(0,0,0,0.2); transition: transform 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275); transform: scale(0); z-index: 100001; background: conic-gradient(#ccc 0%, #cbd5e1 0);">
            <div style="width: 66px; height: 66px; background: #f8fafc; border-radius: 50%; display: flex; flex-direction: column; align-items: center; justify-content: center; box-shadow: inset 0 1px 3px rgba(0,0,0,0.1);">
                <span id="evalRadialText" style="font-size: 1.1rem; font-weight: 900; color: #333; line-height: 1.2;">0%</span>
                <span style="font-size: 0.5rem; font-weight: 700; color: #64748b; line-height: 1;">GLOBAL</span>
            </div>
        </div>
        <div class="eval-header">
            <h2 style="margin:0; font-size:1.2rem; color:var(--dark-accent);">${title}</h2>
            <div class="no-print" style="display:flex; gap: 8px;">
                <button class="btn-edit-action" style="font-size:0.8rem; padding: 6px 10px; background:#0284c7; color:#fff;" onclick="toggleEvalFullscreen()">⛶ Tela Cheia</button>
                <button class="btn-edit-action" style="font-size:0.8rem; padding: 6px 10px; background:var(--accent); color:#fff;" onclick="printEvalReport()">PDF</button>
                <button class="btn-edit-action" style="font-size:0.8rem; padding: 6px 10px; background: #fee2e2; color: #991b1b;" onclick="clearEvalAnswers('${etapaFiltro || ''}')">Limpar</button>
                <button class="btn-edit-action" style="font-size:1.2rem; padding: 4px 10px;" onclick="closeEvaluationModal()">✕</button>
            </div>
        </div>
        <div class="eval-content">
            <p style="font-size: 0.85rem; color: #64748b; margin-top: 0; margin-bottom: 20px;">Responda às afirmações abaixo utilizando a escala de 0 a 5.</p>
            ${qHtml}
            <button class="btn-main" style="width: 100%; justify-content: center; background: var(--dark-accent); color: white; padding: 12px; margin-top: 20px; font-weight: bold;" onclick="submitEvaluation('${etapaFiltro || ''}')">Enviar Respostas</button>
            <button class="btn-main btn-secondary" style="width: 100%; justify-content: center; padding: 12px; margin-top: 10px; font-weight: bold;" onclick="pauseEvaluation()">⏸️ Pausar e Continuar Depois</button>
            <div id="evalResultsContainer" style="display: none;"></div>
        </div>
    `;

    document.getElementById('evalOverlay').classList.add('open');
    setTimeout(() => {
        document.getElementById('evalPanel').classList.add('open');
    }, 10);
}

window.toggleEvalFullscreen = function() {
    const panel = document.getElementById('evalPanel');
    const iframe = document.getElementById('evalIframe');
    if (panel.classList.contains('fullscreen')) {
        panel.classList.remove('fullscreen');
        if(iframe) iframe.classList.remove('hidden');
    } else {
        panel.classList.add('fullscreen');
        if(iframe) iframe.classList.add('hidden');
    }
};

window.pauseEvaluation = function() {
    closeEvaluationModal();
    const alertMsg = "Respostas salvas localmente! Você pode retornar depois para concluir a avaliação.";
    if (typeof showToast === 'function') showToast(alertMsg, "success");
    else alert(alertMsg);
};

window.submitEvaluation = function(etapaFiltro) {
    renderEvalResults(etapaFiltro === '' ? null : etapaFiltro);
    const container = document.getElementById('evalResultsContainer');
    if (container) {
        container.style.display = 'block';
        setTimeout(() => container.scrollIntoView({ behavior: 'smooth' }), 100);
    }
    const radial = document.getElementById('evalRadialChart');
    if (radial) {
        radial.style.display = 'flex';
        setTimeout(() => radial.style.transform = 'scale(1)', 50);
    }
}

function closeEvaluationModal() {
    document.getElementById('evalPanel').classList.remove('open');
    const iframe = document.getElementById('evalIframe');
    if (iframe) iframe.classList.remove('open');
    setTimeout(() => {
        document.getElementById('evalOverlay').classList.remove('open');
        if (iframe) iframe.src = '';
    }, 300);
}

window.clearEvalAnswers = function(etapaFiltro) {
    if (confirm("Tem certeza que deseja limpar as respostas da avaliação?")) {
        if (etapaFiltro) {
            const answers = JSON.parse(localStorage.getItem('pdrim_evaluation_v10_9') || '{}');
            EVAL_QUESTIONS.forEach(q => {
                if (q.etapa === etapaFiltro) delete answers[q.id];
            });
            localStorage.setItem('pdrim_evaluation_v10_9', JSON.stringify(answers));
        } else {
            localStorage.removeItem('pdrim_evaluation_v10_9');
        }
        openEvaluationModal(etapaFiltro === '' ? null : etapaFiltro);
    }
};

window.printEvalReport = function() {
    let printStyle = document.getElementById('eval-print-style');
    if (!printStyle) {
        printStyle = document.createElement('style');
        printStyle.id = 'eval-print-style';
        printStyle.innerHTML = `
            @media print {
                body > *:not(#evalOverlay) { display: none !important; }
                #evalOverlay { position: static !important; background: white !important; display: block !important; opacity: 1 !important; height: auto !important; overflow: visible !important; }
                #evalPanel { position: static !important; width: 100% !important; height: auto !important; transform: none !important; box-shadow: none !important; overflow: visible !important; }
                .eval-content { overflow: visible !important; height: auto !important; display: block !important; padding: 0 !important; }
                .no-print { display: none !important; }
                .eval-likert-opt { border: 1px solid #cbd5e1 !important; color: #000 !important; }
                .eval-likert-opt.selected { background: #2563eb !important; color: white !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                .eval-score-circle, .eval-score-card { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                .eval-question { break-inside: avoid; page-break-inside: avoid; margin-bottom: 10px !important; padding: 10px !important;}
                .eval-score-card { break-inside: avoid; page-break-inside: avoid; }
            }
        `;
        document.head.appendChild(printStyle);
    }
    window.print();
};

window.setEvalAnswer = function(qId, value) {
    const answers = JSON.parse(localStorage.getItem('pdrim_evaluation_v10_9') || '{}');
    answers[qId] = value;
    localStorage.setItem('pdrim_evaluation_v10_9', JSON.stringify(answers));
    
    const likertOpts = document.querySelectorAll(`.eval-likert-opt[data-qid="${qId}"]`);
    likertOpts.forEach(opt => {
        if (parseInt(opt.dataset.val) === value) {
            opt.classList.add('selected');
        } else {
            opt.classList.remove('selected');
        }
    });
};

function getEvalClass(score, type) {
    let range = 0;
    if (score <= 20) range = 0;
    else if (score <= 40) range = 1;
    else if (score <= 60) range = 2;
    else if (score <= 80) range = 3;
    else range = 4;

    const classes = {
        'IG': ['Insuficiente', 'Reduzido', 'Em Desenvolvimento', 'Satisfatório', 'Excelente'],
        'IR': ['Caótico', 'Básico', 'Estruturado', 'Rastreado', 'Otimizado'],
        'IU': ['Inadequado', 'Funcional', 'Razoável', 'Adequado', 'Sinergético'],
        'IF': ['Incipiente', 'Emergente', 'Operacional', 'Consolidado', 'Referência']
    };

    const actions = [
        'Requer revisão estrutural imediata, pois a base da iniciativa não é sustentável.',
        'Requer ajustes significativos para que a iniciativa possa operar.',
        'Requer mitigar entraves que comprometem a sustentabilidade e fluidez da iniciativa.',
        'Requer otimização, pois a iniciativa roda bem, mas apresenta múltiplas oportunidades de melhoria.',
        'Alta integração, transparência e usabilidade. Requer apenas melhorias pontuais ou manutenção.'
    ];

    const colors = ['#ef4444', '#f97316', '#facc15', '#84cc16', '#22c55e'];

    return {
        label: classes[type][range],
        action: actions[range],
        color: colors[range],
        pct: score.toFixed(1) + '%'
    };
}

function calculateIndex(questions, answers) {
    let sum = 0;
    let count = questions.length;
    let answeredCount = 0;

    questions.forEach(q => {
        if (answers[q.id] !== undefined) {
            sum += answers[q.id];
            answeredCount++;
        }
    });

    if (count === 0) return { score: 0, answered: 0, total: 0 };
    const rawScore = (sum / count) * (100 / 5);
    return { score: rawScore, answered: answeredCount, total: count };
}

function renderEvalResults(etapaFiltro) {
    const answers = JSON.parse(localStorage.getItem('pdrim_evaluation_v10_9') || '{}');
    const container = document.getElementById('evalResultsContainer');
    
    const globalQ = EVAL_QUESTIONS;
    const reqQ = EVAL_QUESTIONS.filter(q => q.persp === 'REQ');
    const utilQ = EVAL_QUESTIONS.filter(q => q.persp === 'UTIL');

    const globalRes = calculateIndex(globalQ, answers);
    const reqRes = calculateIndex(reqQ, answers);
    const utilRes = calculateIndex(utilQ, answers);

    const globalInfo = getEvalClass(globalRes.score, 'IG');
    const radialChart = document.getElementById('evalRadialChart');
    const radialText = document.getElementById('evalRadialText');
    if (radialChart && radialText) {
        radialChart.style.background = `conic-gradient(${globalInfo.color} ${globalRes.score}%, #cbd5e1 0)`;
        radialText.style.color = globalInfo.color;
        radialText.innerText = globalRes.score.toFixed(0) + '%';
    }

    let resultsHtml = `<div class="eval-results"><h3 style="color:var(--dark-accent); margin-top:0;">Resultados</h3>`;

    const makeScoreCard = (title, res, type) => {
        const info = getEvalClass(res.score, type);
        return `
            <div class="eval-score-card">
                <div class="eval-score-circle" style="background: ${info.color}; text-shadow: 0 1px 2px rgba(0,0,0,0.3);">
                    ${info.pct}
                </div>
                <div class="eval-score-info">
                    <div class="eval-score-title">${title} (${res.answered}/${res.total} respondidas)</div>
                    <div class="eval-score-class" style="color: ${info.color};">${info.label}</div>
                    <div class="eval-score-action">${info.action}</div>
                </div>
            </div>
        `;
    };

    if (etapaFiltro) {
        const stageQ = EVAL_QUESTIONS.filter(q => q.etapa === etapaFiltro);
        const stageRes = calculateIndex(stageQ, answers);
        resultsHtml += makeScoreCard(`Índice da Fase (${etapaFiltro})`, stageRes, 'IF');
    } else {
        resultsHtml += makeScoreCard('Índice Global (IG)', globalRes, 'IG');
        resultsHtml += makeScoreCard('Índice de Requisitos (IR)', reqRes, 'IR');
        resultsHtml += makeScoreCard('Índice de Utilidade (IU)', utilRes, 'IU');
        
        resultsHtml += `<h4 style="color:var(--dark-accent); margin-top:20px; border-bottom:1px solid #e2e8f0; padding-bottom:5px;">Por Fase</h4>`;
        const stages = ['PREPARAR', 'DESCOBRIR', 'RACION.', 'IMPLEMENT.', 'MONITOR.'];
        stages.forEach(s => {
            const sq = EVAL_QUESTIONS.filter(q => q.etapa === s);
            const sr = calculateIndex(sq, answers);
            if (sr.answered > 0) {
                resultsHtml += makeScoreCard(`Fase: ${s}`, sr, 'IF');
            }
        });
    }

    resultsHtml += `</div>`;
    container.innerHTML = resultsHtml;
}

function exportInitiative() {
    const initiativeData = {};
    let hasData = false;

    PDRIM_KEYS.forEach(key => {
        const data = localStorage.getItem(key);
        if (data && data !== '[]' && data !== '{}') {
            try {
                initiativeData[key] = JSON.parse(data);
                hasData = true;
            } catch (e) {
                console.warn(`Erro de conversão no item: ${key}`);
                initiativeData[key] = null;
            }
        } else {
            initiativeData[key] = null;
        }
    });

    if (!hasData) return showToast("Não há dados na iniciativa para exportar.", "warning");

    const blob = new Blob([JSON.stringify(initiativeData, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `pdrim_iniciativa_completa_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a); // Anexo ao body é obrigatório para Firefox/Edge processarem o click()
    a.click();
    document.body.removeChild(a);

    localStorage.setItem('pdrim_exported', 'true');
    showToast('Iniciativa exportada com sucesso!', 'success');
}

function zerarIniciativa() {
    if (confirm("Tem certeza que deseja APAGAR TODA A INICIATIVA? Esta ação removerá os dados de todas as etapas e não pode ser desfeita.")) {
        PDRIM_KEYS.forEach(key => localStorage.removeItem(key));
        localStorage.removeItem('pdrim_exported');
        checkInitiativeState();
        showToast("Iniciativa zerada com sucesso!", "success");
    }
}

function importInitiative(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const importedData = JSON.parse(e.target.result);
            let importedCount = 0;

            PDRIM_KEYS.forEach(key => {
                if (importedData[key] !== undefined) {
                    if (importedData[key] === null) localStorage.removeItem(key);
                    else localStorage.setItem(key, JSON.stringify(importedData[key]));
                    importedCount++;
                }
            });

            if (importedCount > 0) {
                localStorage.setItem('pdrim_exported', 'true');
                showToast('Iniciativa importada com sucesso!', 'success');
                checkInitiativeState();
            } else {
                showToast('Arquivo inválido ou sem dados da Iniciativa PDRIM.', 'error');
            }
        } catch (err) {
            showToast('Erro ao importar o arquivo JSON.', 'error');
        }
    };
    reader.readAsText(file);
    event.target.value = '';
}

function gerarPDFIniciativa() {
    const prepData = JSON.parse(localStorage.getItem('pdrim_prep_v10_9') || '{}');
    const descData = JSON.parse(localStorage.getItem('pdrim_desc_v10_9') || '{}');
    const racData = JSON.parse(localStorage.getItem('pdrim_rac_v10_9') || '[]');
    const impData = JSON.parse(localStorage.getItem('pdrim_imp_v10_9') || '{"logs": [], "instances": {}}');
    const monData = JSON.parse(localStorage.getItem('pdrim_mon_v10_9') || '{}');
    
    let hasAnyData = false;
    PDRIM_KEYS.forEach(key => {
        const data = localStorage.getItem(key);
        if (data && data !== '[]' && data !== '{}') hasAnyData = true;
    });

    if (!hasAnyData) {
        showToast("Não há dados na iniciativa para gerar o PDF.", "warning");
        return;
    }

    const CAT_MAP = { 'PES':'Pessoas e Equipes', 'TEC':'Sistemas e Tecnologias', 'MAT':'Infraestrutura e Materiais', 'LEI':'Leis, Normas e Funções', 'TEM':'Tempo e Prazos' };
    const STK_MAP = { 'DONO': 'Dono', 'GEST': 'Gestor', 'FACIL': 'Facilitador', 'EXEC': 'Executor', 'TIC': 'Membro de TIC', 'S':'Força', 'W':'Fraqueza', 'O':'Oportunidade', 'T':'Ameaça' };
    const S1_MAP = { 'OBJ':'Objetivo Estratégico', 'DOR':'Dor', 'NEC':'Necessidade' };
    const S3_MAP = { 'IN':'Inclusão', 'OUT':'Exclusão', 'RES':'Recurso' };

    let reportHtml = `<div class="pdf-report-container" style="padding: 20px; font-family: 'Open Sans', sans-serif; color: #334155;">
        <div style="text-align: center; height: 90vh; display: flex; flex-direction: column; justify-content: center; align-items: center; page-break-after: always;">
            <h1 style="color: var(--dark-accent); font-size: 2.5rem; margin-bottom: 10px;">Relatório Consolidado PDRIM</h1>
            <h2 style="color: var(--accent); font-size: 1.8rem; margin-top: 0;">${prepData.processName || 'Iniciativa Não Nomeada'}</h2>
            <p style="margin-top: 40px; font-size: 1rem; color: #64748b;">Gerado em: ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}</p>
        </div>`;

    // 1. PREPARAR
    if (Object.keys(prepData).length > 0) {
        reportHtml += `<h2 style="border-bottom: 2px solid var(--dark-accent); padding-bottom: 5px; color: #1e293b; margin-top: 20px;">1. PREPARAR: Escopo e Estratégia</h2>`;
        
        if (prepData.s1_phrase) reportHtml += `<div style="background: #f0f7ff; padding: 15px; border-radius: 8px; border: 1px solid var(--accent); margin-bottom: 20px;"><b>Proposta de Valor:</b><br>${prepData.s1_phrase}</div>`;

        if (prepData.sec1 && prepData.sec1.length > 0) {
            reportHtml += `<h3>1.1. Objetivos, Dores e Necessidades</h3><ul>`;
            prepData.sec1.forEach(i => reportHtml += `<li><b>${S1_MAP[i.cat] || i.cat}:</b> ${i.val}</li>`);
            reportHtml += `</ul>`;
        }

        if (prepData.sec2 && prepData.sec2.length > 0) {
            reportHtml += `<h3>1.2. Partes Interessadas e SWOT</h3><ul>`;
            prepData.sec2.forEach(i => reportHtml += `<li><b>${STK_MAP[i.cat] || i.cat}:</b> ${i.val}</li>`);
            reportHtml += `</ul>`;
        }

        if (prepData.sec3 && prepData.sec3.length > 0) {
            reportHtml += `<h3>1.3. Escopo e Recursos</h3><ul>`;
            prepData.sec3.forEach(i => {
                let tipo = i.type === 'SCOPE' ? S3_MAP[i.scope] : S3_MAP[i.type];
                reportHtml += `<li><b>[${tipo}] ${CAT_MAP[i.cat] || i.cat}:</b> ${i.val}</li>`
            });
            reportHtml += `</ul>`;
        }

        if (prepData.sec4 && prepData.sec4.length > 0) {
            reportHtml += `<h3>1.4. KPIs e KRIs</h3><ul>`;
            prepData.sec4.forEach(i => {
                let comp = [];
                if(i.cur) comp.push(`Atual: ${i.cur}`);
                if(i.meta) comp.push(`Meta: ${i.meta}`);
                if(i.min) comp.push(`Mín: ${i.min}`);
                if(i.max) comp.push(`Máx: ${i.max}`);
                reportHtml += `<li><b>[${i.cat}]</b> ${i.val} ${i.uni ? '('+i.uni+')' : ''} ${i.isCritical ? '<span style="color:#2563eb">(Apetite: ' + (i.apetiteLvl || i.meta || 'Médio/Moderado') + ')</span>' : ''} ${comp.length ? ' - ' + comp.join(' | ') : ''}</li>`;
            });
            reportHtml += `</ul>`;
        }

        if (prepData.sec5 && prepData.sec5.length > 0) {
            reportHtml += `<h3>1.5. Artefatos e Resultados</h3><ul>`;
            prepData.sec5.forEach(i => reportHtml += `<li><b>${i.cat === 'ART' ? 'Artefato' : 'Resultado'}:</b> ${i.val}</li>`);
            reportHtml += `</ul>`;
        }

        if (prepData.time) {
            reportHtml += `<h3>1.6. Cronograma Previsto</h3><ul>`;
            const steps = ['PREPARAR', 'DESCOBRIR', 'RACIONALIZAR', 'IMPLEMENTAR', 'MONITORAR'];
            for(let i=1; i<=5; i++) {
                const d = prepData.time[i];
                if(d && d.i && d.f) reportHtml += `<li><b>${steps[i-1]}:</b> ${d.i.split('-').reverse().join('/')} a ${d.f.split('-').reverse().join('/')}</li>`;
            }
            reportHtml += `</ul>`;
        }
    }

    // 2. DESCOBRIR
    if (descData && descData.models) {
        reportHtml += `<div style="page-break-before: always;"></div>`;
        reportHtml += `<h2 style="border-bottom: 2px solid var(--dark-accent); padding-bottom: 5px; color: #1e293b; margin-top: 20px;">2. DESCOBRIR: Mapeamento do Processo</h2>`;
        
        ['as-is', 'to-be'].forEach(mode => {
            const model = descData.models[mode];
            if (model && (model.activities.length > 0 || model.risks.length > 0 || model.image)) {
                reportHtml += `<div style="margin-bottom: 30px;">`;
                reportHtml += `<h3 style="background: #f8fafc; padding: 10px; border-left: 4px solid var(--accent);">Modelo: ${mode.toUpperCase()}</h3>`;
                
                if (model.image || model.legacyDrawing) {
                    reportHtml += `<p><b>Diagrama Visual:</b></p>`;
                    reportHtml += `<div style="position: relative; border: 1px solid #cbd5e1; display: inline-block; max-width: 100%;">`;
                    if (model.image) reportHtml += `<img src="${model.image}" style="max-width: 100%; display: block;" />`;
                    if (model.legacyDrawing) reportHtml += `<img src="${model.legacyDrawing}" style="max-width: 100%; display: block; position: absolute; top: 0; left: 0;" />`;
                    if (model.drawings) reportHtml += `<img src="${model.drawings}" style="max-width: 100%; display: block; position: absolute; top: 0; left: 0;" />`;
                    reportHtml += `</div>`;
                }

                if (model.risks && model.risks.length > 0) {
                    reportHtml += `<h4>Inventário de Riscos</h4><ul>`;
                    model.risks.forEach(r => reportHtml += `<li><b>[${r.id}]</b> ${r.desc}</li>`);
                    reportHtml += `</ul>`;
                }

                if (model.activities && model.activities.length > 0) {
                    reportHtml += `<h4>Atividades e Procedimentos (POPs)</h4>`;
                    model.activities.forEach(a => {
                        reportHtml += `<div style="margin-bottom: 15px; padding: 10px; border: 1px solid #e2e8f0; border-radius: 6px;">`;
                        reportHtml += `<b style="color: var(--dark-accent);">${a.name}</b>`;
                        if (a.sector) reportHtml += ` | Setor: ${a.sector}`;
                        if (a.time) reportHtml += ` | Tempo: ${a.time.d}d ${a.time.h}h ${a.time.m}m ${a.time.s}s`;
                        
                        if (a.noRisk) {
                            reportHtml += ` | <span style="color: #166534;">Sem Riscos Associados</span>`;
                        } else if (a.riskAssocs && a.riskAssocs.length > 0) {
                            reportHtml += `<div style="margin-top: 5px; font-size: 0.85rem; color: #ef4444;"><b>Riscos Associados:</b><ul>`;
                            a.riskAssocs.forEach(ra => {
                                const rDesc = model.risks.find(x => x.id === ra.riskId)?.desc || ra.riskId;
                                reportHtml += `<li>${rDesc} (Prob: ${ra.prob}, Imp: ${ra.imp})</li>`;
                            });
                            reportHtml += `</ul></div>`;
                        }

                        if (a.steps && a.steps.length > 0) {
                            reportHtml += `<div style="margin-top: 5px;"><b>Passos (POP):</b><ol style="margin-top: 2px;">`;
                            a.steps.forEach(s => {
                                reportHtml += `<li>${s.desc}</li>`;
                            });
                            reportHtml += `</ol></div>`;
                        }
                        reportHtml += `</div>`;
                    });
                }
                reportHtml += `</div>`;
            }
        });
    }

    // 3. RACIONALIZAR
    if (racData && racData.length > 0) {
        reportHtml += `<div style="page-break-before: always;"></div>`;
        reportHtml += `<h2 style="border-bottom: 2px solid var(--dark-accent); padding-bottom: 5px; color: #1e293b; margin-top: 20px;">3. RACIONALIZAR: Plano de Ação Completo</h2>`;
        
        racData.forEach(a => {
            reportHtml += `<div style="margin-bottom: 15px; padding: 15px; border: 1px solid #cbd5e1; border-radius: 6px; background: #fff;">`;
            reportHtml += `<h3 style="margin-top: 0; color: var(--accent);">${a.title}</h3>`;
            reportHtml += `<p style="margin: 5px 0; font-size: 0.9rem;"><b>Categoria:</b> ${a.cat} | <b>Status:</b> <span style="text-transform:uppercase;">${a.status}</span> | <b>Data/Período:</b> ${a.startDate || a.date} ${a.endDate ? 'a ' + a.endDate : ''}</p>`;
            if (a.linkedItem) {
                reportHtml += `<p style="margin: 5px 0; font-size: 0.9rem;"><b>Vínculo:</b> ${a.linkedItem}</p>`;
            }
            if (a.indicatorData && a.indicatorData.length > 0) {
                reportHtml += `<div style="margin: 10px 0; font-size: 0.9rem; background: #f8fafc; padding: 10px; border-radius: 4px;"><b>Indicadores:</b><ul>`;
                a.indicatorData.forEach(ind => {
                    reportHtml += `<li>${ind.name || 'Sem nome'} - Meta: ${ind.meta||'-'}${ind.unit||''} (Mín: ${ind.min||'-'}, Máx: ${ind.max||'-'})</li>`;
                });
                reportHtml += `</ul></div>`;
            }
            if (a.desc && a.desc !== '<p><br></p>') {
                reportHtml += `<div style="margin-top: 10px; font-size: 0.9rem;"><b>Descrição:</b><br>${a.desc}</div>`;
            }
            if (a.resources && a.resources !== '<p><br></p>') {
                reportHtml += `<div style="margin-top: 10px; font-size: 0.9rem;"><b>Recursos:</b><br>${a.resources}</div>`;
            }
            reportHtml += `</div>`;
        });
    }

    // 4. IMPLEMENTAR
    if (impData && (impData.logs && impData.logs.length > 0)) {
        reportHtml += `<div style="page-break-before: always;"></div>`;
        reportHtml += `<h2 style="border-bottom: 2px solid var(--dark-accent); padding-bottom: 5px; color: #1e293b; margin-top: 20px;">4. IMPLEMENTAR: Diário de Ocorrências</h2>`;
        
        const logsSort = impData.logs.slice().sort((a,b) => new Date(b.startDate || b.date) - new Date(a.startDate || a.date));
        
        if (impData.instances && Object.keys(impData.instances).length > 0) {
            reportHtml += `<h3>Instâncias do Processo</h3>`;
            reportHtml += `<table style="width: 100%; border-collapse: collapse; font-size: 0.85rem; margin-bottom: 20px;">
            <thead><tr style="background: #f8fafc; text-align: left;">
                <th style="padding: 8px; border: 1px solid #cbd5e1;">ID da Instância</th>
                <th style="padding: 8px; border: 1px solid #cbd5e1;">Passos Concluídos (Base)</th>
            </tr></thead><tbody>`;
            Object.keys(impData.instances).forEach(instId => {
                const inst = impData.instances[instId];
                const chkCount = inst.checkedSteps ? inst.checkedSteps.length : 0;
                reportHtml += `<tr>
                    <td style="padding: 8px; border: 1px solid #cbd5e1;"><b>${instId}</b></td>
                    <td style="padding: 8px; border: 1px solid #cbd5e1;">${chkCount}</td>
                </tr>`;
            });
            reportHtml += `</tbody></table>`;
        }

        reportHtml += `<h3>Histórico de Registros (Logs)</h3>`;
        reportHtml += `<table style="width: 100%; border-collapse: collapse; font-size: 0.8rem; margin-bottom: 20px; page-break-inside: auto;">
            <thead><tr style="background: #f8fafc; text-align: left;">
                <th style="padding: 8px; border: 1px solid #cbd5e1; width: 15%;">Data / Status</th>
                <th style="padding: 8px; border: 1px solid #cbd5e1; width: 25%;">Referência / Responsável</th>
                <th style="padding: 8px; border: 1px solid #cbd5e1; width: 60%;">Detalhes do Registro</th>
            </tr></thead><tbody>`;

        logsSort.forEach(l => {
            const sDt = l.startDate ? new Date(l.startDate).toLocaleString('pt-BR') : (l.date ? new Date(l.date).toLocaleString('pt-BR') : '-');

            let statusBadge = l.endDate 
                ? `<span style="color: #166534; font-weight: bold;">CONCLUÍDO</span>` 
                : `<span style="color: #b45309; font-weight: bold;">PENDENTE</span>`;

            let refInfo = `<span style="text-transform: uppercase; font-size: 0.7rem; color: #64748b;">[${l.type}]</span>`;
            if (l.responsible) refInfo += `<br><b>Resp:</b> ${l.responsible}`;
            if (l.instanceId) refInfo += `<br><b>Instância:</b> ${l.instanceId}`;
            if (l.refId) refInfo += `<br><b>Ref:</b> ${l.refId}`;

            let detailsInfo = `<b style="font-size: 0.9rem; color: #1e293b;">${l.title}</b>`;
            if (l.desc && l.desc !== '<p><br></p>') {
                detailsInfo += `<div style="margin-top: 5px; color: #475569;">${l.desc}</div>`;
            }
            if (l.mitigations && l.mitigations.length > 0) {
                detailsInfo += `<div style="margin-top: 5px; font-size: 0.75rem; color: #991b1b;"><b>Mitigações:</b><ul style="margin: 2px 0; padding-left: 20px;">`;
                l.mitigations.forEach(m => detailsInfo += `<li>${m.desc} (Resp: ${m.responsible})</li>`);
                detailsInfo += `</ul></div>`;
            }

            reportHtml += `<tr style="page-break-inside: avoid;">
                <td style="padding: 8px; border: 1px solid #cbd5e1; vertical-align: top;">${sDt}<br><br>${statusBadge}</td>
                <td style="padding: 8px; border: 1px solid #cbd5e1; vertical-align: top;">${refInfo}</td>
                <td style="padding: 8px; border: 1px solid #cbd5e1; vertical-align: top;">${detailsInfo}</td>
            </tr>`;
        });
        reportHtml += `</tbody></table>`;
    }

    // 5. MONITORAR
    if (monData && monData.data) {
        const logsToUse = monData.data.logs || [];
        if (logsToUse.length > 0) {
            const actsConcluidas = logsToUse.filter(l => l.type === 'atividade' && l.endDate).length;
            const actsPendentes = logsToUse.filter(l => l.type === 'atividade' && !l.endDate).length;
            const incRegistrados = logsToUse.filter(l => l.type === 'risco').length;
            const incMitigados = logsToUse.filter(l => l.type === 'risco' && l.endDate).length;
            
            reportHtml += `<div style="page-break-before: always;"></div>`;
            reportHtml += `<h2 style="border-bottom: 2px solid var(--dark-accent); padding-bottom: 5px; color: #1e293b; margin-top: 20px;">5. MONITORAR: Indicadores Consolidados</h2>`;
            
            reportHtml += `<div style="display: flex; gap: 20px; text-align: center; margin-top: 20px;">
                <div style="flex: 1; border: 1px solid var(--border-color); padding: 15px; border-radius: 8px; background: #f8fafc;">
                    <b style="font-size: 2rem; color: #22c55e;">${actsConcluidas}</b><br>
                    <span style="font-size: 1rem; color: #475569;">Atividades Concluídas</span>
                </div>
                <div style="flex: 1; border: 1px solid var(--border-color); padding: 15px; border-radius: 8px; background: #f8fafc;">
                    <b style="font-size: 2rem; color: #94a3b8;">${actsPendentes}</b><br>
                    <span style="font-size: 1rem; color: #475569;">Atividades Pendentes/Andamento</span>
                </div>
                <div style="flex: 1; border: 1px solid var(--border-color); padding: 15px; border-radius: 8px; background: #f8fafc;">
                    <b style="font-size: 2rem; color: #ef4444;">${incRegistrados}</b><br>
                    <span style="font-size: 1rem; color: #475569;">Incidentes Registrados</span>
                </div>
                <div style="flex: 1; border: 1px solid var(--border-color); padding: 15px; border-radius: 8px; background: #f8fafc;">
                    <b style="font-size: 2rem; color: #15803d;">${incMitigados}</b><br>
                    <span style="font-size: 1rem; color: #475569;">Incidentes Mitigados</span>
                </div>
            </div>`;
        }
    }

    reportHtml += `</div>`;

    let printContainer = document.getElementById('pdf-consolidated-report');
    if (!printContainer) {
        printContainer = document.createElement('div');
        printContainer.id = 'pdf-consolidated-report';
        document.body.appendChild(printContainer);
    }
    printContainer.innerHTML = reportHtml;

    const style = document.createElement('style');
    style.id = 'print-consolidated-style';
    style.innerHTML = `
        @media print {
            body > *:not(#pdf-consolidated-report) { display: none !important; }
            #pdf-consolidated-report { display: block !important; }
            @page { margin: 15mm; }
            a { text-decoration: none; color: inherit; }
        }
        #pdf-consolidated-report { display: none; }
    `;
    document.head.appendChild(style);

    const originalTitle = document.title;
    document.title = `pdrim_iniciativa_${prepData.processName ? prepData.processName.replace(/\s+/g, '_') : 'completa'}`;

    showToast("Preparando PDF Consolidado...", "info");
    
    setTimeout(() => {
        window.print();
        document.title = originalTitle;
        if(style) style.remove();
        if(printContainer) printContainer.innerHTML = '';
    }, 1000);
}

function showToast(message, type = 'info') {
    let container = document.getElementById('toast-container');
    if (!container) { container = document.createElement('div'); container.id = 'toast-container'; document.body.appendChild(container); }
    const toast = document.createElement('div'); toast.className = `toast toast-${type}`;
    let icon = type === 'error' ? '❌ ' : type === 'warning' ? '⚠️ ' : type === 'success' ? '✅ ' : '⏳ ';
    toast.innerHTML = `<span>${icon}${message}</span>`; container.appendChild(toast);
    toast.offsetHeight; toast.classList.add('show');
    setTimeout(() => { toast.classList.remove('show'); setTimeout(() => toast.remove(), 300); }, 4000);
}