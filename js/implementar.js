// Editor Quill para Descrição de Evidências
const quill = new Quill('#editor-container', {
    theme: 'snow',
    modules: { toolbar: [
        [{ 'header': [1, 2, 3, 4, false] }, { 'font': [] }],
        ['bold', 'italic', 'underline', 'strike'],
        [{ 'color': [] }, { 'background': [] }],
        [{ 'list': 'ordered'}, { 'list': 'bullet' }],
        [{ 'indent': '-1'}, { 'indent': '+1' }, { 'align': [] }],
        ['link', 'image', 'video', 'clean']
    ]}
});

let dbImp = { logs: [], instances: {} };
let racData = [];
let descActivities = [];
let descRisks = [];

let currentView = 'cards';
let currentSortCol = 'startDate';
let currentSortDir = 'desc';
let selectedForDeletion = [];
let timelineExpandedAll = false;
let currentMitigations = [];
let currentCategoryView = null;
let currentRiskHistoryId = null;
let outOfOrderAcoesIds = new Set();

document.addEventListener('DOMContentLoaded', () => {
    initUI();
});

function initUI() {
    loadExternalData();
    
    if(localStorage.getItem('pdrim_imp_v10_9')) {
        try {
            let parsed = JSON.parse(localStorage.getItem('pdrim_imp_v10_9'));
            if (Array.isArray(parsed)) {
                dbImp.logs = parsed;
            } else {
                dbImp = parsed;
            }
        } catch(e) {}
    }
    
    updateBreadcrumbs();
    updateHeaderInitiative();
    renderLogs();
}

function loadExternalData() {
    try {
        const racStored = localStorage.getItem('pdrim_rac_v10_9');
        if (racStored) racData = JSON.parse(racStored);
        
        const descStored = localStorage.getItem('pdrim_desc_v10_9');
        if (descStored) {
            const desc = JSON.parse(descStored);
            let model = null;
            if (desc.baseModel && desc.baseModel !== 'auto') {
                model = desc.models[desc.baseModel];
            } else if (desc.models['to-be'] && (desc.models['to-be'].activities.length > 0 || desc.models['to-be'].risks.length > 0)) {
                model = desc.models['to-be'];
            } else if (desc.models['as-is']) {
                model = desc.models['as-is'];
            }
            if (model) {
                descActivities = model.activities || [];
                descRisks = model.risks || [];
            }
        }
    } catch(e) { console.warn('Erro ao carregar dados externos.', e); }
}

function updateBreadcrumbs() {
    const steps = document.querySelectorAll('.bc-step');
    const keys = ['pdrim_prep_v10_9', 'pdrim_desc_v10_9', 'pdrim_rac_v10_9', 'pdrim_imp_v10_9', 'pdrim_mon_v10_9'];
    steps.forEach((step, index) => {
        const data = localStorage.getItem(keys[index]);
        let hasData = false;
        if (data && data !== '[]' && data !== '{}') {
            if (index === 0) {
                try { const parsed = JSON.parse(data); if (parsed.processName || parsed.sec1?.length > 0 || parsed.sec2?.length > 0) hasData = true; } catch(e) {}
            } else if (index === 1) {
                try { const parsed = JSON.parse(data); if (parsed.models && Object.values(parsed.models).some(m => m.image || m.activities.length > 0)) hasData = true; } catch(e) {}
            } else {
                hasData = true;
            }
        }
        if (hasData) step.classList.add('has-data');
        else step.classList.remove('has-data');
    });
}

function updateHeaderInitiative() {
    try {
        const prepData = localStorage.getItem('pdrim_prep_v10_9');
        if (prepData) {
            const parsed = JSON.parse(prepData);
            if (parsed.processName) {
                const headerName = document.getElementById('header-initiative-name');
                const headerText = document.getElementById('header-initiative-text');
                if (headerName && headerText) { headerText.innerText = parsed.processName; headerName.style.display = 'block'; }
            }
        }
    } catch(e) {}
}

window.formatDuration = function(startISO, endISO) {
    if (!startISO || !endISO) return '';
    const diff = new Date(endISO) - new Date(startISO);
    if (diff < 0) return '';
    const s = Math.floor(diff / 1000) % 60;
    const m = Math.floor(diff / 60000) % 60;
    const h = Math.floor(diff / 3600000);
    let res = [];
    if (h > 0) res.push(`${h}h`);
    if (m > 0) res.push(`${m}m`);
    if (s > 0 || res.length === 0) res.push(`${s}s`);
    return res.join(' ');
};

function getTypeName(type) {
    switch(type) {
        case 'acao': return 'Ação de Implantação';
        case 'atividade': return 'Atividade do Processo';
        case 'risco': return 'Incidente de Risco';
        case 'outro': return 'Outros Registros';
        default: return 'Registro';
    }
}

function getRefName(type, refId) {
    if (!refId) return '';
    if (type === 'acao') {
        const ac = racData.find(a => a.id == refId);
        return ac ? `🚀 ${ac.title}` : '';
    } else if (type === 'atividade') {
        const act = descActivities.find(a => a.id == refId);
        return act ? `📋 ${act.name}` : '';
    } else if (type === 'risco') {
        const r = descRisks.find(x => x.id == refId);
        return r ? `⚠️ ${r.desc}` : '';
    }
    return '';
}

window.openNewLogModal = function() {
    document.getElementById('newLogModalOverlay').style.display = 'flex';
};

window.closeNewLogModal = function() {
    document.getElementById('newLogModalOverlay').style.display = 'none';
};

window.backToNewLogModal = function() {
    closeLogForm();
    openNewLogModal();
};

function openLogForm(type, logId = null) {
    closeNewLogModal();
    const formContainer = document.getElementById('logFormContainer');
    const formTitle = document.getElementById('formTitle');
    const logTypeInput = document.getElementById('logType');
    const logRefSelect = document.getElementById('logRef');
    
    const wrapResp = document.getElementById('wrap-responsible');
    const wrapInst = document.getElementById('wrap-instance-id');
    const mitigationWrapper = document.getElementById('mitigation-actions-wrapper');
    const lblResponsible = document.getElementById('lblResponsible');
    
    if (type === 'risco') {
        mitigationWrapper.style.display = 'block';
        if (lblResponsible) lblResponsible.innerText = 'Responsável Principal pelo Incidente';
    } else {
        mitigationWrapper.style.display = 'none';
        if (lblResponsible) {
            if (type === 'atividade') lblResponsible.innerText = 'Setor / Responsável pela Execução';
            else if (type === 'acao') lblResponsible.innerText = 'Responsável pela Implantação';
            else lblResponsible.innerText = 'Responsável / Setor';
        }
    }
    if (wrapResp) wrapResp.style.display = 'grid';
    wrapInst.style.display = (type === 'atividade') ? 'block' : 'none';
    
    document.getElementById('editor-wrapper').style.display = 'none';
    document.getElementById('logInstanceId').value = '';
    document.getElementById('logStartDate').value = '';
    document.getElementById('logEndDate').value = '';

    let borderColor = '#3b82f6';
    if (type === 'atividade') borderColor = '#22c55e';
    else if (type === 'risco') borderColor = '#ef4444';
    else if (type === 'outro') borderColor = '#64748b';
    formContainer.style.borderTop = '6px solid ' + borderColor;
    
    logTypeInput.value = type;
    logRefSelect.innerHTML = '<option value="">-- Registro não previsto (Avulso) --</option>';
    
    if (type === 'acao') {
        const unique = [];
        racData.forEach(a => { if(a.label !== 'Fim' && !unique.find(x => x.id === a.id)) unique.push(a); });
        unique.forEach(a => {
            const opt = document.createElement('option'); opt.value = a.id; opt.text = a.title; logRefSelect.appendChild(opt);
        });
    } else if (type === 'atividade') {
        descActivities.forEach(a => {
            const opt = document.createElement('option'); opt.value = a.id; opt.text = a.name; logRefSelect.appendChild(opt);
        });
    } else if (type === 'risco') {
        descRisks.forEach(r => {
            const opt = document.createElement('option'); opt.value = r.id; opt.text = r.desc; logRefSelect.appendChild(opt);
        });
    }
    
    const btnBack = document.getElementById('btn-back-new-log');
    if (logId) {
        const log = dbImp.logs.find(l => l.id == logId);
        if (log) {
            formTitle.innerText = `Editar ${getTypeName(type)}`;
            document.getElementById('logId').value = log.id;
            document.getElementById('logStartDate').value = log.startDate || '';
            document.getElementById('logEndDate').value = log.endDate || '';
            document.getElementById('logRef').value = log.refId || '';
            document.getElementById('logTitle').value = log.title;
            document.getElementById('logInstanceId').value = log.instanceId || '';
            document.getElementById('logResponsible').value = log.responsible || '';
            currentMitigations = log.mitigations ? JSON.parse(JSON.stringify(log.mitigations)) : [];
            quill.root.innerHTML = log.desc || '';
            document.getElementById('btn-toggle-obs').style.display = 'none';
            if (log.desc && log.desc !== '<p><br></p>') document.getElementById('editor-wrapper').style.display = 'flex';
        }
        if (btnBack) btnBack.style.display = 'none';
    } else {
        formTitle.innerText = `Novo Registro: ${getTypeName(type)}`;
        document.getElementById('logId').value = '';
        document.getElementById('logRef').value = '';
        document.getElementById('logTitle').value = '';
        document.getElementById('logResponsible').value = '';
        document.getElementById('newMitigationStart').value = '';
        document.getElementById('newMitigationEnd').value = '';
        currentMitigations = [];
        quill.setContents([]);
        document.getElementById('btn-toggle-obs').style.display = 'inline-block';
        if (btnBack) btnBack.style.display = 'inline-block';
    }
    
    renderMitigationList();
    document.getElementById('formModalOverlay').style.display = 'flex';
}

function onLogRefChange() {
    const refId = document.getElementById('logRef').value;
    const type = document.getElementById('logType').value;
    const titleInput = document.getElementById('logTitle');
    const respInput = document.getElementById('logResponsible');
    if (refId) {
        let title = '';
        let sector = '';
        if (type === 'acao') title = racData.find(a => a.id == refId)?.title;
        else if (type === 'atividade') {
            const act = descActivities.find(a => a.id == refId);
            title = act?.name;
            sector = act?.sector;
        }
        else if (type === 'risco') title = descRisks.find(r => r.id == refId)?.desc;
        if (title && !titleInput.value) titleInput.value = title;
        if (sector && !respInput.value) respInput.value = sector;
    }
}

function toggleObservation() {
    const wrap = document.getElementById('editor-wrapper');
    const isHidden = wrap.style.display === 'none';
    wrap.style.display = isHidden ? 'flex' : 'none';
    if (isHidden) document.getElementById('btn-toggle-obs').style.display = 'none';
    if (isHidden) quill.focus();
}

function renderMitigationList() {
    const list = document.getElementById('mitigation-list');
    if (!list) return;
    list.innerHTML = '';
    if (currentMitigations.length === 0) {
        list.innerHTML = '<div class="empty-msg">Nenhuma ação de mitigação registrada.</div>';
        return;
    }
    currentMitigations.forEach((m, index) => {
        const startStr = m.startDate ? new Date(m.startDate).toLocaleString('pt-BR') : '-';
        const endStr = m.endDate ? new Date(m.endDate).toLocaleString('pt-BR') : 'Em andamento';
        list.innerHTML += `
            <div class="mini-card" style="background: #fff;">
                <div style="flex: 1;">
                    <p style="margin:0 0 6px 0; font-size: 0.95rem; font-weight: 600; color: #1e293b;">${m.desc}</p>
                    <small style="color: #64748b; font-size: 0.75rem; display: flex; gap: 15px;"><span>👤 ${m.responsible}</span> <span>🗓️ <b>Início:</b> ${startStr}</span> <span>🏁 <b>Fim:</b> ${endStr}</span></small>
                </div>
                <button type="button" class="btn-main" style="background: #fff1f2; color: #e11d48; border: 1px solid #ffe4e6; padding: 8px 12px; border-radius: 8px; font-weight: bold; margin-left: 15px;" onclick="removeMitigationAction(${index})">✕</button>
            </div>
        `;
    });
}

function addMitigationAction() {
    const descInput = document.getElementById('newMitigationDesc');
    const respInput = document.getElementById('newMitigationResp');
    const startInput = document.getElementById('newMitigationStart');
    const endInput = document.getElementById('newMitigationEnd');
    const desc = descInput.value.trim();
    const resp = respInput.value.trim();

    if (!desc || !resp) {
        showToast("Preencha a descrição e o responsável pela ação.", "warning");
        return;
    }
    
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    const defaultDate = now.toISOString().slice(0,16);
    const startDate = startInput.value || defaultDate;
    const endDate = endInput.value;

    currentMitigations.push({ desc, responsible: resp, startDate, endDate, date: new Date().toISOString() });
    descInput.value = '';
    respInput.value = '';
    startInput.value = '';
    endInput.value = '';
    renderMitigationList();
}

function removeMitigationAction(index) {
    currentMitigations.splice(index, 1);
    renderMitigationList();
}

function closeLogForm() {
    document.getElementById('formModalOverlay').style.display = 'none';
    document.getElementById('logId').value = '';
    quill.setContents([]);
    renderLogs();
}

document.getElementById('logForm').addEventListener('submit', function(e) {
    e.preventDefault();
    const idVal = document.getElementById('logId').value;
    const isEdit = idVal !== '';
    
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    const defaultDate = now.toISOString().slice(0,16);

    const newLog = {
        id: isEdit ? parseInt(idVal) : Date.now(),
        type: document.getElementById('logType').value,
        date: isEdit ? dbImp.logs.find(l => l.id == parseInt(idVal))?.date : defaultDate,
        startDate: document.getElementById('logStartDate').value,
        endDate: document.getElementById('logEndDate').value,
        refId: document.getElementById('logRef').value,
        title: document.getElementById('logTitle').value,
        instanceId: document.getElementById('logInstanceId').value.trim(),
        responsible: document.getElementById('logResponsible').value,
        mitigations: document.getElementById('logType').value === 'risco' ? [...currentMitigations] : [],
        desc: quill.root.innerHTML
    };
    
    if (isEdit) dbImp.logs = dbImp.logs.filter(l => l.id != newLog.id);
    
    dbImp.logs.push(newLog);

    if (newLog.instanceId) {
        if (!dbImp.instances) dbImp.instances = {};
        if (!dbImp.instances[newLog.instanceId]) {
            dbImp.instances[newLog.instanceId] = { checkedSteps: [], customActs: [] };
        }
    }

    saveLogs();
    closeLogForm();
    showToast(isEdit ? "Registro atualizado!" : "Registro salvo com sucesso!", "success");
});

window.markStarted = function(id) {
    const log = dbImp.logs.find(l => l.id === id);
    if (!log) return;
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    log.startDate = now.toISOString().slice(0, 16);
    saveLogs();
    renderLogs();
    showToast("Registro iniciado!", "success");
};

window.markCompleted = function(id) {
    const log = dbImp.logs.find(l => l.id === id);
    if(!log) return;
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    const defaultDate = now.toISOString().slice(0,16);
    const res = prompt("Data/Hora de conclusão (Deixe vazio para AGORA, ou digite AAAA-MM-DDTHH:MM):", defaultDate);
    if (res === null) return;
    log.endDate = res.trim() || defaultDate;
    saveLogs();
    renderLogs();
    showToast("Registro marcado como concluído!", "success");
};

function saveLogs() {
    localStorage.setItem('pdrim_imp_v10_9', JSON.stringify(dbImp));
    localStorage.setItem('pdrim_exported', 'false');
    updateBreadcrumbs();
}

function getUniqueRacActions() {
    const actionsMap = new Map();
    racData.forEach(action => {
        if (!actionsMap.has(action.id)) {
            const allForId = racData.filter(a => a.id === action.id);
            const startAction = allForId.find(a => a.label === 'Início' || a.label === 'Evento Único') || allForId[0];
            actionsMap.set(action.id, {
                ...action,
                startDate: startAction.date || startAction.startDate
            });
        }
    });
    return Array.from(actionsMap.values()).sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
}

function updateOutOfOrderAcoes() {
    const uniqueRac = getUniqueRacActions();
    const plannedItems = uniqueRac.map(r => {
        const log = dbImp.logs.find(l => l.type === 'acao' && l.refId == r.id);
        let startTime = null;
        if (log && (log.startDate || log.date)) {
            startTime = new Date(log.startDate || log.date).getTime();
        }
        return { logId: log ? log.id : null, startTime: startTime };
    });
    
    outOfOrderAcoesIds = new Set();
    for (let i = 0; i < plannedItems.length; i++) {
        for (let j = i + 1; j < plannedItems.length; j++) {
            const a = plannedItems[i];
            const b = plannedItems[j];
            if (b.startTime !== null) {
                if (a.startTime === null) {
                    outOfOrderAcoesIds.add(b.logId);
                } else if (a.startTime > b.startTime) {
                    if (a.logId) outOfOrderAcoesIds.add(a.logId);
                    outOfOrderAcoesIds.add(b.logId);
                }
            }
        }
    }
}

function renderLogs() {
    updateOutOfOrderAcoes();
    const filterType = document.getElementById('filterType').value;
    let filtered = dbImp.logs.filter(l => filterType === 'all' || l.type === filterType);
    
    filtered.sort((a, b) => {
        let valA, valB;
        switch(currentSortCol) {
            case 'title': valA = a.title.toLowerCase(); valB = b.title.toLowerCase(); break;
            case 'type': valA = a.type.toLowerCase(); valB = b.type.toLowerCase(); break;
            case 'ref': 
                valA = (getRefName(a.type, a.refId) + ' ' + (a.instanceId || '')).toLowerCase(); 
                valB = (getRefName(b.type, b.refId) + ' ' + (b.instanceId || '')).toLowerCase(); 
                break;
            case 'endDate': 
                valA = a.endDate ? new Date(a.endDate).getTime() : 0; 
                valB = b.endDate ? new Date(b.endDate).getTime() : 0; 
                break;
            case 'startDate': default: valA = new Date(a.startDate || a.date).getTime(); valB = new Date(b.startDate || b.date).getTime(); break;
        }
        if (valA < valB) return currentSortDir === 'asc' ? -1 : 1;
        if (valA > valB) return currentSortDir === 'asc' ? 1 : -1;
        return 0;
    });

    const currentEditId = document.getElementById('logId').value;
    const viewsContainer = document.getElementById('views-container');
    if (currentEditId) viewsContainer.classList.add('editing-active');
    else viewsContainer.classList.remove('editing-active');

    const btnExpand = document.getElementById('btn-toggle-all-timeline');
    if (btnExpand) btnExpand.style.display = (currentView === 'timeline' && filtered.length > 0) ? 'inline-block' : 'none';

    if (currentView === 'cards') renderCards(filtered);
    else if (currentView === 'timeline') renderTimeline(filtered);
    else renderTable(filtered);
    
    if (currentCategoryView) renderCategoryModal();
    if (currentInstanceId) renderInstancePop();
    if (currentRiskHistoryId) window.openRiskHistory(currentRiskHistoryId);
}

window.buildMergedActsForInstance = function(instId) {
    const inst = dbImp.instances[instId];
    if (!inst) return [];

    let mergedActs = [];
    const baseActs = JSON.parse(JSON.stringify(descActivities));
    
    baseActs.forEach(baseAct => {
        const logsForThisAct = dbImp.logs.filter(l => l.type === 'atividade' && l.instanceId === instId && l.refId === baseAct.id);
        
        if (logsForThisAct.length > 0) {
            logsForThisAct.sort((a, b) => a.id - b.id);
            logsForThisAct.forEach((log, index) => {
                let duplicateAct = JSON.parse(JSON.stringify(baseAct));
                if (index > 0) {
                    duplicateAct.id = duplicateAct.id + '_dup_' + log.id;
                    duplicateAct.isDuplicate = true;
                    duplicateAct.isLatestDuplicate = (index === logsForThisAct.length - 1);
                    if (duplicateAct.steps) {
                        duplicateAct.steps.forEach(s => {
                            s.id = s.id + '_dup_' + log.id;
                        });
                    }
                } else if (logsForThisAct.length > 1) {
                    duplicateAct.isDuplicate = true;
                    duplicateAct.isLatestDuplicate = false;
                }
                duplicateAct.logId = log.id;
                mergedActs.push(duplicateAct);
            });
        } else {
            mergedActs.push(baseAct);
        }
    });

    const unforeseenLogs = dbImp.logs.filter(l => l.type === 'atividade' && l.instanceId === instId && !l.refId);
    unforeseenLogs.forEach(ulog => {
        mergedActs.push({ id: 'unforeseen_' + ulog.id, name: '🌟 Extra: ' + ulog.title, isCustom: true, logId: ulog.id, steps: [{ id: 'step_unf_' + ulog.id, desc: 'Acompanhar execução da atividade extra' }] });
    });
    mergedActs.forEach(ma => { if (!ma.steps || ma.steps.length === 0) ma.steps = [{ id: 'auto_' + ma.id, desc: 'Executar atividade principal' }]; });
    (inst.customActs || []).forEach(ca => { let ma = mergedActs.find(a => a.id === ca.id); if (ma) ma.steps = ma.steps.concat(ca.steps); else mergedActs.push(ca); });
    return mergedActs;
};

function renderCards(data) {
    const root = document.getElementById('cards-root');
    root.innerHTML = '';
    root.style.display = 'grid';
    root.style.gridTemplateColumns = 'repeat(auto-fit, minmax(300px, 1fr))';

    const activeInstances = Object.keys(dbImp.instances || {}).filter(instId => dbImp.logs.some(l => l.instanceId === instId));

    if (data.length === 0 && activeInstances.length === 0) {
        root.innerHTML = '<div class="empty-state" style="grid-column: 1 / -1;">Sem logs cadastrados.</div>';
        return;
    }
    
    const filterType = document.getElementById('filterType').value;
    
    let acoesCard = '';
    let atividadesCard = '';
    let riscosCard = '';
    let outrosCard = '';

    // 1. AÇÕES DE IMPLANTAÇÃO
    if (filterType === 'all' || filterType === 'acao') {
        const acoes = data.filter(l => l.type === 'acao');
        let content = '';
        if (acoes.length === 0) {
            content = `<div class="empty-msg">Nenhuma ação registrada.</div>`;
        } else {
            const byCat = {};
            acoes.forEach(log => {
                const racItem = racData.find(a => a.id == log.refId);
                const cat = racItem ? racItem.cat : 'Avulsas';
                if (!byCat[cat]) byCat[cat] = [];
                byCat[cat].push(log);
            });
            content += `<div style="display: flex; flex-direction: column; gap: 12px; margin-top: 10px;">`;
            for (let cat in byCat) {
                const catLogs = byCat[cat];
                const totalActs = catLogs.length;
                const completedActs = catLogs.filter(l => l.endDate).length;
                const pct = totalActs > 0 ? Math.round((completedActs / totalActs) * 100) : 0;
                
                const startTimes = catLogs.map(l => new Date(l.startDate || l.date).getTime()).filter(t => !isNaN(t));
                const minStart = startTimes.length > 0 ? new Date(Math.min(...startTimes)).toLocaleDateString('pt-BR') : '-';
                
                let maxEnd = 'Em andamento';
                if (completedActs === totalActs && totalActs > 0) {
                    const endTimes = catLogs.filter(l => l.endDate).map(l => new Date(l.endDate).getTime()).filter(t => !isNaN(t));
                    maxEnd = endTimes.length > 0 ? new Date(Math.max(...endTimes)).toLocaleDateString('pt-BR') : minStart;
                } else if (startTimes.length === 0) {
                    maxEnd = 'Pendente';
                }

                content += `
                    <div class="log-card acao hover-trigger" style="padding: 10px 12px; gap: 4px; box-shadow: 0 1px 2px rgba(0,0,0,0.03);">
                        <div style="display: flex; justify-content: space-between; align-items: center;">
                            <strong style="color: var(--text-main); font-size: 0.9rem;">${cat}</strong>
                            <span style="font-size: 0.7rem; font-weight: bold; color: ${pct === 100 ? '#166534' : '#0284c7'};">${pct}%</span>
                        </div>
                        <div style="background: #e2e8f0; height: 4px; border-radius: 2px; overflow: hidden; margin: 4px 0;">
                            <div style="background: ${pct === 100 ? '#22c55e' : '#3b82f6'}; height: 100%; width: ${pct}%;"></div>
                        </div>
                        <div style="display: flex; justify-content: space-between; font-size: 0.65rem; color: #64748b; margin-bottom: 6px;">
                            <span>${completedActs}/${totalActs} ações</span>
                            <span>🗓️ Início: ${minStart} | Fim: ${maxEnd}</span>
                        </div>
                        <span class="action-link no-print" style="font-size: 0.7rem; display: block;" onclick="openCategoryDetails('${cat}')">Ver Ações da Categoria &rarr;</span>
                    </div>
                `;
            }
            content += `</div>`;
        }
        acoesCard = `<div class="content-box" style="padding: 15px; height: 100%; box-sizing: border-box; display: flex; flex-direction: column;">
                        <h3 style="color: var(--dark-accent); border-bottom: 1px solid var(--border-color); padding-bottom: 8px; margin-top: 0; font-size: 1rem;">🚀 Ações de Implantação</h3>
                        <div id="acoes-content" style="max-height: 400px; overflow-y: hidden; padding-right: 5px; flex: 1;">${content}</div>
                        <button id="btn-acoes-content" class="btn-edit-action no-print" onclick="toggleCardHeight('acoes-content', this)" style="margin-top: 10px; width: 100%;">Ver Mais ▼</button>
                     </div>`;
    }

    // 2. ATIVIDADES DE PROCESSO
    if (filterType === 'all' || filterType === 'atividade') {
        const instances = activeInstances;
        const avulsas = data.filter(l => l.type === 'atividade' && !l.instanceId);
        let content = '';

        if (instances.length === 0 && avulsas.length === 0) {
            content = `<div class="empty-msg">Nenhuma instância ou atividade registrada.</div>`;
        } else {
            content += `<div style="display: flex; flex-direction: column; gap: 12px; margin-top: 10px;">`;
            
            instances.forEach(instId => {
                const inst = dbImp.instances[instId];
                if (!inst.stepLogs) inst.stepLogs = {};
                
                let totalSteps = 0;
                let checked = 0;
                
                let mergedActs = buildMergedActsForInstance(instId);
                
                mergedActs.forEach(a => { 
                    if (a.steps) {
                        totalSteps += a.steps.length; 
                        a.steps.forEach(s => {
                            if (inst.stepLogs[s.id] && inst.stepLogs[s.id].end) checked++;
                            else if (inst.checkedSteps && inst.checkedSteps.includes(s.id)) checked++;
                        });
                    }
                });
                
                const pct = totalSteps > 0 ? Math.round((checked / totalSteps) * 100) : 0;
                const instLogs = dbImp.logs.filter(l => l.instanceId === instId);
                let timeStr = 'N/A';
                
                if (instLogs.length > 0) {
                    const startTimes = instLogs.map(l => new Date(l.startDate || l.date).getTime());
                    const minStart = Math.min(...startTimes);
                    const endTimes = instLogs.map(l => l.endDate ? new Date(l.endDate).getTime() : Date.now());
                    const maxEnd = Math.max(...endTimes);
                    const diffMs = maxEnd - minStart;
                    if (diffMs > 0) {
                        const d = Math.floor(diffMs / 86400000);
                        const h = Math.floor((diffMs % 86400000) / 3600000);
                        const m = Math.floor((diffMs % 3600000) / 60000);
                        timeStr = `${d > 0 ? d+'d ' : ''}${h}h ${m}m`;
                    }
                }
                
                let isDeletingThis = selectedForDeletion.includes('inst_' + instId);
                let partialDelete = false;

                const logsToDelete = instLogs.filter(l => selectedForDeletion.includes(l.id));
                if (logsToDelete.length > 0) {
                    if (logsToDelete.length === instLogs.length) {
                        isDeletingThis = true;
                    } else {
                        partialDelete = true;
                    }
                }
                const checkedAttr = isDeletingThis ? 'checked' : '';
                const deleteClass = isDeletingThis ? 'deleting-card' : '';

                let passosHtml = `<span>${checked}/${totalSteps} passos</span>`;
                if (partialDelete) {
                    passosHtml = `<span style="color: #ef4444; font-weight: bold;">⚠️ ${logsToDelete.length} tarefa(s) na lixeira | ${checked}/${totalSteps} passos</span>`;
                } else if (isDeletingThis && logsToDelete.length > 0 && !selectedForDeletion.includes('inst_' + instId)) {
                    passosHtml = `<span style="color: #ef4444; font-weight: bold;">⚠️ Exclusão total pendente</span>`;
                }

                content += `
                    <div class="log-card atividade hover-trigger ${deleteClass}" id="inst-card-${instId}" style="padding: 10px 12px; gap: 4px; box-shadow: 0 1px 2px rgba(0,0,0,0.03);">
                        <div class="no-print hover-target" style="top: auto; bottom: 8px; right: 8px;">
                            <span style="cursor:pointer; color:#ef4444; font-size: 1rem; line-height: 1;" onclick="deleteInstance('${instId}')" title="Excluir Instância">✕</span>
                        </div>
                        <div style="display: flex; justify-content: space-between; align-items: center;">
                            <div style="display: flex; align-items: center; gap: 6px;">
                                <input type="checkbox" class="delete-checkbox" value="inst_${instId}" onchange="handleCheckboxChange(this)" ${checkedAttr}>
                                <strong style="color: var(--text-main); font-size: 0.9rem;">${instId}</strong>
                            </div>
                            <span style="font-size: 0.7rem; font-weight: bold; color: ${pct === 100 ? '#166534' : '#0284c7'};">${pct}%</span>
                        </div>
                        <div style="background: #e2e8f0; height: 4px; border-radius: 2px; overflow: hidden; margin: 4px 0;">
                                <div style="background: #22c55e; height: 100%; width: ${pct}%;"></div>
                        </div>
                        <div style="display: flex; justify-content: space-between; font-size: 0.65rem; color: #64748b; margin-bottom: 6px;">
                            ${passosHtml}
                            <span>⏱️ ${timeStr}</span>
                        </div>
                        <span class="action-link no-print" style="font-size: 0.7rem; display: block;" onclick="openInstanceProgress('${instId}')">Acompanhar POP &rarr;</span>
                    </div>
                `;
            });

            if (avulsas.length > 0) {
                content += `<div style="margin-top: 10px;">
                            <h4 style="font-size: 0.7rem; color: #64748b; text-transform: uppercase; margin-top: 0; margin-bottom: 6px;">Atividades Avulsas</h4>
                            <div style="display: flex; flex-direction: column; gap: 6px;">`;
                avulsas.forEach(log => { content += generateMiniLogCard(log); });
                content += `</div></div>`;
            }
            content += `</div>`;
        }
        atividadesCard = `<div class="content-box" style="padding: 15px; height: 100%; box-sizing: border-box; display: flex; flex-direction: column;">
                            <h3 style="color: var(--dark-accent); border-bottom: 1px solid var(--border-color); padding-bottom: 8px; margin-top: 0; font-size: 1rem;">📋 Atividades de Processo</h3>
                            <div id="atividades-content" style="max-height: 400px; overflow-y: hidden; padding-right: 5px; flex: 1;">${content}</div>
                            <button id="btn-atividades-content" class="btn-edit-action no-print" onclick="toggleCardHeight('atividades-content', this)" style="margin-top: 10px; width: 100%;">Ver Mais ▼</button>
                          </div>`;
    }

    // 3. INCIDENTES DE RISCO
    if (filterType === 'all' || filterType === 'risco') {
        const riscos = data.filter(l => l.type === 'risco');
        let content = '';
        if (riscos.length === 0) {
            content = `<div class="empty-msg">Nenhum incidente registrado.</div>`;
        } else {
            content += `<div style="display: flex; flex-direction: column; gap: 6px; margin-top: 10px;">`;
            riscos.forEach(log => { content += generateMiniLogCard(log, true); });
            content += `</div>`;
        }
        riscosCard = `<div class="content-box" style="padding: 15px; height: 100%; box-sizing: border-box; display: flex; flex-direction: column;">
                        <h3 style="color: var(--dark-accent); border-bottom: 1px solid var(--border-color); padding-bottom: 8px; margin-top: 0; font-size: 1rem;">⚠️ Incidentes de Risco</h3>
                        <div id="riscos-content" style="max-height: 400px; overflow-y: hidden; padding-right: 5px; flex: 1;">${content}</div>
                        <button id="btn-riscos-content" class="btn-edit-action no-print" onclick="toggleCardHeight('riscos-content', this)" style="margin-top: 10px; width: 100%;">Ver Mais ▼</button>
                      </div>`;
    }

    // 4. OUTROS REGISTROS
    if (filterType === 'all' || filterType === 'outro') {
        const outros = data.filter(l => l.type === 'outro');
        let content = '';
        if (outros.length === 0) {
            content = `<div class="empty-msg">Nenhum registro avulso.</div>`;
        } else {
            content += `<div style="display: flex; flex-direction: column; gap: 6px; margin-top: 10px;">`;
            outros.forEach(log => { content += generateMiniLogCard(log); });
            content += `</div>`;
        }
        outrosCard = `<div class="content-box" style="padding: 15px; height: 100%; box-sizing: border-box; display: flex; flex-direction: column;">
                        <h3 style="color: var(--dark-accent); border-bottom: 1px solid var(--border-color); padding-bottom: 8px; margin-top: 0; font-size: 1rem;">📝 Outros Registros</h3>
                        <div id="outros-content" style="max-height: 400px; overflow-y: hidden; padding-right: 5px; flex: 1;">${content}</div>
                        <button id="btn-outros-content" class="btn-edit-action no-print" onclick="toggleCardHeight('outros-content', this)" style="margin-top: 10px; width: 100%;">Ver Mais ▼</button>
                      </div>`;
    }

    if (filterType === 'all') {
        root.innerHTML = acoesCard + atividadesCard + riscosCard + outrosCard;
    } else {
        root.style.gridTemplateColumns = '1fr';
        if (filterType === 'acao') root.innerHTML = acoesCard;
        if (filterType === 'atividade') root.innerHTML = atividadesCard;
        if (filterType === 'risco') root.innerHTML = riscosCard;
        if (filterType === 'outro') root.innerHTML = outrosCard;
    }

    // Oculta os botões "Ver Mais" onde o conteúdo for pequeno
    ['acoes-content', 'atividades-content', 'riscos-content', 'outros-content'].forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            const btn = document.getElementById('btn-' + id);
            if (el.scrollHeight <= 400) {
                if (btn) btn.style.display = 'none';
                el.style.maxHeight = 'none'; 
            } else {
                if (btn) btn.style.display = 'flex';
            }
        }
    });
}

window.toggleCardHeight = function(contentId, btn) {
    const el = document.getElementById(contentId);
    if (el.style.maxHeight === '400px') {
        el.style.maxHeight = 'none';
        btn.innerHTML = 'Ver Menos ▲';
    } else {
        el.style.maxHeight = '400px';
        btn.innerHTML = 'Ver Mais ▼';
        el.parentElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
};

window.generateMiniLogCard = function(log, isRisk = false) {
    const sDt = log.startDate ? new Date(log.startDate) : new Date(log.date);
    const dStr = sDt.toLocaleDateString('pt-BR') + ' ' + sDt.toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'});
    const refText = getRefName(log.type, log.refId);
    
    let statusTag = '';
    if (log.endDate) {
        statusTag = `<span style="color: #166534; font-weight: 700; font-size: 0.65rem;" title="Concluído em ${new Date(log.endDate).toLocaleString('pt-BR')}">✓ Concluído</span>`;
    } else {
        statusTag = '';
        if (log.startDate) {
            statusTag += `<span style="color: #92400e; font-weight: 700; font-size: 0.65rem;">⌛ Em andamento</span>`;
        } else {
            statusTag += `<span style="color: #475569; font-weight: 700; font-size: 0.65rem;">⏳ Pendente</span>`;
            statusTag += `<span class="action-link no-print" style="margin-left: 6px; font-size: 0.6rem;" onclick="event.stopPropagation(); markStarted(${log.id})">Iniciar</span>`;
        }
        statusTag += `<span class="action-link no-print" style="margin-left: 6px; font-size: 0.6rem;" onclick="event.stopPropagation(); markCompleted(${log.id})">Concluir</span>`;
    }
    
    const isDeletingThis = selectedForDeletion.includes(log.id);
    const checkedAttr = isDeletingThis ? 'checked' : '';
    const deleteClass = isDeletingThis ? 'deleting-card' : '';

    let extraInfo = '';
    if (log.responsible) extraInfo += `<span style="margin-right:10px;">👤 ${log.responsible}</span>`;
    if (log.mitigations && log.mitigations.length > 0) {
        extraInfo += `<span style="color:var(--danger);">🛡️ ${log.mitigations.length} Ação(ões) de Mitigação</span>`;
    } else if (log.mitigation) {
        extraInfo += `<span style="color:var(--danger);">🛡️ Mitigação: ${log.mitigation}</span>`;
    }

    let riskHistoryBtn = isRisk ? `<span class="action-link no-print" style="font-size: 0.65rem; display: block; margin-top: 4px;" onclick="event.stopPropagation(); openRiskHistory(${log.id})">Ver Histórico &rarr;</span>` : '';
    let instLink = log.instanceId ? `<span class="action-link" style="margin-left:4px;" onclick="event.stopPropagation(); openInstanceProgress('${log.instanceId}')">🔗 ${log.instanceId}</span>` : '';

    const isOutOfOrder = log.type === 'acao' && outOfOrderAcoesIds.has(log.id);
    const outOfOrderStyle = isOutOfOrder ? 'border: 2px dashed #ef4444; border-left: 6px dashed #ef4444 !important;' : '';

    return `
        <div class="log-card ${log.type} ${deleteClass} hover-trigger" id="log-card-${log.id}" style="padding: 10px 12px; gap: 4px; box-shadow: 0 1px 2px rgba(0,0,0,0.03); ${outOfOrderStyle}">
            <div class="no-print hover-target" style="top: auto; bottom: 8px; right: 8px;">
                <span style="cursor:pointer; color:#0284c7; font-size: 1rem; line-height: 1;" onclick="event.stopPropagation(); openLogForm('${log.type}', ${log.id})" title="Editar">✎</span>
                <span style="cursor:pointer; color:#ef4444; font-size: 1rem; line-height: 1; margin-left: 8px;" onclick="event.stopPropagation(); deleteSingleLog(${log.id})" title="Excluir">✕</span>
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2px;">
                <div style="display: flex; align-items: center; gap: 6px;">
                    <input type="checkbox" class="delete-checkbox" value="${log.id}" onchange="handleCheckboxChange(this)" ${checkedAttr}>
                    <span style="font-size: 0.65rem; color: #94a3b8; font-weight: 600;">${dStr}</span>
                    ${isOutOfOrder ? '<span title="Executado fora da ordem prevista" style="cursor:help; font-size:0.8rem;">⚠️</span>' : ''}
                </div>
                <div>${statusTag}</div>
            </div>
            <strong style="color: var(--text-main); font-size: 0.85rem; line-height: 1.3; display: block; word-break: break-word;">${log.title}</strong>
            ${(refText || instLink) ? `<div style="font-size: 0.7rem; color: #64748b; margin-top: 2px;">${refText ? `${refText}` : ''} ${instLink}</div>` : ''}
            ${extraInfo ? `<div style="font-size: 0.7rem; color: #475569; margin-top: 2px;">${extraInfo}</div>` : ''}
            ${riskHistoryBtn}
        </div>
    `;
};

window.openRiskHistory = function(logId) {
    currentRiskHistoryId = logId;
    const log = dbImp.logs.find(l => l.id == logId);
    if(!log) return;
    
    const container = document.getElementById('riskHistoryContainer');
    let html = `<div style="margin-bottom: 15px; padding: 15px; background: #fef2f2; border: 1px solid #fecaca; border-radius: 6px;">
        <h3 style="margin: 0 0 10px 0; color: #7f1d1d; font-size: 1.1rem;">${log.title}</h3>
        <p style="margin: 0; font-size: 0.85rem; color: #991b1b;"><b>Referência:</b> ${getRefName(log.type, log.refId) || 'Nenhuma'}</p>
        <p style="margin: 5px 0 0 0; font-size: 0.85rem; color: #991b1b;"><b>Responsável Principal:</b> ${log.responsible || 'Não informado'}</p>
        ${(log.desc && log.desc !== '<p><br></p>') ? `<div style="margin-top: 10px; font-size: 0.85rem; color: #475569;">${log.desc}</div>` : ''}
    </div>`;
    
    html += `<h4 style="border-bottom: 1px solid #e2e8f0; padding-bottom: 5px; color: #334155; margin-bottom: 15px;">Ações de Mitigação do Incidente</h4>`;
    if (log.mitigations && log.mitigations.length > 0) {
        html += `<div style="display: flex; flex-direction: column; gap: 10px; margin-bottom: 20px;">`;
        log.mitigations.forEach(m => {
            const startStr = m.startDate ? new Date(m.startDate).toLocaleString('pt-BR') : '-';
            const endStr = m.endDate ? new Date(m.endDate).toLocaleString('pt-BR') : 'Em andamento';
            html += `<div style="padding: 10px; border: 1px solid #e2e8f0; border-radius: 6px; background: #fff;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                    <span class="log-tag acao">Ação de Mitigação</span>
                    <span style="font-size: 0.75rem; color: #64748b;">Início: ${startStr} | Fim: ${endStr}</span>
                </div>
                <strong style="font-size: 0.9rem; color: #1e293b;">${m.desc}</strong>
                <div style="font-size: 0.8rem; color: #475569; margin-top: 4px;"><b>Executado por:</b> ${m.responsible}</div>
            </div>`;
        });
        html += `</div>`;
    } else {
        html += `<p style="font-size: 0.85rem; color: #64748b; margin-bottom: 20px;">Nenhuma ação de mitigação específica foi registrada para este incidente.</p>`;
    }
    
    let related = log.refId ? dbImp.logs.filter(l => l.refId === log.refId && l.id !== log.id) : [];
    html += `<h4 style="border-bottom: 1px solid #e2e8f0; padding-bottom: 5px; color: #334155; margin-bottom: 15px;">Histórico de Outros Registros Relacionados ao Risco</h4>`;
    
    if (related.length === 0) {
        html += `<p style="font-size: 0.85rem; color: #64748b;">Nenhuma outra ação vinculada a este risco foi registrada.</p>`;
    } else {
        html += `<div style="display: flex; flex-direction: column; gap: 10px;">`;
        related.forEach(r => {
            const date = new Date(r.startDate || r.date).toLocaleString('pt-BR');
            html += `<div style="padding: 10px; border: 1px solid #e2e8f0; border-radius: 6px; background: #f8fafc;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                    <span class="log-tag ${r.type}">${getTypeName(r.type)}</span>
                    <span style="font-size: 0.75rem; color: #64748b;">${date}</span>
                </div>
                <strong style="font-size: 0.9rem; color: #1e293b;">${r.title}</strong>
                ${r.responsible ? `<div style="font-size: 0.8rem; color: #475569; margin-top: 4px;"><b>Resp:</b> ${r.responsible}</div>` : ''}
                ${(r.desc && r.desc !== '<p><br></p>') ? `<div style="font-size: 0.8rem; color: #475569; margin-top: 4px;">${r.desc}</div>` : ''}
            </div>`;
        });
        html += `</div>`;
    }
    
    container.innerHTML = html;
    document.getElementById('riskHistoryModal').style.display = 'flex';
};

window.closeRiskHistoryModal = function() {
    document.getElementById('riskHistoryModal').style.display = 'none';
    currentRiskHistoryId = null;
}

function renderTimeline(data) {
    const root = document.getElementById('timeline-root');
    const empty = document.getElementById('timeline-empty');
    root.innerHTML = '';
    
    if (data.length === 0) {
        if (empty) empty.style.display = 'block';
        root.style.display = 'none';
        return;
    }
    if (empty) empty.style.display = 'none';
    root.style.display = 'block';

    data.forEach((log, index) => {
        const isBound = (index === 0 || index === data.length - 1 || log.endDate);
        const sDt = log.startDate ? new Date(log.startDate) : new Date(log.date);
        const dStr = sDt.toLocaleDateString('pt-BR');
        const hStr = sDt.toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'});
        
        let statusTag = '';
        if (log.endDate) {
            statusTag = `<span class="status-badge concluido">✓ Concluído</span>`;
        } else {
            statusTag = '';
            if (log.startDate) {
                statusTag += `<span class="status-badge andamento">⌛ Em andamento</span><br>`;
            } else {
                statusTag += `<span class="status-badge" style="background:#f1f5f9; color:#475569; border-color:#cbd5e1;">⏳ Pendente</span><br>`;
                statusTag += `<button class="btn-edit-action no-print" style="margin-top: 4px; margin-right: 4px; background:#fef3c7; color:#92400e;" onclick="markStarted(${log.id})">Iniciar</button>`;
            }
            statusTag += `<button class="btn-edit-action no-print" style="margin-top: 4px; background:#dcfce7; color:#166534;" onclick="markCompleted(${log.id})">Concluir</button>`;
        }

        let instLink = log.instanceId ? `<span class="action-link" style="margin-left:6px;" onclick="openInstanceProgress('${log.instanceId}')">🔗 ID: ${log.instanceId}</span>` : '';
        let extraInfo = '';
        if (log.responsible) extraInfo += `<span style="display:inline-block; margin-right:15px;"><b>Responsável:</b> ${log.responsible}</span>`;
        if (log.mitigations && log.mitigations.length > 0) extraInfo += `<span style="display:inline-block; margin-right:15px; color:var(--danger);"><b>Ações de Mitigação:</b> ${log.mitigations.length}</span>`;
        
        const isDeletingThis = selectedForDeletion.includes(log.id);
        const checkedAttr = isDeletingThis ? 'checked' : '';
        const tmItemDeleteClass = isDeletingThis ? 'deleting-tm-item' : '';
        const cardDeleteClass = isDeletingThis ? 'deleting-card' : '';
        const refText = getRefName(log.type, log.refId);
        
        const isOutOfOrder = log.type === 'acao' && outOfOrderAcoesIds.has(log.id);
        const outOfOrderStyle = isOutOfOrder ? 'border: 2px dashed #ef4444; border-left: 6px dashed #ef4444 !important;' : '';

        root.insertAdjacentHTML('beforeend', `
            <div class="tm-item ${tmItemDeleteClass}">
                <div class="tm-left">
                    <input type="checkbox" class="delete-checkbox" value="${log.id}" onchange="handleCheckboxChange(this)" style="vertical-align: middle; margin-right: 4px;" ${checkedAttr}>
                    <span class="tm-date ${isBound ? 'bound' : 'regular'}">${dStr}</span>
                    <span class="tm-tag">${hStr}</span>
                </div>
                <div class="tm-center"></div>
                <div class="marker ${isBound ? (index === 0 ? 'start' : 'end') : 'mid'}"></div>
                <div class="tm-right">
                    <div class="timeline-card-wrapper">
                        <div class="timeline-card ${log.type} ${cardDeleteClass}" style="display: ${timelineExpandedAll ? 'block' : 'none'}; ${outOfOrderStyle}" id="card-${index}">
                            <div class="card-title" style="margin-bottom: 8px; padding-right: 120px;">
                                <span style="font-size: 1.1rem; font-weight: 800; color: var(--dark-accent);">${log.title} ${isOutOfOrder ? '<span title="Executado fora da ordem prevista" style="cursor:help; font-size:1rem;">⚠️</span>' : ''}</span>
                                <span class="no-print action-link" style="font-size:0.75rem; color: var(--accent); text-decoration: underline; cursor: pointer;" onclick="toggleCardExpansion(${index}, false)">(Ocultar detalhes)</span>
                            </div>
                            <div style="margin-bottom: 8px;"><span class="log-tag ${log.type}">${getTypeName(log.type)}</span></div>
                            <div style="font-size: 0.75rem; color: #64748b;">${refText ? `<b>Ref:</b> ${refText}` : ''} ${instLink}</div>
                            ${extraInfo ? `<div style="font-size: 0.75rem; color: #475569; margin-top: 5px; background: #f8fafc; padding: 6px; border-radius: 4px; border-left: 3px solid #cbd5e1;">${extraInfo}</div>` : ''}
                            ${(log.desc && log.desc !== '<p><br></p>') ? `<div class="card-content" style="margin-top: 10px;">${log.desc}</div>` : ''}
                            <div class="no-print hover-target">
                                <span style="cursor:pointer; color:#0284c7; font-size: 1.1rem;" onclick="openLogForm('${log.type}', ${log.id})" title="Editar">✎</span>
                            </div>
                        </div>
                        <div class="timeline-text-view hover-trigger" id="text-view-${index}" style="display: ${timelineExpandedAll ? 'none' : 'flex'}; align-items: center; gap: 8px; width: 100%; position: relative;">
                            <span class="log-tag ${log.type}" style="flex-shrink: 0;">${getTypeName(log.type)}</span>
                            <div style="font-weight: 600; color: var(--dark-accent); flex: 1; display: flex; align-items: center; min-width: 0; padding-right: 10px;">
                                <span style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-right: 6px;">${log.title}</span>
                                <span style="flex-shrink: 0; display: flex; align-items: center;"><span class="no-print action-link" style="font-size:0.75rem; color: var(--accent); text-decoration: underline; cursor: pointer; margin-left: 6px;" onclick="toggleCardExpansion(${index}, true)">(Ver detalhes)</span></span>
                            </div>
                            <div style="margin-right: 35px; flex-shrink: 0; text-align:right;">${statusTag}</div>
                            <div class="no-print hover-target" style="right: 8px; top: 50%; transform: translateY(-50%);">
                                <span style="cursor:pointer; color:#0284c7; font-size: 1rem;" onclick="openLogForm('${log.type}', ${log.id})" title="Editar">✎</span>
                                <span style="cursor:pointer; color:#ef4444; font-size: 1rem; margin-left: 8px;" onclick="deleteSingleLog(${log.id})" title="Excluir">✕</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `);
        if (index !== data.length - 1) {
            root.insertAdjacentHTML('beforeend', `<div class="tm-item no-print" style="min-height: 30px; padding: 0;"><div class="tm-left" style="border-bottom: 2px dotted var(--border-color); height: 15px; margin-bottom: 15px; margin-left: 30px;"></div><div class="tm-center"></div><div class="tm-right" style="border-bottom: 2px dotted var(--border-color); height: 15px; margin-bottom: 15px; margin-right: 30px;"></div></div>`);
        }
    });
}

function renderTable(data) {
    const root = document.getElementById('table-body');
    const empty = document.getElementById('table-empty');
    const table = document.getElementById('table-content');
    root.innerHTML = '';
    if (data.length === 0) {
        if (empty) empty.style.display = 'block';
        if (table) table.style.display = 'none';
        return;
    }
    if (empty) empty.style.display = 'none';
    if (table) table.style.display = 'table';

    data.forEach(log => {
        const sDt = log.startDate ? new Date(log.startDate) : new Date(log.date);
        const dStr = sDt.toLocaleDateString('pt-BR') + ' ' + sDt.toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'});
        const eDt = log.endDate ? new Date(log.endDate) : null;
        const eStr = eDt ? eDt.toLocaleDateString('pt-BR') + ' ' + eDt.toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'}) : '-';
        
        let statusTag = '';
        if (log.endDate) {
            statusTag = `<span class="status-badge concluido" title="${new Date(log.endDate).toLocaleString('pt-BR')}">✓</span>`;
        } else {
            statusTag = '';
            if (!log.startDate) {
                statusTag += `<button class="btn-edit-action no-print" style="background:#fef3c7; color:#92400e; margin-right: 4px;" onclick="markStarted(${log.id})" title="Iniciar">Iniciar</button>`;
            }
            statusTag += `<button class="btn-edit-action no-print" style="background:#dcfce7; color:#166534;" onclick="markCompleted(${log.id})" title="Marcar como Concluído">Concluir</button>`;
        }
        
        let instLink = log.instanceId ? `<span class="action-link" style="display:block; margin-top:2px;" onclick="openInstanceProgress('${log.instanceId}')">🔗 ID: ${log.instanceId}</span>` : '';
        const isDeletingThis = selectedForDeletion.includes(log.id);
        const checkedAttr = isDeletingThis ? 'checked' : '';
        const tableRowDeleteClass = isDeletingThis ? 'deleting-table-row' : '';
        const refText = getRefName(log.type, log.refId);
        
        const isOutOfOrder = log.type === 'acao' && outOfOrderAcoesIds.has(log.id);
        const outOfOrderStyle = isOutOfOrder ? 'border-top: 2px dashed #ef4444 !important; border-bottom: 2px dashed #ef4444 !important;' : '';

        root.insertAdjacentHTML('beforeend', `
            <tr class="action-row hover-trigger ${tableRowDeleteClass}" id="row-${log.id}" style="${outOfOrderStyle}">
                <td><input type="checkbox" class="delete-checkbox" value="${log.id}" onchange="handleCheckboxChange(this)" ${checkedAttr}></td>
                <td><div style="font-size:0.75rem;">${dStr}</div></td>
                <td><div style="font-size:0.75rem;">${eStr}</div><div style="margin-top:2px;">${statusTag}</div></td>
                <td><b>${log.title}</b> ${isOutOfOrder ? '<span title="Executado fora da ordem prevista" style="cursor:help; font-size:0.9rem;">⚠️</span>' : ''}</td>
                <td><span class="log-tag ${log.type}">${getTypeName(log.type)}</span></td>
                <td style="font-size: 0.75rem; color: #64748b;">${refText || '-'} ${instLink}</td>
                <td class="no-print" style="position: relative; text-align: center;">
                    <span style="color: #cbd5e1; font-size: 1.2rem; cursor: help;" title="Passe o mouse para opções">...</span>
                    <div class="no-print hover-target" style="top: 50%; transform: translateY(-50%); right: 15px; margin: 0;">
                        <span style="cursor:pointer; color:#0284c7; font-size: 1.1rem; line-height: 1;" onclick="openLogForm('${log.type}', ${log.id})" title="Editar">✎</span>
                        <span style="cursor:pointer; color:#ef4444; font-size: 1.1rem; line-height: 1; margin-left: 8px;" onclick="deleteSingleLog(${log.id})" title="Excluir">✕</span>
                    </div>
                </td>
            </tr>
        `);
    });
    updateSortHeaders();
}

/* --- GESTÃO DO MODAL DE AÇÕES DE IMPLANTAÇÃO POR CATEGORIA --- */
window.openCategoryDetails = function(cat) {
    currentCategoryView = cat;
    document.getElementById('categoryModalName').innerText = cat;
    renderCategoryModal();
    document.getElementById('categoryModal').style.display = 'flex';
};

window.closeCategoryModal = function() {
    document.getElementById('categoryModal').style.display = 'none';
    currentCategoryView = null;
};

window.renderCategoryModal = function() {
    if (!currentCategoryView) return;
    const container = document.getElementById('categoryModalContainer');
    const acoes = dbImp.logs.filter(l => l.type === 'acao');
    const byCat = {};
    acoes.forEach(log => {
        const racItem = racData.find(a => a.id == log.refId);
        const c = racItem ? racItem.cat : 'Avulsas';
        if (!byCat[c]) byCat[c] = [];
        byCat[c].push(log);
    });

    const logs = byCat[currentCategoryView] || [];
    if (logs.length === 0) {
        container.innerHTML = '<div class="empty-msg">Nenhuma ação cadastrada nesta categoria.</div>';
        return;
    }

    let html = '';
    logs.forEach(log => {
        html += generateMiniLogCard(log);
    });
    container.innerHTML = html;
};

/* --- GESTÃO DO MODAL DE INSTÂNCIA DO PROCESSO (POP) --- */
let currentInstanceId = null;
function openInstanceProgress(instId) {
    currentInstanceId = instId;
    if (!dbImp.instances) dbImp.instances = {};
    if (!dbImp.instances[instId]) dbImp.instances[instId] = { checkedSteps: [], customActs: [] };
    
    document.getElementById('instanceModalId').innerText = instId;
    renderInstancePop();
    document.getElementById('instanceModal').style.display = 'flex';
}
function closeInstanceModal() {
    document.getElementById('instanceModal').style.display = 'none';
    currentInstanceId = null;
}
window.startInstanceStep = function(actId, stepId) {
    const inst = dbImp.instances[currentInstanceId];
    if (!inst.stepLogs) inst.stepLogs = {};
    inst.stepLogs[stepId] = { start: new Date().toISOString() };
    syncActivityDates(actId);
    saveLogs();
    renderInstancePop();
}
window.concludeInstanceStep = function(actId, stepId) {
    const inst = dbImp.instances[currentInstanceId];
    if (!inst.stepLogs) inst.stepLogs = {};
    if (!inst.stepLogs[stepId]) inst.stepLogs[stepId] = {};
    inst.stepLogs[stepId].end = new Date().toISOString();
    if (!inst.checkedSteps) inst.checkedSteps = [];
    if (!inst.checkedSteps.includes(stepId)) inst.checkedSteps.push(stepId);
    syncActivityDates(actId);
    saveLogs(); renderInstancePop(); renderLogs();
}
window.resetInstanceStep = function(actId, stepId) {
    const inst = dbImp.instances[currentInstanceId];
    if (inst.stepLogs) delete inst.stepLogs[stepId];
    if (inst.checkedSteps) inst.checkedSteps = inst.checkedSteps.filter(id => id !== stepId);
    syncActivityDates(actId);
    saveLogs(); renderInstancePop(); renderLogs();
}
window.skipInstanceStep = function(actId, stepId) {
    const inst = dbImp.instances[currentInstanceId];
    if (!inst.stepLogs) inst.stepLogs = {};
    if (!inst.stepLogs[stepId]) inst.stepLogs[stepId] = {};
    inst.stepLogs[stepId].end = new Date().toISOString();
    inst.stepLogs[stepId].status = 'na';
    if (!inst.checkedSteps) inst.checkedSteps = [];
    if (!inst.checkedSteps.includes(stepId)) inst.checkedSteps.push(stepId);
    syncActivityDates(actId);
    saveLogs(); renderInstancePop(); renderLogs();
};

window.registerInstanceActivity = function(actId) {
    const act = descActivities.find(a => a.id === actId);
    if (!act) return;
    
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    const defaultDate = now.toISOString().slice(0,16);

    const newLog = {
        id: Date.now(),
        type: 'atividade',
        date: defaultDate,
        startDate: '',
        endDate: '',
        refId: actId,
        title: act.name,
        instanceId: currentInstanceId,
        responsible: act.sector || '',
        mitigations: [],
        desc: ''
    };
    
    dbImp.logs.push(newLog);
    saveLogs();
    renderLogs();
    renderInstancePop();
    showToast("Atividade registrada na instância!", "success");
};

window.editInstanceExtraStep = function(actId, stepId) {
    const inst = dbImp.instances[currentInstanceId];
    if (!inst) return;
    let act = inst.customActs.find(a => a.id === actId);
    if (!act) return;
    let step = act.steps.find(s => s.id === stepId);
    if (!step) return;
    const newDesc = prompt("Edite a descrição do passo:", step.desc);
    if (newDesc && newDesc.trim() !== '') {
        step.desc = newDesc.trim();
        saveLogs();
        renderInstancePop();
    }
};

window.syncActivityDates = function(actId) {
    const inst = dbImp.instances[currentInstanceId];
    if (!inst) return;

    let mergedActs = JSON.parse(JSON.stringify(descActivities)); 
    mergedActs = buildMergedActsForInstance(currentInstanceId);

    const actObj = mergedActs.find(a => a.id === actId);
    if (!actObj) return;

    let minStart = Infinity;
    let maxEnd = 0;
    let allFinished = true;
    let anyStarted = false;
    
    actObj.steps.forEach(s => {
        const slog = inst.stepLogs && inst.stepLogs[s.id];
        if (slog && slog.start) {
            anyStarted = true;
            minStart = Math.min(minStart, new Date(slog.start).getTime());
        }
        if (slog && slog.end) {
            maxEnd = Math.max(maxEnd, new Date(slog.end).getTime());
        } else if (inst.checkedSteps && inst.checkedSteps.includes(s.id)) {
            // Passo verificado como N/A (Status preenchido sem duração de tempo)
        } else {
            allFinished = false;
        }
    });

    let actLog = null;
    if (actObj.logId) {
        actLog = dbImp.logs.find(l => l.id === actObj.logId);
    } else {
        actLog = dbImp.logs.find(l => l.type === 'atividade' && l.instanceId === currentInstanceId && l.refId === actId);
    }

    if (actLog) {
        if (anyStarted && minStart !== Infinity) {
            const sd = new Date(minStart);
            sd.setMinutes(sd.getMinutes() - sd.getTimezoneOffset());
            actLog.startDate = sd.toISOString().slice(0, 16);
        } else {
            actLog.startDate = '';
        }

        if (allFinished && (anyStarted || maxEnd !== 0)) {
            const ed = new Date(maxEnd !== 0 ? maxEnd : Date.now());
            ed.setMinutes(ed.getMinutes() - ed.getTimezoneOffset());
            actLog.endDate = ed.toISOString().slice(0, 16);
        } else {
            actLog.endDate = '';
        }
    }
};

window.unregisterInstanceActivity = function(actId) {
    if (confirm("Tem certeza que deseja desfazer o registro desta atividade? Isso apagará o log e redefinirá os passos.")) {
        const inst = dbImp.instances[currentInstanceId];
        
        let mergedActs = buildMergedActsForInstance(currentInstanceId);
        const actObj = mergedActs.find(a => a.id === actId);
        
        let actLog = null;
        if (actObj && actObj.logId) {
            actLog = dbImp.logs.find(l => l.id === actObj.logId);
        } else {
            actLog = dbImp.logs.find(l => l.type === 'atividade' && l.instanceId === currentInstanceId && l.refId === actId);
        }

        if (actLog) dbImp.logs = dbImp.logs.filter(l => l.id !== actLog.id);
        
        if (actObj && actObj.steps) {
            actObj.steps.forEach(s => {
                if (inst.stepLogs) delete inst.stepLogs[s.id];
                if (inst.checkedSteps) inst.checkedSteps = inst.checkedSteps.filter(id => id !== s.id);
            });
        }
        
        if (inst.customActs) {
            inst.customActs = inst.customActs.filter(ca => ca.id !== actId);
        }

        saveLogs();
        renderInstancePop();
        renderLogs();
        showToast("Registro da atividade desfeito!", "success");
    }
};

function getActStartTime(a, inst) {
    let startTime = null;
    let actLog = null;
    if (a.logId) {
        actLog = dbImp.logs.find(l => l.id === a.logId);
    } else {
        actLog = dbImp.logs.find(l => l.type === 'atividade' && l.instanceId === currentInstanceId && l.refId === a.id);
    }
    if (actLog && actLog.startDate) {
        startTime = new Date(actLog.startDate || actLog.date).getTime();
    }
    if (!startTime && a.steps) {
        let earliest = Infinity;
        a.steps.forEach(s => {
            const slog = inst.stepLogs && inst.stepLogs[s.id];
            if (slog && slog.start) {
                earliest = Math.min(earliest, new Date(slog.start).getTime());
            }
        });
        if (earliest !== Infinity) startTime = earliest;
    }
    return startTime;
}

function addInstanceExtraStep(actId) {
    const desc = prompt("Descreva o passo adicional:");
    if (!desc) return;
    const inst = dbImp.instances[currentInstanceId];
    if (!inst.customActs) inst.customActs = [];
    let act = inst.customActs.find(a => a.id === actId);
    if (!act) {
        let mergedActs = buildMergedActsForInstance(currentInstanceId);
        const baseAct = mergedActs.find(a => a.id === actId);
        
        if (baseAct) {
            act = { id: actId, name: baseAct.name, etapa: baseAct.etapa, isCustom: baseAct.isCustom || false, steps: [] };
            inst.customActs.push(act);
        }
    }
    if (act) {
        act.steps.push({ id: 'cstep_' + Date.now(), desc: desc });
        saveLogs();
        renderInstancePop();
    }
}
function renderInstancePop() {
    const container = document.getElementById('instancePopContainer');
    const inst = dbImp.instances[currentInstanceId];
    if (!inst.stepLogs) inst.stepLogs = {};
    
    let mergedActs = buildMergedActsForInstance(currentInstanceId);
    
    let plannedItems = [];
    mergedActs.forEach(a => {
        if (!a.isCustom) {
            plannedItems.push({ id: a.id, startTime: getActStartTime(a, inst) });
        }
    });
    
    const outOfOrderIds = new Set();
    for (let i = 0; i < plannedItems.length; i++) {
        for (let j = i + 1; j < plannedItems.length; j++) {
            const a = plannedItems[i];
            const b = plannedItems[j];
            if (b.startTime !== null) {
                if (a.startTime === null) {
                    outOfOrderIds.add(b.id);
                } else if (a.startTime > b.startTime) {
                    outOfOrderIds.add(a.id);
                    outOfOrderIds.add(b.id);
                }
            }
        }
    }
    
    const sortOrder = document.getElementById('instanceSortOrder') ? document.getElementById('instanceSortOrder').value : 'planned';
    if (sortOrder === 'chronological') {
        mergedActs.sort((a, b) => {
            const tA = getActStartTime(a, inst);
            const tB = getActStartTime(b, inst);
            if (tA === null && tB === null) return 0;
            if (tA === null) return 1;
            if (tB === null) return -1;
            return tA - tB;
        });
    }
    
    let html = '<div style="display: flex; flex-direction: column; gap: 15px;">';
    mergedActs.forEach(a => {
        if (!a.steps || a.steps.length === 0) return;
        
        const isOutOfOrder = outOfOrderIds.has(a.id);
        const borderStyle = isOutOfOrder ? '2px dashed #ef4444' : '1px solid var(--border-color)';
        const warningIcon = isOutOfOrder ? '<span title="Executado fora da ordem prevista" style="cursor:help; margin-left: 6px;">⚠️</span>' : '';
        
        let isRegistered = false;
        let actLog = null;
        if (a.logId) {
            isRegistered = true;
            actLog = dbImp.logs.find(l => l.id === a.logId);
        } else {
            isRegistered = dbImp.logs.some(l => l.type === 'atividade' && l.instanceId === currentInstanceId && l.refId === a.id) || a.isCustom;
            actLog = dbImp.logs.find(l => l.type === 'atividade' && l.instanceId === currentInstanceId && l.refId === a.id);
        }
        
        let editActBtn = '';
        if (isRegistered && actLog) {
            editActBtn = `<button class="btn-edit-action" onclick="openLogForm('atividade', ${actLog.id})">✎ Editar Registro</button>`;
            editActBtn += `<button class="btn-edit-action" style="background: #fee2e2; color: #991b1b; margin-left: 6px;" onclick="unregisterInstanceActivity('${a.id}')">Desfazer Registro</button>`;
        }
        
        let autoIdBadge = '';
        if (a.logId) {
            const shortId = a.logId.toString().slice(-4);
            autoIdBadge = `<span style="background: #e2e8f0; color: #475569; padding: 2px 6px; border-radius: 4px; font-size: 0.65rem; margin-right: 8px; font-family: monospace;">#${shortId}</span>`;
        }
        let duplicateBadge = '';
        if (a.isDuplicate) {
            const isLatest = a.isLatestDuplicate;
            duplicateBadge = `<span style="background: ${isLatest ? '#fef08a' : '#f1f5f9'}; color: ${isLatest ? '#854d0e' : '#64748b'}; padding: 2px 6px; border-radius: 4px; font-size: 0.65rem; margin-left: 8px; border: 1px solid ${isLatest ? '#fde047' : '#e2e8f0'};">🔄 Execução Múltipla ${isLatest ? '(Mais Recente)' : ''}</span>`;
        }
        
        if (isRegistered) {
            let actTimeInfo = '';
            if (actLog) {
                if (actLog.startDate) {
                    const sDt = new Date(actLog.startDate);
                    actTimeInfo += `<b>Início:</b> ${sDt.toLocaleString('pt-BR')}`;
                    if (actLog.endDate) {
                        actTimeInfo += ` | <b>Fim:</b> ${new Date(actLog.endDate).toLocaleString('pt-BR')}`;
                        actTimeInfo += ` | <b>Duração:</b> ${window.formatDuration(actLog.startDate, actLog.endDate)}`;
                    } else {
                        actTimeInfo += ` | <b>Fim:</b> Em andamento`;
                    }
                } else {
                    actTimeInfo += `<b>Status:</b> Pendente (Não iniciada)`;
                }
            } else if (a.isCustom) {
                actTimeInfo = `Passo Extra Adicionado`;
            }

            html += `<div style="background: ${a.isLatestDuplicate ? '#fffbeb' : '#f8fafc'}; border: ${borderStyle}; border-radius: 6px; overflow: hidden; ${a.isLatestDuplicate ? 'box-shadow: 0 0 0 2px #fde047;' : ''}">
                <div style="background: ${a.isLatestDuplicate ? '#fef08a' : '#e2e8f0'}; padding: 8px 12px; font-weight: 700; color: var(--dark-accent); display:flex; justify-content:space-between; align-items:center; flex-wrap: wrap; gap: 8px;">
                    <div style="display: flex; align-items: center;">${autoIdBadge}<span>${a.name}</span>${duplicateBadge}${warningIcon}</div>
                    <div style="display: flex; gap: 10px; align-items: center;">
                        <span style="font-size: 0.65rem; color: ${a.isLatestDuplicate ? '#854d0e' : '#475569'}; font-weight: normal;">${actTimeInfo}</span>
                        ${editActBtn}
                        <button class="btn-edit-action" onclick="addInstanceExtraStep('${a.id}')">+ Passo Extra</button>
                    </div>
                </div><div style="padding: 10px; display: flex; flex-direction: column; gap: 8px;">`;
            a.steps.forEach(s => {
                const slog = inst.stepLogs[s.id] || {};
                const isChecked = !!slog.end || (inst.checkedSteps && inst.checkedSteps.includes(s.id));
                const isStarted = !!slog.start;
                const isNA = slog.status === 'na';
                
                let editStepBtn = '';
                if (s.id.startsWith('cstep_')) {
                    editStepBtn = `<button class="btn-edit-action" style="margin-right: 6px;" onclick="editInstanceExtraStep('${a.id}', '${s.id}')">✎ Editar Nome</button>`;
                }

                let actionHtml = '';
                let timeInfo = '';

                if (slog.start) timeInfo += `<b>Início:</b> ${new Date(slog.start).toLocaleString('pt-BR')}`;
                if (slog.end) {
                    timeInfo += ` | <b>Fim:</b> ${new Date(slog.end).toLocaleString('pt-BR')}`;
                    if (slog.start && !isNA) timeInfo += ` | <b>Duração:</b> ${window.formatDuration(slog.start, slog.end)}`;
                }

                if (isChecked) {
                    const statusLbl = isNA ? `<span style="font-size: 0.7rem; color: #64748b; font-weight: bold;">➖ Não se Aplica</span>` : `<span style="font-size: 0.7rem; color: #166534; font-weight: bold;">✓ Concluído</span>`;
                    actionHtml = `${statusLbl}
                                  <div style="font-size: 0.65rem; color: #64748b; margin-left: 10px;">${timeInfo}</div>
                                  <div style="margin-left: auto; display: flex; align-items: center;">
                                      ${editStepBtn}
                                      <button class="btn-edit-action" onclick="resetInstanceStep('${a.id}', '${s.id}')">Desfazer</button>
                                  </div>`;
                } else if (isStarted) {
                    actionHtml = `<span style="font-size: 0.7rem; color: #92400e; font-weight: bold;">⏳ Em andamento</span>
                                  <div style="font-size: 0.65rem; color: #64748b; margin-left: 10px;">${timeInfo}</div>
                                  <div style="margin-left: auto; display: flex; gap: 6px; align-items: center;">
                                      ${editStepBtn}
                                      <button class="btn-edit-action" style="background: #dcfce7; color: #166534;" onclick="concludeInstanceStep('${a.id}', '${s.id}')">Concluir</button>
                                      <button class="btn-edit-action" style="background: #f1f5f9; color: #475569;" onclick="skipInstanceStep('${a.id}', '${s.id}')">N/A</button>
                                      <button class="btn-edit-action" onclick="resetInstanceStep('${a.id}', '${s.id}')">Cancelar</button>
                                  </div>`;
                } else {
                    actionHtml = `<div style="margin-left: auto; display: flex; gap: 6px; align-items: center;">
                                      ${editStepBtn}
                                      <button class="btn-edit-action" style="background: #fef3c7; color: #92400e;" onclick="startInstanceStep('${a.id}', '${s.id}')">Iniciar</button>
                                      <button class="btn-edit-action" style="background: #dcfce7; color: #166534;" onclick="concludeInstanceStep('${a.id}', '${s.id}')">Concluir</button>
                                      <button class="btn-edit-action" style="background: #f1f5f9; color: #475569;" onclick="skipInstanceStep('${a.id}', '${s.id}')">N/A</button>
                                  </div>`;
                }

                html += `<div style="display: flex; flex-direction: column; gap: 6px; padding: 8px; border: 1px solid #e2e8f0; border-radius: 4px; background: ${isChecked ? (isNA ? '#f8fafc' : '#f0fdf4') : (isStarted ? '#fffbeb' : '#fff')};">
                    <span style="font-size: 0.85rem; color: ${isChecked ? '#64748b' : '#1e293b'}; text-decoration: ${isNA ? 'line-through' : 'none'}; font-weight: 600;">${s.desc}</span>
                    <div style="display: flex; align-items: center; padding-top: 4px; border-top: 1px dashed ${isChecked ? '#bbf7d0' : '#cbd5e1'}; margin-top: 2px;">${actionHtml}</div>
                </div>`;
            });
            html += `</div></div>`;
        } else {
            html += `<div style="background: #f8fafc; border: ${borderStyle}; border-radius: 6px; overflow: hidden; opacity: 0.6; transition: opacity 0.3s;" onmouseover="this.style.opacity='1'" onmouseout="this.style.opacity='0.6'">
                <div style="padding: 10px 12px; display:flex; justify-content:space-between; align-items:center;">
                    <div style="display: flex; align-items: center;"><span style="font-weight: 600; color: #64748b; font-size: 0.9rem;">${a.name}</span>${warningIcon}</div>
                    <button class="btn-main" style="padding: 4px 10px; font-size: 0.7rem; background: #e0f2fe; color: #0284c7; border: 1px solid #bae6fd;" onclick="registerInstanceActivity('${a.id}')">Registrar Atividade</button>
                </div>
            </div>`;
        }
    });
    container.innerHTML = html + '</div>';
}

function toggleAllCardsTimeline() { timelineExpandedAll = !timelineExpandedAll; document.getElementById('btn-toggle-all-timeline').innerText = timelineExpandedAll ? "Recolher Todos" : "Expandir Todos"; document.querySelectorAll('.timeline-card').forEach(card => { const idx = card.id.split('-')[1]; if (idx !== undefined) toggleCardExpansion(idx, timelineExpandedAll); }); }
function toggleCardExpansion(index, expand) { const cardView = document.getElementById(`card-${index}`); const textView = document.getElementById(`text-view-${index}`); if (expand) { cardView.style.display = 'block'; textView.style.display = 'none'; } else { cardView.style.display = 'none'; textView.style.display = 'flex'; } }
function sortTable(col) { if (currentSortCol === col) { currentSortDir = currentSortDir === 'asc' ? 'desc' : 'asc'; } else { currentSortCol = col; currentSortDir = 'desc'; } renderLogs(); }
function updateSortHeaders() { document.querySelectorAll('.sortable').forEach(th => { th.classList.remove('sort-asc', 'sort-desc'); if (th.dataset.col === currentSortCol) th.classList.add(`sort-${currentSortDir}`); }); }
function switchView(view) { currentView = view; document.getElementById('cards-view').style.display = view === 'cards' ? 'block' : 'none'; document.getElementById('timeline-view').style.display = view === 'timeline' ? 'block' : 'none'; document.getElementById('table-view').style.display = view === 'table' ? 'block' : 'none'; document.getElementById('btn-view-cards').classList.toggle('active', view === 'cards'); document.getElementById('btn-view-timeline').classList.toggle('active', view === 'timeline'); document.getElementById('btn-view-table').classList.toggle('active', view === 'table'); renderLogs(); }
function toggleDropdown(event) { event.stopPropagation(); const dropdown = document.getElementById("otherActionsDropdown").parentElement; const isShowing = dropdown.classList.contains('show'); document.querySelectorAll('.dropdown.show').forEach(d => d.classList.remove('show')); if (!isShowing) dropdown.classList.add('show'); }
window.onclick = function(event) { if (!event.target.matches('.dropdown .btn-main')) { document.querySelectorAll('.dropdown.show').forEach(d => d.classList.remove('show')); } }

function toggleDeleteMode() { const wrapper = document.getElementById('capture-area'); const btn = document.getElementById('btnDeleteToggle'); wrapper.classList.toggle('delete-mode'); const isDeleteMode = wrapper.classList.contains('delete-mode'); btn.innerText = isDeleteMode ? "Cancelar" : "Excluir Múltiplos"; const headerCheckbox = document.querySelector('.delete-checkbox-header'); if (headerCheckbox) { headerCheckbox.style.display = isDeleteMode ? 'inline-block' : 'none'; if (!isDeleteMode) headerCheckbox.checked = false; } if (!isDeleteMode) { selectedForDeletion = []; renderLogs(); } }
function selectAll(check) { document.querySelectorAll('.delete-checkbox').forEach(cb => { if (cb.checked !== check) { cb.checked = check; handleCheckboxChange(cb); } }); }
function handleCheckboxChange(cb) { 
    const isInst = cb.value.startsWith('inst_');
    const id = isInst ? cb.value : parseInt(cb.value); 
    const isChecked = cb.checked; 
    if (isChecked && !selectedForDeletion.includes(id)) { selectedForDeletion.push(id); } else if (!isChecked) { selectedForDeletion = selectedForDeletion.filter(x => x !== id); } 
    
    if (isInst) {
        const instId = cb.value.replace('inst_', '');
        dbImp.logs.filter(l => l.instanceId === instId).forEach(l => {
            if (isChecked && !selectedForDeletion.includes(l.id)) selectedForDeletion.push(l.id);
            else if (!isChecked) selectedForDeletion = selectedForDeletion.filter(x => x !== l.id);
            
            document.querySelectorAll(`.delete-checkbox[value="${l.id}"]`).forEach(input => { 
                input.checked = isChecked; 
                const cardItem = input.closest('.log-card'); 
                if (cardItem) cardItem.classList.toggle('deleting-card', isChecked); 
                const tmItem = input.closest('.tm-item'); 
                if (tmItem) tmItem.classList.toggle('deleting-tm-item', isChecked); 
            }); 
            const row = document.getElementById(`row-${l.id}`); 
            if (row) row.classList.toggle('deleting-table-row', isChecked);
        });
    }

    document.querySelectorAll(`.delete-checkbox[value="${cb.value}"]`).forEach(input => { 
        input.checked = isChecked; 
        const cardItem = input.closest('.log-card'); 
        if (cardItem) cardItem.classList.toggle('deleting-card', isChecked); 
        const tmItem = input.closest('.tm-item'); 
        if (tmItem) tmItem.classList.toggle('deleting-tm-item', isChecked); 
    }); 
    if (!isInst) {
        const row = document.getElementById(`row-${id}`); 
        if (row) row.classList.toggle('deleting-table-row', isChecked); 
    }
}
function deleteSingleLog(id) { if (confirm(`Excluir permanentemente este registro?`)) { dbImp.logs = dbImp.logs.filter(l => l.id != id); selectedForDeletion = selectedForDeletion.filter(selId => selId != id); if (document.getElementById('logId').value == id) closeLogForm(); saveLogs(); renderLogs(); showToast("Registro excluído!", "success"); } }

window.deleteInstance = function(instId) {
    if (confirm(`Excluir permanentemente a instância "${instId}" e todos os seus registros?`)) {
        delete dbImp.instances[instId];
        dbImp.logs = dbImp.logs.filter(a => a.instanceId !== instId);
        selectedForDeletion = selectedForDeletion.filter(x => x !== `inst_${instId}`);
        saveLogs();
        renderLogs();
        showToast("Instância excluída com sucesso!", "success");
    }
};

function confirmBulkDelete() { 
    if (selectedForDeletion.length === 0) return showToast("Selecione um log ou instância.", "warning"); 
    if (confirm(`Excluir permanentemente os itens selecionados?`)) { 
        const instIdsToDelete = selectedForDeletion.filter(x => typeof x === 'string' && x.startsWith('inst_')).map(x => x.replace('inst_', ''));
        const logIdsToDelete = selectedForDeletion.filter(x => typeof x === 'number');
        dbImp.logs = dbImp.logs.filter(a => !logIdsToDelete.includes(a.id)); 
        instIdsToDelete.forEach(instId => {
            delete dbImp.instances[instId];
            dbImp.logs = dbImp.logs.filter(a => a.instanceId !== instId);
        });
        const editId = document.getElementById('logId').value; 
        if (editId && logIdsToDelete.includes(parseInt(editId))) closeLogForm(); 
        selectedForDeletion = []; 
        saveLogs(); 
        toggleDeleteMode(); 
        renderLogs(); 
    } 
}

function importJSON(event) { if (!event.target.files.length) return; const reader = new FileReader(); reader.onload = (e) => { try { const parsed = JSON.parse(e.target.result); if(Array.isArray(parsed)){ dbImp.logs = parsed; } else { dbImp = parsed; } saveLogs(); renderLogs(); showToast("Logs importados com sucesso!", "success"); } catch (err) { showToast("Arquivo JSON Inválido.", "error"); } }; reader.readAsText(event.target.files[0]); event.target.value = ''; }
function exportJSON() { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([JSON.stringify(dbImp)], {type: "application/json"})); a.download = `pdrim_implementar_${new Date().toISOString().slice(0,10)}.json`; a.click(); localStorage.setItem('pdrim_exported', 'true'); showToast("Arquivo exportado com sucesso!", "success"); }
function zerarArtefato() { if (confirm("Tem certeza que deseja apagar TODOS os logs registrados? Esta ação não pode ser desfeita.")) { dbImp = { logs: [], instances: {} }; saveLogs(); closeLogForm(); renderLogs(); showToast("Logs apagados com sucesso!", "success"); } }
function printPage() { const a = document.getElementById('capture-area'); if(a) a.classList.add('pdf-mode'); const originalTitle = document.title; document.title = "pdrim_implementar"; showToast("Preparando PDF...", "info"); setTimeout(() => { window.print(); document.title = originalTitle; if(a) a.classList.remove('pdf-mode'); }, 500); }