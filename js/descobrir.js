let dbDesc = {
    activeView: 'as-is',
    baseModel: 'auto',
    models: {
        'as-is': { image: '', drawings: '', legacyDrawing: '', drawingObjects: [], activities: [], risks: [] },
        'to-be': { image: '', drawings: '', legacyDrawing: '', drawingObjects: [], activities: [], risks: [] },
        'compare': { image: '', drawings: '', legacyDrawing: '', drawingObjects: [], activities: [], risks: [] }
    }
};
let selectedActivityId = null;
let selectedRiskId = null;
let expandedPopActivities = {};

document.addEventListener('DOMContentLoaded', () => {
    initDescobrirUI();
    attachDrawingEvents();
});

async function initDescobrirUI() {
    const stored = localStorage.getItem('pdrim_desc_v10_9');
    if (stored && stored !== '{}') {
        try { 
            const parsed = JSON.parse(stored);
            
            // Migração se os dados antigos continham BPMN
            if(parsed.models && parsed.models['as-is'] && parsed.models['as-is'].xml !== undefined) {
                ['as-is','to-be','compare'].forEach(k => {
                    parsed.models[k].image = ''; 
                    delete parsed.models[k].xml; 
                    delete parsed.models[k].fileName;
                    parsed.models[k].activities.forEach(a => a.noRisk = a.noRisk || false);
                });
            }
            
            // Migração de Riscos embutidos para globais
            if(parsed.models && parsed.models['as-is']) {
                ['as-is','to-be','compare'].forEach(k => {
                    if (parsed.models[k].drawings && (!parsed.models[k].drawingObjects || parsed.models[k].drawingObjects.length === 0)) {
                        parsed.models[k].legacyDrawing = parsed.models[k].drawings;
                    }
                    if (parsed.models[k].drawings === undefined) parsed.models[k].drawings = '';
                    if (parsed.models[k].legacyDrawing === undefined) parsed.models[k].legacyDrawing = '';
                    if (parsed.models[k].drawingObjects === undefined) parsed.models[k].drawingObjects = [];
                     if (!parsed.models[k].risks) {
                        parsed.models[k].risks = [];
                    }
                    if (parsed.models[k].activities) {
                        parsed.models[k].activities.forEach(a => {
                            // Se estiver no formato legado de array de IDs strings (RiskIds) ou de objetos Risk
                            if (a.riskIds && a.riskIds.length > 0 && typeof a.riskIds[0] === 'string') {
                                a.riskAssocs = a.riskIds.map(id => {
                                    let r = parsed.models[k].risks.find(x => x.id === id);
                                    return { riskId: id, prob: r ? (r.prob || 1) : 1, imp: r ? (r.imp || 1) : 1 };
                                });
                                delete a.riskIds;
                            }
                            if (!a.riskAssocs) a.riskAssocs = [];
                            if (!a.steps) { a.steps = []; }
                            else { a.steps.forEach(s => s.status = s.status || null); }
                        });
                    }
                    parsed.models[k].risks.forEach(r => {
                        delete r.prob;
                        delete r.imp;
                    });
                });
            }

            if (parsed.baseModel === undefined) parsed.baseModel = 'auto';
            const baseSel = document.getElementById('base-model-select');
            if (baseSel) baseSel.value = parsed.baseModel;

            dbDesc = { ...dbDesc, ...parsed }; 
        } catch(e) {}
    }

    updateBreadcrumbs();
    updateHeaderInitiative();
    switchImgView(dbDesc.activeView);
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
            } else if (index === 2) {
                if (data !== '[]') hasData = true;
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

function switchImgView(view) {
    dbDesc.activeView = view;
    document.querySelectorAll('.view-tab').forEach(t => t.classList.remove('active'));
    document.getElementById(`btn-view-${view.replace('-','')}`).classList.add('active');

    const isCompare = view === 'compare';

    const imgWrapper = document.getElementById('img-wrapper');
    const compareWrapper = document.getElementById('compare-wrapper');
    const imgModeControls = document.getElementById('img-mode-controls');

    const compareSummary = document.getElementById('compare-summary');
    if (compareSummary) compareSummary.style.display = isCompare ? 'block' : 'none';
    
    document.getElementById('normal-act-risk-panels').style.display = isCompare ? 'none' : 'grid';
    document.getElementById('compare-act-risk-panels').style.display = isCompare ? 'grid' : 'none';

    document.getElementById('normal-matrix-panels').style.display = isCompare ? 'none' : 'grid';
    document.getElementById('compare-matrix-panels').style.display = isCompare ? 'grid' : 'none';

    document.getElementById('normal-pop-panels').style.display = isCompare ? 'none' : 'block';
    document.getElementById('compare-pop-panels').style.display = isCompare ? 'grid' : 'none';

    const btnEditPop = document.getElementById('btn-edit-pop');
    if (btnEditPop) btnEditPop.style.display = isCompare ? 'none' : 'inline-block';

    if (isCompare) {
        imgWrapper.style.display = 'none';
        compareWrapper.style.display = 'grid';
        imgModeControls.style.display = 'none';
        document.getElementById('draw-toolbar').style.display = 'none';
        isDrawingMode = false;
        
        ['as-is', 'to-be'].forEach(mode => {
            const mData = dbDesc.models[mode];
            const baseImg = document.getElementById(`compare-${mode.replace('-','')}-base`);
            const drawImg = document.getElementById(`compare-${mode.replace('-','')}-draw`);
            const emptyTxt = document.getElementById(`compare-${mode.replace('-','')}-empty`);
            
            if (mData.image) {
                baseImg.src = mData.image;
                baseImg.style.display = 'block';
                if (mData.drawings) {
                    drawImg.src = mData.drawings;
                    drawImg.style.display = 'block';
                } else {
                    drawImg.style.display = 'none';
                }
                emptyTxt.style.display = 'none';
            } else {
                baseImg.style.display = 'none';
                drawImg.style.display = 'none';
                emptyTxt.style.display = 'block';
            }
        });
    } else {
        imgWrapper.style.display = 'flex';
        compareWrapper.style.display = 'none';
        imgModeControls.style.display = 'flex';
        
        const model = dbDesc.models[view];
        const imgEmpty = document.getElementById('img-overlay-empty');
        const imgDisplay = document.getElementById('img-display');
        const btnRemove = document.getElementById('btn-remove-img');
        const btnDraw = document.getElementById('btn-draw');
        const btnLoadImg = document.getElementById('btn-load-img');
        const drawCanvas = document.getElementById('draw-canvas');

        isDrawingMode = false;
        drawCanvas.style.pointerEvents = 'none';
        drawCanvas.style.cursor = 'default';
        document.getElementById('draw-toolbar').style.display = 'none';

        if (model.image) {
            imgEmpty.style.display = 'none';
            imgDisplay.src = model.image;
            imgDisplay.style.display = 'block';
            btnRemove.style.display = 'inline-block';
            btnDraw.style.display = 'inline-block';
            if (btnLoadImg) btnLoadImg.style.display = 'none';
            drawCanvas.style.display = 'block';
            setTimeout(setupCanvas, 50); // Setup after layout
        } else {
            imgEmpty.style.display = 'block';
            imgDisplay.src = '';
            imgDisplay.style.display = 'none';
            btnRemove.style.display = 'none';
            btnDraw.style.display = 'none';
            if (btnLoadImg) btnLoadImg.style.display = 'inline-block';
            drawCanvas.style.display = 'none';
        }
    }

    selectedActivityId = null;
    selectedRiskId = null;
    expandedPopActivities = {};
    renderAll();
}

function importImage(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const MAX_WIDTH = 1920;
            const MAX_HEIGHT = 1080;
            let width = img.width;
            let height = img.height;

            if (width > height) {
                if (width > MAX_WIDTH) {
                    height *= MAX_WIDTH / width;
                    width = MAX_WIDTH;
                }
            } else {
                if (height > MAX_HEIGHT) {
                    width *= MAX_HEIGHT / height;
                    height = MAX_HEIGHT;
                }
            }
            
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);
            
            try {
                const dataUrl = canvas.toDataURL('image/jpeg', 0.85); // 85% para economizar armazenamento
                dbDesc.models[dbDesc.activeView].image = dataUrl;
                dbDesc.models[dbDesc.activeView].drawings = '';
                dbDesc.models[dbDesc.activeView].legacyDrawing = '';
                dbDesc.models[dbDesc.activeView].drawingObjects = [];
                saveDesc();
                switchImgView(dbDesc.activeView);
                showToast("Imagem carregada com sucesso!", "success");
            } catch (err) {
                showToast("Erro: Imagem muito grande para ser salva no armazenamento local.", "error");
            }
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
    event.target.value = '';
}

function clearImage() {
    if (confirm("Tem certeza que deseja remover a imagem desta visualização?")) {
        dbDesc.models[dbDesc.activeView].image = '';
        dbDesc.models[dbDesc.activeView].drawings = '';
        dbDesc.models[dbDesc.activeView].legacyDrawing = '';
        dbDesc.models[dbDesc.activeView].drawingObjects = [];
        saveDesc();
        switchImgView(dbDesc.activeView);
        showToast("Imagem removida com sucesso!", "success");
    }
}

function setBaseModel(val) {
    dbDesc.baseModel = val;
    saveDesc();
    showToast("Modelo base para planejamento atualizado.", "success");
}

function toggleDropdown(event) {
    event.stopPropagation();
    const dropdown = document.getElementById("otherActionsDropdown").parentElement;
    const isShowing = dropdown.classList.contains('show');
    document.querySelectorAll('.dropdown.show').forEach(d => d.classList.remove('show'));
    if (!isShowing) {
        dropdown.classList.add('show');
    }
}

window.onclick = function(event) {
  if (!event.target.matches('.dropdown .btn-main')) {
    document.querySelectorAll('.dropdown.show').forEach(d => d.classList.remove('show'));
  }
}

function exportJSON() {
    const a = document.createElement('a'); 
    a.href = URL.createObjectURL(new Blob([JSON.stringify(dbDesc, null, 2)], {type: "application/json"})); 
    a.download = `pdrim_descobrir_${new Date().toISOString().slice(0, 10)}.json`; 
    a.click(); 
    localStorage.setItem('pdrim_exported', 'true'); 
    showToast("Artefato exportado com sucesso!", "success"); 
}

function importJSON(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (e) => {
        try {
            const imported = JSON.parse(e.target.result);
            if (imported && imported.models) {
                dbDesc = { ...dbDesc, ...imported };
                saveDesc();
                switchImgView(dbDesc.activeView);
                showToast("Artefato importado com sucesso!", "success");
            } else {
                showToast("Arquivo JSON Inválido.", "error");
            }
        } catch (err) {
            showToast("Erro ao importar o arquivo JSON.", "error");
        }
    };
    reader.readAsText(file);
    event.target.value = '';
}

function zerarArtefato() {
    if (confirm("Tem certeza que deseja apagar TODOS os dados e imagens deste Canvas? Esta ação não pode ser desfeita.")) {
        dbDesc = {
            activeView: 'as-is',
            models: {
                    'as-is': { image: '', drawings: '', legacyDrawing: '', drawingObjects: [], activities: [], risks: [] },
                    'to-be': { image: '', drawings: '', legacyDrawing: '', drawingObjects: [], activities: [], risks: [] },
                    'compare': { image: '', drawings: '', legacyDrawing: '', drawingObjects: [], activities: [], risks: [] }
            }
        };
        selectedActivityId = null;
        selectedRiskId = null;
        expandedPopActivities = {};
        saveDesc();
        switchImgView('as-is');
        showToast("Artefato zerado com sucesso!", "success");
    }
}

function printPage() {
    if (dbDesc.activeView !== 'compare') {
        renderPrintPOPs();
    } else {
        document.getElementById('pop-print-container').innerHTML = '';
    }
    const a = document.querySelector('.container'); 
    if(a) a.classList.add('pdf-mode'); 

    const originalTitle = document.title;
    document.title = "pdrim_descobrir";

    showToast("Preparando impressão / PDF...", "info");

    setTimeout(() => {
        window.print();
        document.title = originalTitle;
        if(a) a.classList.remove('pdf-mode'); 
    }, 500);
}

function showToast(message, type = 'error') {
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        document.body.appendChild(container);
    }
    
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    let icon = '';
    if (type === 'error') icon = '❌ ';
    if (type === 'warning') icon = '⚠️ ';
    if (type === 'success') icon = '✅ ';
    if (type === 'info') icon = '⏳ ';
    
    toast.innerHTML = `<span>${icon}${message}</span>`;
    container.appendChild(toast);
    
    toast.offsetHeight;
    toast.classList.add('show');
    
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}

function selectActivity(id) {
    if (selectedActivityId === id) {
        selectedActivityId = null;
    } else {
        selectedActivityId = id;
        if (id !== null) selectedRiskId = null;
    }
    renderAll();
}

function selectRisk(id) {
    if (selectedRiskId === id) {
        selectedRiskId = null;
    } else {
        selectedRiskId = id;
        if (id !== null) selectedActivityId = null;
    }
    renderAll();
}

function renderAll() {
    if (dbDesc.activeView === 'compare') {
        renderCompareSummary();
        renderCompareActRisk('as-is');
        renderCompareActRisk('to-be');
        renderCompareMatrix('as-is');
        renderCompareMatrix('to-be');
        renderCompareHeatmap('as-is');
        renderCompareHeatmap('to-be');
        renderComparePop('as-is');
        renderComparePop('to-be');
    } else {
        renderActivityList();
        renderRiskList();
        renderMatrix();
        renderHeatmap();
        renderPop();
    }
    checkDiagramAlerts();
}

function calculateTotalTime(model) {
    let totalS = 0;
    (model.activities || []).forEach(a => {
        if (a.time) {
            totalS += (a.time.d || 0) * 86400; // 1 Dia = 24h = 86400s
            totalS += (a.time.h || 0) * 3600;
            totalS += (a.time.m || 0) * 60;
            totalS += (a.time.s || 0);
        }
    });
    let str = '0s';
    if (totalS > 0) {
        let tempS = totalS;
        let d = Math.floor(tempS / 86400); tempS %= 86400;
        let h = Math.floor(tempS / 3600); tempS %= 3600;
        let m = Math.floor(tempS / 60);
        let s = tempS % 60;
        str = '';
        if (d > 0) str += `${d}d `;
        if (h > 0) str += `${h}h `;
        if (m > 0) str += `${m}m `;
        if (s > 0 || str === '') str += `${s}s`;
        str = str.trim();
    }
    return { str, sec: totalS };
}

function renderCompareSummary() {
    const asis = dbDesc.models['as-is'];
    const tobe = dbDesc.models['to-be'];
    
    const countControls = (model) => {
        let count = 0;
        (model.drawingObjects || []).forEach(o => {
            if (o.type === 'controle' || o.color === '#000000') count++;
        });
        return count;
    };
    
    const timeAsIs = calculateTotalTime(asis);
    const timeToBe = calculateTotalTime(tobe);
    
    const actsAsIs = asis.activities.length;
    const actsToBe = tobe.activities.length;
    
    const risksAsIs = asis.risks.length;
    const risksToBe = tobe.risks.length;
    
    const ctrlAsIs = countControls(asis);
    const ctrlToBe = countControls(tobe);
    
    const highlight = 'background-color: #dcfce7; color: #166534 !important; padding: 0 6px; border-radius: 4px; border: 1px dashed #bbf7d0; display: inline-block;';
    const highlightTie = 'background-color: #f1f5f9; color: #64748b !important; padding: 0 6px; border-radius: 4px; border: 1px dashed #cbd5e1; display: inline-block;';
    
    const sActsAsIs = actsAsIs < actsToBe ? highlight : (actsAsIs === actsToBe ? highlightTie : '');
    const sActsToBe = actsToBe < actsAsIs ? highlight : (actsAsIs === actsToBe ? highlightTie : '');
    
    const sTimeAsIs = timeAsIs.sec < timeToBe.sec ? highlight : (timeAsIs.sec === timeToBe.sec ? highlightTie : '');
    const sTimeToBe = timeToBe.sec < timeAsIs.sec ? highlight : (timeAsIs.sec === timeToBe.sec ? highlightTie : '');
    
    const sRisksAsIs = risksAsIs < risksToBe ? highlight : (risksAsIs === risksToBe ? highlightTie : '');
    const sRisksToBe = risksToBe < risksAsIs ? highlight : (risksAsIs === risksToBe ? highlightTie : '');
    
    const sCtrlAsIs = ctrlAsIs < ctrlToBe ? highlight : (ctrlAsIs === ctrlToBe ? highlightTie : '');
    const sCtrlToBe = ctrlToBe < ctrlAsIs ? highlight : (ctrlAsIs === ctrlToBe ? highlightTie : '');
    
    document.getElementById('summary-asis').innerHTML = `
        <p style="margin: 5px 0;"><strong>Atividades:</strong> <span style="color: var(--primary); font-size: 1.1rem; font-weight: 800; ${sActsAsIs}">${actsAsIs}</span></p>
        <p style="margin: 5px 0;"><strong>Tempo Estimado:</strong> <span style="color: var(--primary); font-size: 1.1rem; font-weight: 800; ${sTimeAsIs}">${timeAsIs.str}</span></p>
        <p style="margin: 5px 0;"><strong>Riscos Identificados:</strong> <span style="color: var(--primary); font-size: 1.1rem; font-weight: 800; ${sRisksAsIs}">${risksAsIs}</span></p>
        <p style="margin: 5px 0;"><strong>Controles (Marcações):</strong> <span style="color: var(--primary); font-size: 1.1rem; font-weight: 800; ${sCtrlAsIs}">${ctrlAsIs}</span></p>
    `;
    
    document.getElementById('summary-tobe').innerHTML = `
        <p style="margin: 5px 0;"><strong>Atividades:</strong> <span style="color: var(--accent); font-size: 1.1rem; font-weight: 800; ${sActsToBe}">${actsToBe}</span></p>
        <p style="margin: 5px 0;"><strong>Tempo Estimado:</strong> <span style="color: var(--accent); font-size: 1.1rem; font-weight: 800; ${sTimeToBe}">${timeToBe.str}</span></p>
        <p style="margin: 5px 0;"><strong>Riscos Identificados:</strong> <span style="color: var(--accent); font-size: 1.1rem; font-weight: 800; ${sRisksToBe}">${risksToBe}</span></p>
        <p style="margin: 5px 0;"><strong>Controles (Marcações):</strong> <span style="color: var(--accent); font-size: 1.1rem; font-weight: 800; ${sCtrlToBe}">${ctrlToBe}</span></p>
    `;
}

function renderCompareActRisk(mode) {
    const container = document.getElementById(`compare-${mode.replace('-','')}-act-risk`);
    const acts = dbDesc.models[mode].activities;
    const allRisks = dbDesc.models[mode].risks;
    
    let html = `<div style="margin-bottom: 15px;"><b class="field-label-light">Atividades (${acts.length})</b>`;
    if (acts.length === 0) {
        html += '<span class="empty-msg">Nenhuma atividade</span>';
    } else {
        acts.forEach(a => {
            const isPendingRisk = !a.noRisk && (!a.riskAssocs || a.riskAssocs.length === 0);
            const riskCount = a.riskAssocs ? a.riskAssocs.length : 0;
            let riskIcon = '';
            if (riskCount > 0) riskIcon = `<span style="color: var(--dark-accent);">⚠️ (${riskCount})</span>`;
            else if (a.noRisk) riskIcon = `<span style="color: var(--dark-accent);">✅ (0)</span>`;
            else riskIcon = `<span style="color: #ef4444;" title="Pendente de análise">❗ (0)</span>`;
            
            let timeStr = '';
            if (a.time && (a.time.d > 0 || a.time.h > 0 || a.time.m > 0 || a.time.s > 0)) {
                timeStr = ` <span style="font-size: 0.6rem; color: #0284c7; font-weight: bold; background: #e0f2fe; padding: 1px 4px; border-radius: 4px; margin-left: 6px;">`;
                if (a.time.d > 0) timeStr += `${a.time.d}d `;
                if (a.time.h > 0) timeStr += `${a.time.h}h `;
                if (a.time.m > 0) timeStr += `${a.time.m}m `;
                if (a.time.s > 0) timeStr += `${a.time.s}s`;
                timeStr = timeStr.trim() + `</span>`;
            }
            const sectorStr = a.sector ? ` <span style="font-size: 0.6rem; color: #475569; font-weight: bold; background: #f1f5f9; padding: 1px 4px; border-radius: 4px; margin-left: 6px;">🏢 ${a.sector}</span>` : '';
            
            const bg = isPendingRisk ? '#fff1f2' : '#fff';
            const col = isPendingRisk ? '#991b1b' : '#475569';
            const borderStyle = isPendingRisk ? 'border: 1px dashed #fca5a5;' : '';
            
            html += `<div class="mini-card" style="background: ${bg}; ${borderStyle} margin-bottom: 5px; font-size: 0.75rem; display: flex; justify-content: space-between; align-items: center;">
                <span style="font-weight: 600; color: ${col};">${a.name}${sectorStr}${timeStr}</span>
                <span style="font-weight: bold;">${riskIcon}</span>
            </div>`;
        });
    }
    html += `</div>`;
    
    html += `<div><b class="field-label-light">Riscos (${allRisks.length})</b>`;
    if (allRisks.length === 0) {
        html += '<span class="empty-msg">Nenhum risco</span>';
    } else {
        allRisks.forEach(r => {
            const linkedActs = acts.filter(a => !a.noRisk && a.riskAssocs.find(ra => ra.riskId === r.id));
            html += `<div class="mini-card" style="background: #fff; margin-bottom: 5px; font-size: 0.75rem; display: flex; justify-content: space-between; align-items: center;">
                <span style="font-weight: 600; color: #475569;">${r.desc}</span>
                <span style="color: var(--dark-accent); font-weight: bold;">📋 (${linkedActs.length})</span>
            </div>`;
        });
    }
    html += `</div>`;
    container.innerHTML = html;
}

function renderCompareMatrix(mode) {
    const container = document.getElementById(`compare-${mode.replace('-','')}-matrix`);
    const acts = dbDesc.models[mode].activities;
    const allRisks = dbDesc.models[mode].risks;
    
    let rows = [];
    acts.forEach(act => {
        if (!act.noRisk && act.riskAssocs && act.riskAssocs.length > 0) {
            act.riskAssocs.forEach((ra) => {
                const r = allRisks.find(x => x.id === ra.riskId);
                if (r) {
                    rows.push({ act: act, ra: ra, r: r, score: ra.prob * ra.imp, order: ra.order || 0 });
                }
            });
        }
    });

    rows.sort((a, b) => {
        if (a.score !== b.score) return b.score - a.score;
        return (a.order || 0) - (b.order || 0);
    });

    let html = `<table class="actions-table" style="font-size: 0.7rem; margin-top: 0;"><thead><tr><th>Atividade</th><th>Risco</th><th>Score</th></tr></thead><tbody>`;
    if (rows.length === 0) {
        html += `<tr><td colspan="3" class="empty-state">Sem dados de matriz</td></tr>`;
    } else {
        rows.forEach(row => {
            const lvl = getRiskLevelInfo(row.ra.prob, row.ra.imp);
            html += `<tr><td style="max-width: 100px; overflow-wrap: break-word;">${row.act.name}</td><td style="max-width: 120px; overflow-wrap: break-word;">${row.r.desc}</td><td><span class="cat-badge" style="background:${lvl.bg}; color:${lvl.col}; border-color:${lvl.col}; padding: 2px 4px; font-size: 0.6rem;">${lvl.lbl} (${row.score})</span></td></tr>`;
        });
    }
    html += `</tbody></table>`;
    container.innerHTML = html;
}

function renderCompareHeatmap(mode) {
    const hm = document.getElementById(`compare-${mode.replace('-','')}-heatmap`);
    if (!hm) return;
    hm.style.overflow = 'visible';
    const counts = { '3-1':[], '3-2':[], '3-3':[], '2-1':[], '2-2':[], '2-3':[], '1-1':[], '1-2':[], '1-3':[] };
    
    const allRisks = dbDesc.models[mode].risks;
    dbDesc.models[mode].activities.forEach(act => {
        if (!act.noRisk && act.riskAssocs) {
            act.riskAssocs.forEach(ra => {
                const r = allRisks.find(x => x.id === ra.riskId);
                if (r) counts[`${ra.prob}-${ra.imp}`].push(r.desc);
            });
        }
    });

    const makeCell = (p, i, bg) => {
        const risks = [...new Set(counts[`${p}-${i}`])];
        const val = counts[`${p}-${i}`].length;
        let text = '';
        if (val > 0) {
            const riskListHtml = risks.map(r => `• ${r}`).join('<br>');
            text = `<div class="hover-trigger" style="width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; cursor: help;">
                        <b style="font-size:1.5rem; color:#fff; text-shadow: 0 1px 2px rgba(0,0,0,0.5);">${val}</b>
                        <div class="hover-target no-print" style="top: auto; bottom: 80%; left: 50%; transform: translateX(-50%); right: auto; width: max-content; max-width: 250px; flex-direction: column; align-items: flex-start; text-align: left; font-size: 0.75rem; color: #1e293b; z-index: 100;">
                            <b style="color: var(--dark-accent); border-bottom: 1px solid #e2e8f0; width: 100%; padding-bottom: 4px; margin-bottom: 4px;">Riscos (${val}):</b>
                            <span>${riskListHtml}</span>
                        </div>
                    </div>`;
        }
        return `<div style="background:${bg}; display:flex; align-items:center; justify-content:center; border-radius:2px;">${text}</div>`;
    };

    hm.innerHTML = `
        ${makeCell(3, 1, '#facc15')} ${makeCell(3, 2, '#ef4444')} ${makeCell(3, 3, '#b91c1c')}
        ${makeCell(2, 1, '#4ade80')} ${makeCell(2, 2, '#facc15')} ${makeCell(2, 3, '#ef4444')}
        ${makeCell(1, 1, '#22c55e')} ${makeCell(1, 2, '#4ade80')} ${makeCell(1, 3, '#facc15')}
    `;
}

function renderComparePop(mode) {
    const container = document.getElementById(`compare-${mode.replace('-','')}-pop`);
    const acts = dbDesc.models[mode].activities;
    let html = '<div style="display: flex; flex-direction: column; gap: 10px;">';
    const popActs = acts.filter(a => a.steps && a.steps.length > 0);
    if (popActs.length === 0) {
        container.innerHTML = '<span class="empty-msg">Nenhum POP cadastrado</span>';
        return;
    }
    popActs.forEach(a => {
        html += `<div style="border: 1px solid var(--border-color); border-radius: 6px; background: #fff; overflow: hidden; margin-bottom: 5px;"><div style="padding: 8px 12px; background: #f8fafc; font-weight: 600; color: #334155; font-size: 0.75rem; display: flex; justify-content: space-between;"><span>${a.name}</span><span style="color: #64748b;">${a.steps.length} passos</span></div><div style="padding: 10px;">`;
        a.steps.forEach((step, idx) => {
            const st = step.status;
            let stText = '', stCol = '';
            if (st === 'sim') { stText = 'Sim'; stCol = '#22c55e'; }
            else if (st === 'nao') { stText = 'Não'; stCol = '#ef4444'; }
            else if (st === 'na') { stText = 'N/A'; stCol = '#64748b'; }
            const badge = stText ? `<span style="font-size: 0.6rem; padding: 1px 4px; border-radius: 4px; background: ${stCol}; color: #fff; white-space: nowrap;">${stText}</span>` : '';
            html += `<div style="display: flex; gap: 8px; align-items: flex-start; padding: 4px 0; font-size: 0.7rem; border-bottom: 1px dashed #f1f5f9;"><b style="color: var(--accent); min-width: 15px;">${idx + 1}.</b><span style="flex: 1;">${step.desc}</span>${badge}</div>`;
        });
        html += `</div></div>`;
    });
    html += '</div>';
    container.innerHTML = html;
}

function formatTimeStr(timeObj) {
    if (!timeObj || (!timeObj.d && !timeObj.h && !timeObj.m && !timeObj.s)) return '';
    let str = `<span style="font-size: 0.6rem; color: #0284c7; font-weight: bold; background: #e0f2fe; padding: 2px 6px; border-radius: 12px; margin-left: 6px; white-space: nowrap;">⏱️ `;
    if (timeObj.d > 0) str += `${timeObj.d}d `;
    if (timeObj.h > 0) str += `${timeObj.h}h `;
    if (timeObj.m > 0) str += `${timeObj.m}m `;
    if (timeObj.s > 0) str += `${timeObj.s}s`;
    return str.trim() + `</span>`;
}

window.updateActTime = function(actId, field, val) {
    const act = dbDesc.models[dbDesc.activeView].activities.find(a => a.id === actId);
    if (act) {
        if (!act.time) act.time = { d: 0, h: 0, m: 0, s: 0 };
        act.time[field] = parseInt(val) || 0;
        saveDesc();
        renderActivityList();
    }
};

window.updateActSector = function(actId, val) {
    const act = dbDesc.models[dbDesc.activeView].activities.find(a => a.id === actId);
    if (act) {
        act.sector = val.trim();
        saveDesc();
        renderActivityList();
    }
};

function addActivity() {
    const inp = document.getElementById('new-activity-desc');
    const inpSec = document.getElementById('new-activity-sector');
    if (!inp || !inp.value.trim()) return;
    
    const newAct = {
        id: 'act_' + Date.now(),
        name: inp.value.trim(),
        sector: inpSec ? inpSec.value.trim() : '',
        riskAssocs: [],
        noRisk: false,
        steps: [],
        time: { d: 0, h: 0, m: 0, s: 0 }
    };
    
    dbDesc.models[dbDesc.activeView].activities.push(newAct);
    inp.value = '';
    if(inpSec) inpSec.value = '';
    saveDesc();
    renderAll();
}

function removeActivity(id) {
    if (confirm("Tem certeza que deseja excluir esta atividade e seus riscos?")) {
        const act = dbDesc.models[dbDesc.activeView].activities.find(a => a.id === id);
        dbDesc.models[dbDesc.activeView].activities = dbDesc.models[dbDesc.activeView].activities.filter(a => a.id !== id);
        
        if (selectedActivityId === id) selectActivity(null);
        saveDesc();
        renderAll();
    }
}

function renderActivityList() {
    const list = document.getElementById('activity-list');
    const title = document.getElementById('activity-panel-title');
    const btnBack = document.getElementById('btn-back-to-activities');
    const btnLinkAllActs = document.getElementById('btn-link-all-acts');
    const addWrapper = document.getElementById('activity-add-wrapper');
    const linkWrapper = document.getElementById('activity-link-wrapper');
    
    let btnUnlinkAllActs = document.getElementById('btn-unlink-all-acts');
    if (btnLinkAllActs && !btnUnlinkAllActs) {
        btnUnlinkAllActs = document.createElement('button');
        btnUnlinkAllActs.id = 'btn-unlink-all-acts';
        btnUnlinkAllActs.className = 'btn-edit-action';
        btnUnlinkAllActs.style.marginLeft = '8px';
        btnUnlinkAllActs.style.backgroundColor = '#fee2e2';
        btnUnlinkAllActs.style.color = '#991b1b';
        btnUnlinkAllActs.innerText = 'Desvincular Todas';
        btnUnlinkAllActs.onclick = unlinkRiskFromAllActs;
        btnLinkAllActs.parentNode.insertBefore(btnUnlinkAllActs, btnLinkAllActs.nextSibling);
    }

    const acts = dbDesc.models[dbDesc.activeView].activities;
    const allRisks = dbDesc.models[dbDesc.activeView].risks;
    let html = '';

    if (selectedRiskId) {
        title.innerText = 'Atividades do Risco Selecionado';
        btnBack.style.display = 'inline-block';
        if (btnLinkAllActs) btnLinkAllActs.style.display = 'inline-block';
        if (btnUnlinkAllActs) btnUnlinkAllActs.style.display = 'inline-block';
        addWrapper.style.display = 'none';
        
        const availableActs = acts.filter(a => !a.noRisk && !a.riskAssocs.find(ra => ra.riskId === selectedRiskId));
        if (availableActs.length > 0) {
            linkWrapper.style.display = 'flex';
            const sel = document.getElementById('existing-act-sel');
            let selHtml = '<option value="">-- Vincular a Atividade --</option>';
            availableActs.forEach(a => selHtml += `<option value="${a.id}">${a.name}</option>`);
            sel.innerHTML = selHtml;
        } else {
            linkWrapper.style.display = 'none';
        }
        
        const filteredActs = acts.filter(a => !a.noRisk && a.riskAssocs && a.riskAssocs.find(ra => ra.riskId === selectedRiskId));
        
        if (filteredActs.length === 0) {
            list.innerHTML = '<span class="empty-msg">Nenhuma atividade vinculada a este risco.</span>';
            return;
        }
        
        filteredActs.forEach(a => {
            const bg = '#f8fafc';
            const col = '#475569';
            
            let riskIcon = '';
            const riskCount = a.riskAssocs ? a.riskAssocs.length : 0;
            if (riskCount > 0) {
                const riskNames = a.riskAssocs.map(ra => {
                    const r = allRisks.find(x => x.id === ra.riskId);
                    return r ? r.desc : '';
                }).filter(Boolean).join('\n- ');
                riskIcon = `<span title="Riscos Associados:\n- ${riskNames}" style="font-size:0.8rem; margin-right:6px; cursor:help; font-weight:bold; color:var(--dark-accent);">⚠️ (${riskCount})</span>`;
            } else if (a.noRisk) {
                riskIcon = `<span title="Atividade marcada como sem riscos" style="font-size:0.8rem; margin-right:6px; cursor:help; font-weight:bold; color:var(--dark-accent);">✅ (0)</span>`;
            } else {
                riskIcon = `<span title="Nenhum risco associado" style="font-size:0.8rem; margin-right:6px; cursor:help; font-weight:bold; color:var(--dark-accent);">(0)</span>`;
            }
            
            const timeStr = formatTimeStr(a.time);
            const sectorStr = a.sector ? ` <span style="font-size: 0.65rem; color: #0f172a; background: #e2e8f0; padding: 2px 6px; border-radius: 4px; margin-left: 6px;">🏢 ${a.sector}</span>` : '';
            html += `<div class="mini-card hover-trigger" style="background:${bg}; color:${col}; cursor:pointer; align-items:center;" onclick="selectActivity('${a.id}')">
                <div style="flex:1; display:flex; align-items:center;">
                    ${riskIcon}
                    <b style="font-size:0.75rem; display:block; word-break:break-word; flex:1;">${a.name}${sectorStr}${timeStr}</b>
                </div>
                <div class="no-print hover-target" style="top:50%; transform:translateY(-50%); right:4px; align-items:center;">
                    <span style="cursor:pointer; color:#ef4444; font-size:1.1rem; line-height:1;" onclick="event.stopPropagation(); removeRisk('${a.id}', '${selectedRiskId}')" title="Desvincular">✕</span>
                </div>
            </div>`;
        });
    } else {
        title.innerText = 'Atividades do Modelo';
        btnBack.style.display = 'none';
        if (btnLinkAllActs) btnLinkAllActs.style.display = 'none';
        if (btnUnlinkAllActs) btnUnlinkAllActs.style.display = 'none';
        addWrapper.style.display = 'flex';
        linkWrapper.style.display = 'none';
        
        if (acts.length === 0) {
            list.innerHTML = '<span class="empty-msg">Nenhuma atividade cadastrada nesta aba.</span>';
            return;
        }
        
        acts.forEach(a => {
            const isSel = a.id === selectedActivityId;
            const isPendingRisk = !a.noRisk && (!a.riskAssocs || a.riskAssocs.length === 0);
            
            const bg = isSel ? 'var(--dark-accent)' : (isPendingRisk ? '#fff1f2' : '#f8fafc');
            const col = isSel ? '#fff' : (isPendingRisk ? '#991b1b' : '#475569');
            const borderStyle = isPendingRisk && !isSel ? 'border: 1px dashed #fca5a5;' : '';
            
            let riskIcon = '';
            const riskCount = a.riskAssocs ? a.riskAssocs.length : 0;
            if (riskCount > 0) {
                const riskNames = a.riskAssocs.map(ra => {
                    const r = allRisks.find(x => x.id === ra.riskId);
                    return r ? r.desc : '';
                }).filter(Boolean).join('\n- ');
                riskIcon = `<span title="Riscos Associados:\n- ${riskNames}" style="font-size:0.8rem; margin-right:6px; cursor:help; font-weight:bold; color:${isSel ? '#fde047' : 'var(--dark-accent)'};">⚠️ (${riskCount})</span>`;
            } else if (a.noRisk) {
                riskIcon = `<span title="Atividade marcada como sem riscos" style="font-size:0.8rem; margin-right:6px; cursor:help; font-weight:bold; color:${isSel ? '#bbf7d0' : 'var(--dark-accent)'};">✅ (0)</span>`;
            } else {
                riskIcon = `<span title="Atenção: Nenhum risco associado nem marcada como 'Sem riscos'!" style="font-size:0.8rem; margin-right:6px; cursor:help; font-weight:bold; color:${isSel ? '#fca5a5' : '#ef4444'};">❗ (0)</span>`;
            }
            
            const timeStr = formatTimeStr(a.time);
            const sectorStr = a.sector ? ` <span style="font-size: 0.65rem; color: #0f172a; background: #e2e8f0; padding: 2px 6px; border-radius: 4px; margin-left: 6px;">🏢 ${a.sector}</span>` : '';
            html += `<div class="mini-card hover-trigger" style="background:${bg}; color:${col}; ${borderStyle} cursor:pointer; align-items:center;" onclick="selectActivity('${a.id}')">
                <div style="flex:1; display:flex; align-items:center;">
                    ${riskIcon}
                    <b style="font-size:0.75rem; display:block; word-break:break-word; flex:1;">${a.name}${sectorStr}${timeStr}</b>
                </div>
                <div class="no-print hover-target" style="top:50%; transform:translateY(-50%); right:4px; align-items:center;">
                    <span style="cursor:pointer; color:#ef4444; font-size:1.1rem; line-height:1;" onclick="event.stopPropagation(); removeActivity('${a.id}')" title="Excluir">✕</span>
                </div>
            </div>`;
        });
    }
    
    list.innerHTML = html;
}

function toggleNoRisk() {
    if(!selectedActivityId) return;
    const act = dbDesc.models[dbDesc.activeView].activities.find(a => a.id === selectedActivityId);
    
    const isChecked = document.getElementById('chk-no-risk').checked;
    
    if (isChecked && act.riskAssocs.length > 0) {
        if (!confirm("Ao marcar esta opção, todos os vínculos de riscos desta atividade serão removidos. Deseja continuar?")) {
            document.getElementById('chk-no-risk').checked = false;
            return;
        }
        act.riskAssocs = [];
    }
    
    act.noRisk = isChecked;
    saveDesc();
    renderRiskList();
    renderMatrix();
    renderHeatmap();
}

function renderRiskList() {
    const bankContainer = document.getElementById('risk-bank-container');
    const actContainer = document.getElementById('risk-activity-container');
    const title = document.getElementById('risk-panel-title');
    const btnBack = document.getElementById('btn-back-to-bank');
    const btnLinkAllRisks = document.getElementById('btn-link-all-risks');
    const list = document.getElementById('risk-list');
    const addWrapper = document.getElementById('risk-add-wrapper');
    const chkNoRisk = document.getElementById('chk-no-risk');
    
    let btnUnlinkAllRisks = document.getElementById('btn-unlink-all-risks');
    if (btnLinkAllRisks && !btnUnlinkAllRisks) {
        btnUnlinkAllRisks = document.createElement('button');
        btnUnlinkAllRisks.id = 'btn-unlink-all-risks';
        btnUnlinkAllRisks.className = 'btn-edit-action';
        btnUnlinkAllRisks.style.marginLeft = '8px';
        btnUnlinkAllRisks.style.backgroundColor = '#fee2e2';
        btnUnlinkAllRisks.style.color = '#991b1b';
        btnUnlinkAllRisks.innerText = 'Desvincular Todos';
        btnUnlinkAllRisks.onclick = unlinkActFromAllRisks;
        btnLinkAllRisks.parentNode.insertBefore(btnUnlinkAllRisks, btnLinkAllRisks.nextSibling);
    }
    
    let timeContainer = document.getElementById('act-time-container');
    if (!timeContainer) {
        timeContainer = document.createElement('div');
        timeContainer.id = 'act-time-container';
        timeContainer.style.marginBottom = '15px';
        timeContainer.style.padding = '10px';
        timeContainer.style.background = '#f0f7ff';
        timeContainer.style.border = '1px solid #bae6fd';
        timeContainer.style.borderRadius = '6px';
        if (addWrapper) addWrapper.parentNode.insertBefore(timeContainer, addWrapper);
    }

    const allRisks = dbDesc.models[dbDesc.activeView].risks;
    
    if (!selectedActivityId) {
        // Modo Banco de Riscos
        actContainer.style.display = 'none';
        if (timeContainer) timeContainer.style.display = 'none';
        bankContainer.style.display = 'block';
        title.innerText = 'Riscos do Processo';
        btnBack.style.display = 'none';
        if (btnLinkAllRisks) btnLinkAllRisks.style.display = 'none';
        if (btnUnlinkAllRisks) btnUnlinkAllRisks.style.display = 'none';
        
        const gList = document.getElementById('global-risk-list');
        let html = '';
        if (allRisks.length === 0) {
            html = '<span class="empty-msg">Nenhum risco cadastrado para o processo.</span>';
        } else {
            allRisks.forEach(r => {
                const linkedActs = dbDesc.models[dbDesc.activeView].activities.filter(a => !a.noRisk && a.riskAssocs.find(ra => ra.riskId === r.id));
                const availableActs = dbDesc.models[dbDesc.activeView].activities.filter(a => !a.noRisk && !a.riskAssocs.find(ra => ra.riskId === r.id));
                
                const isSel = r.id === selectedRiskId;
                const bg = isSel ? 'var(--dark-accent)' : '#fff';
                const col = isSel ? '#fff' : '#475569';
                
                let actIcon = '';
                if (linkedActs.length > 0) {
                    const actNames = linkedActs.map(a => a.name).join('\n- ');
                    actIcon = `<span title="Atividades Vinculadas:\n- ${actNames}" style="font-size:0.8rem; margin-right:6px; cursor:help; font-weight:bold; color:var(--dark-accent);">📋 (${linkedActs.length})</span>`;
                } else {
                    actIcon = `<span title="Nenhuma atividade vinculada" style="font-size:0.8rem; margin-right:6px; cursor:help; font-weight:bold; color:var(--dark-accent);">(0)</span>`;
                }
                
                html += `<div class="mini-card hover-trigger" style="display:flex; flex-direction:column; gap:8px; background:${bg}; color:${col};">
                    <div style="display:flex; justify-content:space-between; align-items:center; min-height:24px; cursor:pointer;" onclick="selectRisk('${r.id}')">
                        <div style="flex:1; display:flex; align-items:center;">
                            ${actIcon}
                            <span style="font-size:0.75rem; font-weight:600; line-height:1.2; flex:1; word-break:break-word;">${r.desc}</span>
                        </div>
                        <div class="no-print hover-target" style="top:4px; right:4px; align-items:center;">
                            <span style="cursor:pointer; color:#ef4444; font-size:1.1rem; line-height:1;" onclick="event.stopPropagation(); removeGlobalRisk('${r.id}')" title="Excluir">✕</span>
                        </div>
                    </div>
                </div>`;
            });
        }
        gList.innerHTML = html;
        return;
    }
    
    // Modo Atividade Selecionada
    bankContainer.style.display = 'none';
    actContainer.style.display = 'block';
    title.innerText = 'Riscos da Atividade Selecionada';
    btnBack.style.display = 'inline-block';
    
    const act = dbDesc.models[dbDesc.activeView].activities.find(a => a.id === selectedActivityId);
    
    if (timeContainer) {
        timeContainer.style.display = 'block';
        timeContainer.innerHTML = `
            <div style="margin-bottom: 10px;">
                <label style="font-size: 0.65rem; font-weight: 700; color: #0284c7; text-transform: uppercase; margin-bottom: 4px; display: block;">Setor Responsável</label>
                <input type="text" id="act-sector-${act.id}" value="${act.sector || ''}" onchange="updateActSector('${act.id}', this.value)" style="width: 100%; padding: 6px; border: 1px solid #cbd5e1; border-radius: 4px; font-size: 0.8rem;" placeholder="Ex: Financeiro">
            </div>
            <div style="font-size: 0.65rem; font-weight: 700; color: #0284c7; text-transform: uppercase; margin-bottom: 6px;">Tempo Estimado da Atividade</div>
            <div style="display: flex; gap: 8px; align-items: center;">
                <div style="display: flex; flex-direction: column; align-items: center;">
                    <input type="number" min="0" id="time-d-${act.id}" value="${act.time?.d || 0}" onchange="updateActTime('${act.id}', 'd', this.value)" style="width: 40px; padding: 4px; border: 1px solid #cbd5e1; border-radius: 4px; font-size: 0.75rem; text-align: center;">
                    <span style="font-size: 0.6rem; color: #475569; margin-top: 2px;">Dias</span>
                </div>
                <div style="display: flex; flex-direction: column; align-items: center;">
                    <input type="number" min="0" id="time-h-${act.id}" value="${act.time?.h || 0}" onchange="updateActTime('${act.id}', 'h', this.value)" style="width: 40px; padding: 4px; border: 1px solid #cbd5e1; border-radius: 4px; font-size: 0.75rem; text-align: center;">
                    <span style="font-size: 0.6rem; color: #475569; margin-top: 2px;">Horas</span>
                </div>
                <div style="display: flex; flex-direction: column; align-items: center;">
                    <input type="number" min="0" id="time-m-${act.id}" value="${act.time?.m || 0}" onchange="updateActTime('${act.id}', 'm', this.value)" style="width: 40px; padding: 4px; border: 1px solid #cbd5e1; border-radius: 4px; font-size: 0.75rem; text-align: center;">
                    <span style="font-size: 0.6rem; color: #475569; margin-top: 2px;">Min</span>
                </div>
                <div style="display: flex; flex-direction: column; align-items: center;">
                    <input type="number" min="0" id="time-s-${act.id}" value="${act.time?.s || 0}" onchange="updateActTime('${act.id}', 's', this.value)" style="width: 40px; padding: 4px; border: 1px solid #cbd5e1; border-radius: 4px; font-size: 0.75rem; text-align: center;">
                    <span style="font-size: 0.6rem; color: #475569; margin-top: 2px;">Seg</span>
                </div>
            </div>
        `;
    }

    chkNoRisk.checked = act.noRisk || false;
    
    if (act.noRisk) {
        addWrapper.style.display = 'none';
        if (btnLinkAllRisks) btnLinkAllRisks.style.display = 'none';
        if (btnUnlinkAllRisks) btnUnlinkAllRisks.style.display = 'none';
        list.innerHTML = '<span class="empty-msg" style="background: #f0fdf4; border-color: #bbf7d0; color: #166534;">✅ Atividade marcada como sem riscos.</span>';
        return;
    }
    
    if (btnLinkAllRisks) btnLinkAllRisks.style.display = 'inline-block';
    if (btnUnlinkAllRisks) btnUnlinkAllRisks.style.display = 'inline-block';
    addWrapper.style.display = 'flex';
    let html = '';
    
    // Preenche select de riscos existentes
    const sel = document.getElementById('existing-risk-sel');
    const availableRisks = allRisks.filter(r => !act.riskAssocs.find(ra => ra.riskId === r.id));
    
    let selHtml = '<option value="">-- Associar risco existente --</option>';
    availableRisks.forEach(r => {
        selHtml += `<option value="${r.id}">${r.desc}</option>`;
    });
    sel.innerHTML = selHtml;
    
    if (act.riskAssocs.length === 0) {
        list.innerHTML = '<span class="empty-msg">Sem riscos mapeados.</span>';
        return;
    }
    
    act.riskAssocs.forEach((ra) => {
        const r = allRisks.find(x => x.id === ra.riskId);
        if (r) {
            html += `<div class="mini-card hover-trigger" style="display:flex; justify-content:space-between; align-items:center; min-height: 24px;">
                <span style="font-size:0.75rem; font-weight:600; line-height: 1.2; max-width: 80%;">${r.desc}</span>
                <div class="no-print hover-target" style="top:50%; transform:translateY(-50%); right:4px; align-items:center;">
                    <span style="cursor:pointer; color:#ef4444; font-size:1.1rem; line-height:1;" onclick="removeRisk('${act.id}', '${r.id}')" title="Desvincular">✕</span>
                </div>
            </div>`;
        }
    });
    
    list.innerHTML = html;
}

function addGlobalRisk() {
    const inp = document.getElementById('new-global-risk-desc');
    if (!inp) return;
    const desc = inp.value.trim();
    if (!desc) return;
    
    const allRisks = dbDesc.models[dbDesc.activeView].risks;
    let r = allRisks.find(x => x.desc.toLowerCase() === desc.toLowerCase());
    
    if (!r) {
        r = { id: 'risk_' + Date.now(), desc: desc };
        allRisks.push(r);
        saveDesc();
        renderAll();
    } else {
        showToast("Este risco já existe no processo.", "warning");
    }
    
    inp.value = '';
}

function removeGlobalRisk(rId) {
    const isUsed = dbDesc.models[dbDesc.activeView].activities.some(a => a.riskAssocs && a.riskAssocs.find(ra => ra.riskId === rId));
    if (isUsed) {
        if (!confirm("Este risco está vinculado a uma ou mais atividades. Ao excluí-lo, ele será removido de todas. Deseja continuar?")) {
            return;
        }
        dbDesc.models[dbDesc.activeView].activities.forEach(a => {
            if (a.riskAssocs) {
                a.riskAssocs = a.riskAssocs.filter(ra => ra.riskId !== rId);
            }
        });
    } else {
        if (!confirm("Tem certeza que deseja excluir este risco do processo?")) return;
    }
    
    dbDesc.models[dbDesc.activeView].risks = dbDesc.models[dbDesc.activeView].risks.filter(r => r.id !== rId);
    if (selectedRiskId === rId) selectedRiskId = null;
    saveDesc();
    renderAll();
}

function addRisk() {
    const inp = document.getElementById('new-risk-desc');
    if (!inp) return;
    const desc = inp.value.trim();
    if (!desc || !selectedActivityId) return;
    const act = dbDesc.models[dbDesc.activeView].activities.find(a => a.id === selectedActivityId);
    
    if (act.noRisk) return;
    
    const allRisks = dbDesc.models[dbDesc.activeView].risks;
    let r = allRisks.find(x => x.desc.toLowerCase() === desc.toLowerCase());
    
    if (!r) {
        r = { id: 'risk_' + Date.now(), desc: desc };
        allRisks.push(r);
    }
    
    if (!act.riskAssocs.find(ra => ra.riskId === r.id)) {
        act.riskAssocs.push({ riskId: r.id, prob: 1, imp: 1 });
    }
    
    inp.value = '';
    saveDesc();
    renderAll();
}

function linkRiskToAllActs() {
    if (!selectedRiskId) return;
    const acts = dbDesc.models[dbDesc.activeView].activities;
    let count = 0;
    acts.forEach(a => {
        if (!a.noRisk && !a.riskAssocs.find(ra => ra.riskId === selectedRiskId)) {
            a.riskAssocs.push({ riskId: selectedRiskId, prob: 1, imp: 1 });
            count++;
        }
    });
    if (count > 0) {
        saveDesc();
        renderAll();
        showToast(`Risco vinculado a ${count} atividade(s).`, "success");
    } else {
        showToast("Este risco já está vinculado a todas as atividades aplicáveis.", "info");
    }
}

function linkActToAllRisks() {
    if (!selectedActivityId) return;
    const act = dbDesc.models[dbDesc.activeView].activities.find(a => a.id === selectedActivityId);
    if (!act || act.noRisk) return;
    const allRisks = dbDesc.models[dbDesc.activeView].risks;
    let count = 0;
    allRisks.forEach(r => {
        if (!act.riskAssocs.find(ra => ra.riskId === r.id)) {
            act.riskAssocs.push({ riskId: r.id, prob: 1, imp: 1 });
            count++;
        }
    });
    if (count > 0) {
        saveDesc();
        renderAll();
        showToast(`Atividade vinculada a ${count} risco(s).`, "success");
    } else {
        showToast("Esta atividade já possui todos os riscos vinculados.", "info");
    }
}

function unlinkRiskFromAllActs() {
    if (!selectedRiskId) return;
    if (!confirm("Tem certeza que deseja desvincular este risco de TODAS as atividades?")) return;
    const acts = dbDesc.models[dbDesc.activeView].activities;
    let count = 0;
    acts.forEach(a => {
        if (a.riskAssocs) {
            const initialLen = a.riskAssocs.length;
            a.riskAssocs = a.riskAssocs.filter(ra => ra.riskId !== selectedRiskId);
            if (a.riskAssocs.length < initialLen) count++;
        }
    });
    if (count > 0) {
        saveDesc();
        renderAll();
        showToast(`Risco desvinculado de ${count} atividade(s).`, "success");
    } else {
        showToast("Este risco não está vinculado a nenhuma atividade.", "info");
    }
}

function unlinkActFromAllRisks() {
    if (!selectedActivityId) return;
    if (!confirm("Tem certeza que deseja desvincular TODOS os riscos desta atividade?")) return;
    const act = dbDesc.models[dbDesc.activeView].activities.find(a => a.id === selectedActivityId);
    if (!act || act.noRisk) return;
    
    if (act.riskAssocs && act.riskAssocs.length > 0) {
        const count = act.riskAssocs.length;
        act.riskAssocs = [];
        saveDesc();
        renderAll();
        showToast(`Atividade desvinculada de ${count} risco(s).`, "success");
    } else {
        showToast("Esta atividade não possui riscos vinculados.", "info");
    }
}

function associateRisk() {
    const sel = document.getElementById('existing-risk-sel');
    const rId = sel.value;
    if (!rId || !selectedActivityId) return;
    
    const act = dbDesc.models[dbDesc.activeView].activities.find(a => a.id === selectedActivityId);
    if (act.noRisk) return;
    
    if (!act.riskAssocs.find(ra => ra.riskId === rId)) {
        act.riskAssocs.push({ riskId: rId, prob: 1, imp: 1 });
    }
    
    sel.value = '';
    saveDesc();
    renderAll();
}

function associateActivity() {
    const sel = document.getElementById('existing-act-sel');
    const actId = sel.value;
    if (!actId || !selectedRiskId) return;
    
    const act = dbDesc.models[dbDesc.activeView].activities.find(a => a.id === actId);
    if (act && !act.riskAssocs.find(ra => ra.riskId === selectedRiskId)) {
        act.riskAssocs.push({ riskId: selectedRiskId, prob: 1, imp: 1 });
        saveDesc();
        renderAll();
    }
    sel.value = '';
}

function removeRisk(actId, rId) {
    const act = dbDesc.models[dbDesc.activeView].activities.find(a => a.id === actId);
    act.riskAssocs = act.riskAssocs.filter(ra => ra.riskId !== rId);
    saveDesc();
    renderAll();
}

function updateRiskVal(actId, rId, field, val) {
    const act = dbDesc.models[dbDesc.activeView].activities.find(a => a.id === actId);
    if (act && act.riskAssocs) {
        const assoc = act.riskAssocs.find(ra => ra.riskId === rId);
        if (assoc) {
            assoc[field] = parseInt(val);
            saveDesc();
            renderMatrix();
            renderHeatmap();
        }
    }
}

function getRiskLevelInfo(p, i) {
    const score = p * i;
    if (score >= 6) return { lbl: 'Alto', col: '#ef4444', bg: '#fef2f2' }; // Vermelho
    if (score >= 3) return { lbl: 'Médio', col: '#d97706', bg: '#fffbeb' }; // Laranja/Amarelo
    return { lbl: 'Baixo', col: '#16a34a', bg: '#f0fdf4' }; // Verde
}

let dragMatrixActId = null;
let dragMatrixRiskId = null;
let dragMatrixScore = null;

function onDragStartMatrix(e, actId, rId, score) {
    dragMatrixActId = actId;
    dragMatrixRiskId = rId;
    dragMatrixScore = parseInt(score);
    e.dataTransfer.effectAllowed = 'move';
    setTimeout(() => e.target.classList.add('dragging-matrix'), 0);
}

function onDragOverMatrix(e, score) {
    if (parseInt(score) === dragMatrixScore) {
        e.preventDefault();
        e.currentTarget.classList.add('drag-over-matrix');
    }
}

function onDragLeaveMatrix(e) {
    e.currentTarget.classList.remove('drag-over-matrix');
}

function onDropMatrix(e, targetActId, targetRId, score) {
    e.preventDefault();
    e.currentTarget.classList.remove('drag-over-matrix');
    if (parseInt(score) !== dragMatrixScore) return;
    if (dragMatrixActId === targetActId && dragMatrixRiskId === targetRId) return;

    let itemsWithScore = [];
    dbDesc.models[dbDesc.activeView].activities.forEach(act => {
        if (act.riskAssocs) {
            act.riskAssocs.forEach(ra => {
                if (ra.prob * ra.imp === dragMatrixScore) {
                    itemsWithScore.push({ actId: act.id, rId: ra.riskId, ra: ra });
                }
            });
        }
    });

    itemsWithScore.sort((a, b) => (a.ra.order || 0) - (b.ra.order || 0));

    const sourceIdx = itemsWithScore.findIndex(x => x.actId === dragMatrixActId && x.rId === dragMatrixRiskId);
    const targetIdx = itemsWithScore.findIndex(x => x.actId === targetActId && x.rId === targetRId);

    if (sourceIdx >= 0 && targetIdx >= 0) {
        const item = itemsWithScore.splice(sourceIdx, 1)[0];
        itemsWithScore.splice(targetIdx, 0, item);
        
        itemsWithScore.forEach((x, i) => {
            x.ra.order = i;
        });

        saveDesc();
        renderMatrix();
    }
}

function renderMatrix() {
    const tbody = document.getElementById('matrix-body');
    let html = '';
    let hasItems = false;
    
    const allRisks = dbDesc.models[dbDesc.activeView].risks;
    let rows = [];
    
    dbDesc.models[dbDesc.activeView].activities.forEach(act => {
        if (act.noRisk) {
            rows.push({ act: act, type: 'norisk', score: -1, order: 0 });
        } else if (act.riskAssocs && act.riskAssocs.length > 0) {
            act.riskAssocs.forEach((ra) => {
                const r = allRisks.find(x => x.id === ra.riskId);
                if (r) {
                    rows.push({ act: act, ra: ra, r: r, type: 'risk', score: ra.prob * ra.imp, order: ra.order || 0 });
                }
            });
        } else {
            rows.push({ act: act, type: 'pending', score: -2, order: 0 });
        }
    });

    rows.sort((a, b) => {
        if (a.score !== b.score) return b.score - a.score;
        return (a.order || 0) - (b.order || 0);
    });

    rows.forEach(row => {
        hasItems = true;
        if (row.type === 'norisk') {
            html += `<tr>
                <td style="font-size:0.75rem; font-weight:700; color:#475569; max-width: 150px; overflow-wrap: break-word;">${row.act.name}</td>
                <td colspan="4" style="font-size:0.75rem; color:#16a34a; font-style:italic; text-align:center;">Atividade não possui risco associado</td>
            </tr>`;
        } else if (row.type === 'pending') {
            html += `<tr style="background-color: #fff1f2;">
                <td style="font-size:0.75rem; font-weight:700; color:#991b1b; max-width: 150px; overflow-wrap: break-word; border-left: 4px solid #ef4444;">${row.act.name}</td>
                <td colspan="4" style="font-size:0.75rem; color:#ef4444; font-weight:bold; text-align:center;">❗ Atenção: Vincule um risco ou marque a atividade como "Sem Risco"</td>
            </tr>`;
        } else {
            const { act, ra, r, score } = row;
            const lvl = getRiskLevelInfo(ra.prob, ra.imp);
            html += `<tr class="matrix-row hover-trigger" draggable="true" ondragstart="onDragStartMatrix(event, '${act.id}', '${r.id}', ${score})" ondragend="this.classList.remove('dragging-matrix')" ondragover="onDragOverMatrix(event, ${score})" ondragleave="onDragLeaveMatrix(event)" ondrop="onDropMatrix(event, '${act.id}', '${r.id}', ${score})">
                <td style="font-size:0.75rem; font-weight:700; color:#475569; max-width: 150px; overflow-wrap: break-word;">
                    <span class="matrix-drag-handle no-print" title="Segure para arrastar e reordenar (Apenas empates)">☰</span>${act.name}
                </td>
                <td style="font-size:0.75rem; max-width: 250px; overflow-wrap: break-word;">${r.desc}</td>
                <td>
                    <select class="status-select-inline" onchange="updateRiskVal('${act.id}', '${r.id}', 'prob', this.value)">
                        <option value="1" ${ra.prob===1?'selected':''}>1 - Baixa</option>
                        <option value="2" ${ra.prob===2?'selected':''}>2 - Média</option>
                        <option value="3" ${ra.prob===3?'selected':''}>3 - Alta</option>
                    </select>
                </td>
                <td>
                    <select class="status-select-inline" onchange="updateRiskVal('${act.id}', '${r.id}', 'imp', this.value)">
                        <option value="1" ${ra.imp===1?'selected':''}>1 - Baixo</option>
                        <option value="2" ${ra.imp===2?'selected':''}>2 - Médio</option>
                        <option value="3" ${ra.imp===3?'selected':''}>3 - Alto</option>
                    </select>
                </td>
                <td>
                    <span class="cat-badge" style="background:${lvl.bg}; color:${lvl.col}; border-color:${lvl.col};">${lvl.lbl} (${score})</span>
                </td>
            </tr>`;
        }
    });

    if (!hasItems) {
        html = `<tr><td colspan="5" class="empty-state" style="text-align:center">Nenhuma atividade cadastrada neste modelo.</td></tr>`;
    }
    
    tbody.innerHTML = html;
}

function renderHeatmap() {
    const hm = document.getElementById('heatmap-container');
    if (hm) hm.style.overflow = 'visible';
    const counts = { '3-1':[], '3-2':[], '3-3':[], '2-1':[], '2-2':[], '2-3':[], '1-1':[], '1-2':[], '1-3':[] };
    
    const allRisks = dbDesc.models[dbDesc.activeView].risks;
    dbDesc.models[dbDesc.activeView].activities.forEach(act => {
        if (!act.noRisk && act.riskAssocs) {
            act.riskAssocs.forEach(ra => {
                const r = allRisks.find(x => x.id === ra.riskId);
                if (r) counts[`${ra.prob}-${ra.imp}`].push(r.desc);
            });
        }
    });

    const makeCell = (p, i, bg) => {
        const risks = [...new Set(counts[`${p}-${i}`])];
        const val = counts[`${p}-${i}`].length;
        let text = '';
        if (val > 0) {
            const riskListHtml = risks.map(r => `• ${r}`).join('<br>');
            text = `<div class="hover-trigger" style="width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; cursor: help;">
                        <b style="font-size:1.5rem; color:#fff; text-shadow: 0 1px 2px rgba(0,0,0,0.5);">${val}</b>
                        <div class="hover-target no-print" style="top: auto; bottom: 80%; left: 50%; transform: translateX(-50%); right: auto; width: max-content; max-width: 250px; flex-direction: column; align-items: flex-start; text-align: left; font-size: 0.75rem; color: #1e293b; z-index: 100;">
                            <b style="color: var(--dark-accent); border-bottom: 1px solid #e2e8f0; width: 100%; padding-bottom: 4px; margin-bottom: 4px;">Riscos (${val}):</b>
                            <span>${riskListHtml}</span>
                        </div>
                    </div>`;
        }
        return `<div style="background:${bg}; display:flex; align-items:center; justify-content:center; border-radius:2px;">${text}</div>`;
    };

    // Construindo o grid (linha a linha, Prob de 3 até 1, e Impacto de 1 até 3)
    hm.innerHTML = `
        ${makeCell(3, 1, '#facc15')} ${makeCell(3, 2, '#ef4444')} ${makeCell(3, 3, '#b91c1c')}
        ${makeCell(2, 1, '#4ade80')} ${makeCell(2, 2, '#facc15')} ${makeCell(2, 3, '#ef4444')}
        ${makeCell(1, 1, '#22c55e')} ${makeCell(1, 2, '#4ade80')} ${makeCell(1, 3, '#facc15')}
    `;
}

// --- LÓGICA DOS POPs (PROCEDIMENTOS OPERACIONAIS) --- //

let isPopEditMode = false;
let dragActIdPop = null;
let dragStepIdxPop = null;
let dragActIdPopGroup = null;

function onDragStartPopAct(e, actId) {
    if (!isPopEditMode) return;
    dragActIdPopGroup = actId;
    e.dataTransfer.effectAllowed = 'move';
    e.stopPropagation();
    setTimeout(() => e.target.classList.add('dragging-act'), 0);
}

function onDragOverPopGroup(e) {
    if (!isPopEditMode || !dragActIdPopGroup) return;
    e.preventDefault();
}

function onDropPopGroup(e, groupName) {
    if (!isPopEditMode || !dragActIdPopGroup) return;
    e.preventDefault();
    e.stopPropagation();
    const container = e.target.closest('.pop-group-container');
    if (container) container.classList.remove('drag-over-group');
    const act = dbDesc.models[dbDesc.activeView].activities.find(a => a.id === dragActIdPopGroup);
    const origGroup = act.etapa || 'Etapas Não Classificadas';
    if (act && origGroup !== groupName) {
        act.etapa = groupName === 'Etapas Não Classificadas' ? '' : groupName;
        saveDesc();
        renderPop();
    }
    dragActIdPopGroup = null;
}

function togglePopEditMode() {
    isPopEditMode = !isPopEditMode;
    document.getElementById('btn-edit-pop').innerText = isPopEditMode ? 'Concluir Edição' : 'Editar POP';
    document.getElementById('btn-edit-pop').style.backgroundColor = isPopEditMode ? 'var(--dark-accent)' : '';
    document.getElementById('btn-edit-pop').style.color = isPopEditMode ? '#fff' : '';
    renderPop();
}

function togglePopActivity(id) {
    expandedPopActivities[id] = !expandedPopActivities[id];
    renderPop();
}

function addPopStep(actId) {
    const inp = document.getElementById('new-pop-step-' + actId);
    const desc = inp ? inp.value.trim() : '';
    if (!desc) return;
    
    const act = dbDesc.models[dbDesc.activeView].activities.find(a => a.id === actId);
    if (!act) return;
    
    if (!act.steps) act.steps = [];
    
    act.steps.push({ id: 'step_' + Date.now(), desc: desc, status: null });
    inp.value = '';
    saveDesc();
    renderPop();
}

function removePopStep(actId, stepId) {
    const act = dbDesc.models[dbDesc.activeView].activities.find(a => a.id === actId);
    if (!act || !act.steps) return;
    
    act.steps = act.steps.filter(s => s.id !== stepId);
    saveDesc();
    renderPop();
}

function onDragStartPop(e, actId, idx) {
    dragActIdPop = actId;
    dragStepIdxPop = idx;
    e.dataTransfer.effectAllowed = 'move';
    setTimeout(() => e.target.classList.add('dragging'), 0);
}

function onDragOverPop(e) {
    e.preventDefault();
}

function onDropPop(e, actId, dropIdx) {
    e.preventDefault();
    const row = e.target.closest('.pop-step-row');
    if (row) row.classList.remove('drag-over');
    
    if (dragActIdPop === actId && dragStepIdxPop !== null && dragStepIdxPop !== dropIdx) {
        const act = dbDesc.models[dbDesc.activeView].activities.find(a => a.id === actId);
        const step = act.steps.splice(dragStepIdxPop, 1)[0];
        act.steps.splice(dropIdx, 0, step);
        saveDesc();
        renderPop();
    }
}

function updateActEtapa(actId, val) {
    const act = dbDesc.models[dbDesc.activeView].activities.find(a => a.id === actId);
    if (act) {
        act.etapa = val.trim();
        saveDesc();
        renderPop();
    }
}

function attachPopMedia(actId, stepId) {
    const act = dbDesc.models[dbDesc.activeView].activities.find(a => a.id === actId);
    const step = act.steps.find(s => s.id === stepId);
    const url = prompt("Insira a URL da imagem ou vídeo (YouTube / MP4):", step.media || '');
    if (url !== null) {
        step.media = url.trim();
        saveDesc();
        renderPop();
    }
}

function getPopMediaHtml(url) {
    if (!url) return '';
    if (url.includes('youtube.com/watch') || url.includes('youtu.be/')) {
        let vid = url.split('v=')[1] || url.split('youtu.be/')[1];
        if(vid) vid = vid.split('&')[0];
        return `<iframe src="https://www.youtube.com/embed/${vid}" allowfullscreen></iframe>`;
    } else if (url.match(/\.(mp4|webm|ogg)$/i)) {
        return `<video src="${url}" autoplay loop muted></video>`;
    } else {
        return `<img src="${url}" alt="Mídia" style="max-width: 100%; max-height: 250px; object-fit: contain; border-radius: 4px;"/>`;
    }
}

function setPopStepStatus(actId, stepId, status) {
    const act = dbDesc.models[dbDesc.activeView].activities.find(a => a.id === actId);
    if (!act || !act.steps) return;
    const step = act.steps.find(s => s.id === stepId);
    if (step) {
        step.status = step.status === status ? null : status;
        saveDesc();
        renderPop();
    }
}

function renderPop() {
    const container = document.getElementById('pop-tree-container');
    const acts = dbDesc.models[dbDesc.activeView].activities;
    
    if (acts.length === 0) {
        container.innerHTML = '<div class="empty-state" style="padding: 20px;">Nenhuma atividade cadastrada no modelo.</div>';
        return;
    }
    
    const groups = {};
    acts.forEach(a => {
        const g = a.etapa || 'Etapas Não Classificadas';
        if (!groups[g]) groups[g] = [];
        groups[g].push(a);
    });
    
    let html = '<div style="display: flex; flex-direction: column; gap: 15px;">';
    
    Object.keys(groups).forEach(groupName => {
        html += `<div class="pop-group-container" style="background: #fdfdfd; border: 1px solid var(--border-color); border-radius: 8px; padding: 15px; transition: background-color 0.2s, border-color 0.2s;"
            ${isPopEditMode ? `ondragover="onDragOverPopGroup(event)" ondragenter="this.classList.add('drag-over-group')" ondragleave="this.classList.remove('drag-over-group')" ondrop="onDropPopGroup(event, '${groupName}')"` : ''}>
            <h4 style="font-size: 0.95rem; color: var(--dark-accent); margin-top: 0; margin-bottom: 12px; padding-bottom: 5px; border-bottom: 2px solid var(--primary-soft); display: flex; align-items: center; gap: 8px;">
                📌 ${groupName}
            </h4>
            <div style="display: flex; flex-direction: column; gap: 8px;">`;
            
        groups[groupName].forEach(a => {
            const isExpanded = !!expandedPopActivities[a.id];
            const stepCount = (a.steps && a.steps.length > 0) ? a.steps.length : 0;
            
            html += `<div class="pop-act-container" style="border: 1px solid var(--border-color); border-radius: 6px; background: #fff; transition: opacity 0.2s, transform 0.2s;"
                ${isPopEditMode ? `draggable="true" ondragstart="onDragStartPopAct(event, '${a.id}')" ondragend="this.classList.remove('dragging-act')"` : ''}>
                <div style="padding: 10px 15px; background: #f8fafc; cursor: pointer; display: flex; justify-content: space-between; align-items: center; border-radius: ${isExpanded ? '5px 5px 0 0' : '5px'};" onclick="togglePopActivity('${a.id}')">
                    <div style="display: flex; align-items: center; gap: 10px; ${isPopEditMode ? 'cursor: grab;' : ''}">
                        <span style="font-weight: 700; color: var(--dark-accent); font-size: 0.8rem;">${isExpanded ? '▼' : '▶'}</span>
                        <span style="font-weight: 600; color: #334155; font-size: 0.85rem;">${a.name}</span>
                    </div>
                    <span style="font-size: 0.65rem; background: #e2e8f0; color: #475569; padding: 2px 8px; border-radius: 12px; font-weight: 700;">${stepCount} passos</span>
                </div>`;
                
            if (isExpanded) {
                html += `<div style="padding: 15px; border-top: 1px solid var(--border-color); background: #fff;">`;
                
                if (isPopEditMode) {
                    html += `<div class="input-row" style="margin-bottom: 15px;">
                        <input type="text" placeholder="Atribuir a um Grupo de Etapa (Ex: Preparação)" value="${a.etapa || ''}" onchange="updateActEtapa('${a.id}', this.value)" style="padding: 6px; border: 1px dashed var(--accent); border-radius: 4px; font-size: 0.75rem; width: 100%; background: #f0f7ff;">
                    </div>`;
                }
                
                if (a.steps && a.steps.length > 0) {
                    html += `<div style="display: flex; flex-direction: column; gap: 8px; margin-bottom: 15px;">`;
                    a.steps.forEach((step, idx) => {
                        const st = step.status || null;
                        const btnSim = `pop-status-btn ${st === 'sim' ? 'active-sim' : ''}`;
                        const btnNao = `pop-status-btn ${st === 'nao' ? 'active-nao' : ''}`;
                        const btnNa = `pop-status-btn ${st === 'na' ? 'active-na' : ''}`;

                        const mediaHtml = step.media ? `
                            <div class="media-hover-trigger no-print" style="margin-left: 6px; font-size: 1rem;" title="Ver Anexo (Clique para abrir na guia)" onclick="window.open('${step.media}', '_blank')">
                                🖼️
                                <div class="media-preview-box" onclick="event.stopPropagation()">${getPopMediaHtml(step.media)}</div>
                            </div>` : '';

                        let dragAttrs = isPopEditMode ? `draggable="true" ondragstart="onDragStartPop(event, '${a.id}', ${idx})" ondragend="this.classList.remove('dragging')" ondragover="onDragOverPop(event)" ondragenter="this.classList.add('drag-over')" ondragleave="this.classList.remove('drag-over')" ondrop="onDropPop(event, '${a.id}', ${idx})"` : '';

                        html += `<div class="pop-step-row status-${st || ''}" style="display: flex; align-items: flex-start; gap: 10px; padding: 8px; background: #f8fafc; border-radius: 4px; border: 1px solid #e2e8f0; transition: all 0.2s;" ${dragAttrs}>
                            ${isPopEditMode ? `<div class="pop-drag-handle" title="Segure para arrastar">☰</div>` : ''}
                            <div style="font-weight: bold; color: var(--accent); min-width: 20px;">${idx + 1}.</div>
                            <div style="flex: 1; font-size: 0.8rem; color: #334155; padding-top: 2px;">
                                ${step.desc}
                                ${mediaHtml}
                            </div>
                            <div style="display: flex; gap: 4px; align-items: center;">
                                <button class="${btnSim}" onclick="setPopStepStatus('${a.id}', '${step.id}', 'sim')">Sim</button>
                                <button class="${btnNao}" onclick="setPopStepStatus('${a.id}', '${step.id}', 'nao')">Não</button>
                                <button class="${btnNa}" onclick="setPopStepStatus('${a.id}', '${step.id}', 'na')">N/A</button>
                            </div>
                            ${isPopEditMode ? `
                            <div style="display: flex; gap: 8px; margin-left: 10px; align-items: center;">
                                <span style="cursor:pointer; color:#0284c7; font-size:1.1rem; line-height:1;" onclick="attachPopMedia('${a.id}', '${step.id}')" title="${step.media ? 'Alterar Anexo' : 'Anexar Mídia'}">🔗</span>
                                <span style="cursor:pointer; color:#ef4444; font-size:1.1rem; line-height:1;" onclick="removePopStep('${a.id}', '${step.id}')" title="Excluir">✕</span>
                            </div>
                            ` : ''}
                        </div>
                        `;
                    });
                    html += `</div>`;
                } else {
                    html += `<div class="empty-msg" style="margin-bottom: 15px;">Nenhum passo cadastrado.</div>`;
                }
                
                if (isPopEditMode) {
                    html += `<div class="input-row mb-0" style="align-items: center;">
                        <input type="text" id="new-pop-step-${a.id}" placeholder="Descreva um novo passo..." class="flex-1" style="padding: 6px; border: 1px solid #cbd5e1; border-radius: 4px; font-size: 0.8rem;" onkeypress="if(event.key==='Enter') addPopStep('${a.id}')">
                        <button class="btn-main" style="padding: 6px 12px; font-size: 0.75rem;" onclick="addPopStep('${a.id}')">Adicionar</button>
                    </div>`;
                }
                
                html += `</div>`;
            }
            html += `</div>`;
        });
        html += `</div></div>`;
    });
    
    html += '</div>';
    
    container.innerHTML = html;
}

function renderPrintPOPs() {
    const printContainer = document.getElementById('pop-print-container');
    const acts = dbDesc.models[dbDesc.activeView].activities;
    let html = '';
    
    const popActs = acts.filter(a => a.steps && a.steps.length > 0);
    
    if (popActs.length === 0) {
        printContainer.innerHTML = '<p style="color: #64748b; font-style: italic;">Nenhum procedimento operacional padrão cadastrado para este modelo.</p>';
        return;
    }
    
    popActs.forEach(act => {
        html += `<div style="margin-bottom: 20px; page-break-inside: avoid;">
            <h4 style="color: var(--dark-accent); margin-bottom: 10px; font-size: 1rem; border-bottom: 1px solid var(--border-color); padding-bottom: 5px;">${act.name}</h4>
            <div style="display: flex; flex-direction: column; gap: 8px;">`;
        
        act.steps.forEach((step, idx) => {
            const st = step.status;
            const simStyle = st === 'sim' ? 'background: #22c55e; color: white; border-color: #22c55e;' : 'color: #94a3b8; border-color: #cbd5e1;';
            const naoStyle = st === 'nao' ? 'background: #ef4444; color: white; border-color: #ef4444;' : 'color: #94a3b8; border-color: #cbd5e1;';
            const naStyle = st === 'na' ? 'background: #64748b; color: white; border-color: #64748b;' : 'color: #94a3b8; border-color: #cbd5e1;';

            html += `<div style="display: flex; gap: 10px; align-items: flex-start; padding: 6px 0;">
                <div style="width: 20px; font-weight: bold; color: var(--accent);">${idx + 1}.</div>
                <div style="flex: 1; font-size: 0.85rem; color: #334155;">${step.desc}</div>
                <div style="display: flex; gap: 5px;">
                    <span style="font-size: 0.6rem; padding: 2px 8px; border: 1px solid; border-radius: 10px; ${simStyle}">Sim</span>
                    <span style="font-size: 0.6rem; padding: 2px 8px; border: 1px solid; border-radius: 10px; ${naoStyle}">Não</span>
                    <span style="font-size: 0.6rem; padding: 2px 8px; border: 1px solid; border-radius: 10px; ${naStyle}">N/A</span>
                </div>
            </div>`;
        });
        
        html += `</div></div>`;
    });
    
    printContainer.innerHTML = html;
}

function saveDesc() {
    try {
        localStorage.setItem('pdrim_desc_v10_9', JSON.stringify(dbDesc));
        updateBreadcrumbs();
    } catch (e) {
        showToast("Erro ao salvar: Limite de armazenamento atingido.", "error");
    }
}

// --- LÓGICA DE MARCAÇÃO NA IMAGEM (DESENHO) --- //

let isDrawingMode = false;
let isDrawing = false;
let drawTool = 'pen'; // 'pen', 'rect', 'circle', 'arrow', 'path', 'text'
let drawType = 'fluxo-positivo';
let drawColor = '#3b82f6'; // Azul por padrão (Fluxo positivo)
let drawContext = null;
let lastX = 0;
let lastY = 0;
let currentShape = null;
let legacyImage = null;
let selectedShapeIndex = -1;
let dragStartX = 0;
let dragStartY = 0;
let isEditingText = false;
let isDrawingPath = false;
let pathPoints = [];

function getDiagramAlerts(model) {
    const hasRegisteredRisks = model.risks && model.risks.length > 0;
    const hasRiskDrawings = (model.drawingObjects || []).some(o => o.type === 'risco' || o.color === '#f97316');

    let alerts = [];
    if (hasRegisteredRisks && !hasRiskDrawings) {
        alerts.push('Existem riscos cadastrados na lista, mas nenhuma marcação correspondente de Risco (Laranja) desenhada na imagem.');
    } else if (!hasRegisteredRisks && hasRiskDrawings) {
        alerts.push('Existem marcações de Risco (Laranja) na imagem, mas nenhum risco correspondente se encontra cadastrado na lista.');
    }
    return alerts;
}

function checkDiagramAlerts() {
    const mainAlertsBox = document.getElementById('diagram-alerts');
    const compareAsIsAlerts = document.getElementById('compare-asis-alerts');
    const compareToBeAlerts = document.getElementById('compare-tobe-alerts');

    if (dbDesc.activeView === 'compare') {
        if (mainAlertsBox) mainAlertsBox.style.display = 'none';
        
        if (compareAsIsAlerts) {
            const alertsAsIs = getDiagramAlerts(dbDesc.models['as-is']);
            if (alertsAsIs.length > 0) {
                compareAsIsAlerts.innerHTML = '⚠️ <b style="color:var(--danger)">Inconsistência de Mapeamento</b><br>' + alertsAsIs.map(a => `• ${a}`).join('<br>');
                compareAsIsAlerts.style.display = 'block';
            } else {
                compareAsIsAlerts.style.display = 'none';
            }
        }

        if (compareToBeAlerts) {
            const alertsToBe = getDiagramAlerts(dbDesc.models['to-be']);
            if (alertsToBe.length > 0) {
                compareToBeAlerts.innerHTML = '⚠️ <b style="color:var(--danger)">Inconsistência de Mapeamento</b><br>' + alertsToBe.map(a => `• ${a}`).join('<br>');
                compareToBeAlerts.style.display = 'block';
            } else {
                compareToBeAlerts.style.display = 'none';
            }
        }
    } else {
        if (compareAsIsAlerts) compareAsIsAlerts.style.display = 'none';
        if (compareToBeAlerts) compareToBeAlerts.style.display = 'none';

        if (mainAlertsBox) {
            const alerts = getDiagramAlerts(dbDesc.models[dbDesc.activeView]);
            if (alerts.length > 0) {
                mainAlertsBox.innerHTML = '⚠️ <b style="color:var(--danger)">Atenção: Inconsistência de Mapeamento</b><br>' + alerts.map(a => `• ${a}`).join('<br>');
                mainAlertsBox.style.display = 'block';
            } else {
                mainAlertsBox.style.display = 'none';
            }
        }
    }
}

function openInlineEditor(x, y, initialText, onComplete) {
    if (isEditingText) return;
    isEditingText = true;
    
    const wrapper = document.getElementById('img-wrapper');
    const canvas = document.getElementById('draw-canvas');
    let input = document.getElementById('inline-text-editor');
    
    if (!input) {
        input = document.createElement('input');
        input.type = 'text';
        input.id = 'inline-text-editor';
        input.className = 'inline-text-editor no-print';
        input.placeholder = 'Digite o texto e aperte Enter...';
        wrapper.appendChild(input);
    }
    
    let left = x;
    let top = y;
    if (left + 220 > canvas.width) left = canvas.width - 220;
    if (top + 40 > canvas.height) top = canvas.height - 40;
    if (left < 0) left = 10;
    if (top < 0) top = 10;

    input.style.left = left + 'px';
    input.style.top = top + 'px';
    input.value = initialText || '';
    input.style.display = 'block';
    input.focus();

    const finishEditing = () => {
        if (input.style.display === 'none') return;
        input.style.display = 'none';
        input.removeEventListener('blur', finishEditing);
        input.removeEventListener('keydown', handleKey);
        isDrawing = false;
        setTimeout(() => isEditingText = false, 150);
        if (onComplete) onComplete(input.value.trim());
    };

    const handleKey = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            finishEditing();
        } else if (e.key === 'Escape') {
            e.preventDefault();
            input.value = initialText || ''; 
            finishEditing();
        }
        e.stopPropagation();
    };

    input.addEventListener('blur', finishEditing);
    input.addEventListener('keydown', handleKey);
}

document.addEventListener('keydown', (e) => {
    if (isDrawingMode && !isEditingText) {
        if (e.key === 'Escape' && drawTool === 'path' && isDrawingPath) {
            e.preventDefault();
            finishPath();
            return;
        }
        if (e.ctrlKey && e.key.toLowerCase() === 'z') {
            e.preventDefault();
            undoDraw();
        } else if (e.key === 'F2') {
            e.preventDefault();
            if (selectedShapeIndex !== -1) {
                const shape = dbDesc.models[dbDesc.activeView].drawingObjects[selectedShapeIndex];
                const bb = getBoundingBox(shape);
                const x = Math.max(10, bb.x);
                const y = Math.max(10, bb.y + bb.h + 5);
                const isTextTool = shape.tool === 'text';
                const initialText = isTextTool ? shape.text : (shape.label || '');

                openInlineEditor(x, y, initialText, (newText) => {
                    if (isTextTool) {
                        shape.text = newText;
                    } else {
                        shape.label = newText;
                    }
                    saveDrawing();
                    redrawAll();
                });
            } else {
                showToast("Selecione um elemento com a ferramenta 'Mover' primeiro para editá-lo.", "warning");
            }
        }
    }
});

function undoDraw() {
    if (!isDrawingMode) return;
    const objects = dbDesc.models[dbDesc.activeView].drawingObjects;
    if (objects && objects.length > 0) {
        objects.pop();
        redrawAll();
        saveDrawing();
    }
}

function finishPath() {
    if (isDrawingPath && currentShape && currentShape.points.length > 1) {
        if (!dbDesc.models[dbDesc.activeView].drawingObjects) {
            dbDesc.models[dbDesc.activeView].drawingObjects = [];
        }
        const shapeToSave = {...currentShape};
        delete shapeToSave.previewX;
        delete shapeToSave.previewY;
        dbDesc.models[dbDesc.activeView].drawingObjects.push(shapeToSave);
        
        isDrawingPath = false;
        pathPoints = [];
        currentShape = null;
        redrawAll();
        saveDrawing();

        setTimeout(() => {
            const bb = getBoundingBox(shapeToSave);
            const lx = Math.max(10, bb.x + (bb.w / 2) - 50);
            const ly = Math.max(10, bb.y + bb.h + 10);
            openInlineEditor(lx, ly, '', (newLabel) => {
                if (newLabel && newLabel !== '') {
                    shapeToSave.label = newLabel;
                    redrawAll();
                    saveDrawing();
                }
            });
        }, 50);
    } else {
        isDrawingPath = false;
        pathPoints = [];
        currentShape = null;
        redrawAll();
    }
}

function getBoundingBox(shape) {
    if (shape.tool === 'pen' || shape.tool === 'path') {
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        shape.points.forEach(p => {
            if (p.x < minX) minX = p.x;
            if (p.y < minY) minY = p.y;
            if (p.x > maxX) maxX = p.x;
            if (p.y > maxY) maxY = p.y;
        });
        return { x: minX - 5, y: minY - 5, w: maxX - minX + 10, h: maxY - minY + 10 };
    } else if (shape.tool === 'rect') {
        return { x: Math.min(shape.x, shape.x + shape.w) - 5, y: Math.min(shape.y, shape.y + shape.h) - 5, w: Math.abs(shape.w) + 10, h: Math.abs(shape.h) + 10 };
    } else if (shape.tool === 'circle') {
        return { x: shape.x - shape.radius - 5, y: shape.y - shape.radius - 5, w: shape.radius * 2 + 10, h: shape.radius * 2 + 10 };
    } else if (shape.tool === 'arrow') {
        let minX = Math.min(shape.x1, shape.x2), minY = Math.min(shape.y1, shape.y2);
        let maxX = Math.max(shape.x1, shape.x2), maxY = Math.max(shape.y1, shape.y2);
        return { x: minX - 5, y: minY - 5, w: maxX - minX + 10, h: maxY - minY + 10 };
    } else if (shape.tool === 'text') {
        drawContext.font = "bold 20px 'Open Sans', sans-serif";
        const metrics = drawContext.measureText(shape.text);
        return { x: shape.x, y: shape.y - 20, w: metrics.width, h: 25 };
    }
    return {x: 0, y: 0, w: 0, h: 0};
}

function hitTest(x, y, shape) {
    const bb = getBoundingBox(shape);
    return (x >= bb.x && x <= bb.x + bb.w && y >= bb.y && y <= bb.y + bb.h);
}

function moveShape(shape, dx, dy) {
    if (shape.tool === 'pen' || shape.tool === 'path') {
        shape.points.forEach(p => { p.x += dx; p.y += dy; });
    } else if (shape.tool === 'rect') {
        shape.x += dx; shape.y += dy;
    } else if (shape.tool === 'circle') {
        shape.x += dx; shape.y += dy;
    } else if (shape.tool === 'arrow') {
        shape.x1 += dx; shape.y1 += dy;
        shape.x2 += dx; shape.y2 += dy;
    } else if (shape.tool === 'text') {
        shape.x += dx; shape.y += dy;
    }
}

function drawShape(shape) {
    drawContext.strokeStyle = shape.color;
    drawContext.fillStyle = shape.fill || 'transparent';
    drawContext.lineWidth = 4;
    drawContext.lineCap = 'round';
    drawContext.lineJoin = 'round';

    if (shape.tool === 'pen') {
        if (!shape.points || shape.points.length === 0) return;
        drawContext.beginPath();
        drawContext.moveTo(shape.points[0].x, shape.points[0].y);
        for (let i = 1; i < shape.points.length; i++) {
            drawContext.lineTo(shape.points[i].x, shape.points[i].y);
        }
        drawContext.stroke();
    } else if (shape.tool === 'rect') {
        if (shape.fill !== 'transparent') drawContext.fillRect(shape.x, shape.y, shape.w, shape.h);
        drawContext.strokeRect(shape.x, shape.y, shape.w, shape.h);
    } else if (shape.tool === 'circle') {
        drawContext.beginPath();
        drawContext.arc(shape.x, shape.y, shape.radius, 0, 2 * Math.PI);
        if (shape.fill !== 'transparent') drawContext.fill();
        drawContext.stroke();
    } else if (shape.tool === 'arrow') {
        drawContext.beginPath();
        drawContext.moveTo(shape.x1, shape.y1);
        drawContext.lineTo(shape.x2, shape.y2);
        drawContext.stroke();
        
        const headlen = 15; 
        const angle = Math.atan2(shape.y2 - shape.y1, shape.x2 - shape.x1);
        drawContext.beginPath();
        drawContext.moveTo(shape.x2, shape.y2);
        drawContext.lineTo(shape.x2 - headlen * Math.cos(angle - Math.PI / 6), shape.y2 - headlen * Math.sin(angle - Math.PI / 6));
        drawContext.lineTo(shape.x2 - headlen * Math.cos(angle + Math.PI / 6), shape.y2 - headlen * Math.sin(angle + Math.PI / 6));
        drawContext.lineTo(shape.x2, shape.y2);
        drawContext.fillStyle = shape.color;
        drawContext.fill();
    } else if (shape.tool === 'path') {
        if (!shape.points || shape.points.length === 0) return;
        
        drawContext.beginPath();
        drawContext.moveTo(shape.points[0].x, shape.points[0].y);
        for (let i = 1; i < shape.points.length; i++) {
            drawContext.lineTo(shape.points[i].x, shape.points[i].y);
        }
        if (shape.previewX !== undefined && shape.previewY !== undefined) {
            drawContext.lineTo(shape.previewX, shape.previewY);
        }
        drawContext.stroke();

        const drawArrowHead = (x1, y1, x2, y2) => {
            const headlen = 15; 
            const angle = Math.atan2(y2 - y1, x2 - x1);
            drawContext.beginPath();
            drawContext.moveTo(x2, y2);
            drawContext.lineTo(x2 - headlen * Math.cos(angle - Math.PI / 6), y2 - headlen * Math.sin(angle - Math.PI / 6));
            drawContext.lineTo(x2 - headlen * Math.cos(angle + Math.PI / 6), y2 - headlen * Math.sin(angle + Math.PI / 6));
            drawContext.lineTo(x2, y2);
            drawContext.fillStyle = shape.color;
            drawContext.fill();
        };

        for (let i = 0; i < shape.points.length - 1; i++) {
            drawArrowHead(shape.points[i].x, shape.points[i].y, shape.points[i+1].x, shape.points[i+1].y);
        }
        if (shape.previewX !== undefined && shape.previewY !== undefined && shape.points.length > 0) {
            const lastPt = shape.points[shape.points.length - 1];
            drawArrowHead(lastPt.x, lastPt.y, shape.previewX, shape.previewY);
        }
    } else if (shape.tool === 'text') {
        drawContext.font = "bold 20px 'Open Sans', sans-serif";
        drawContext.fillStyle = shape.color;
        drawContext.fillText(shape.text, shape.x, shape.y);
    }

    if (shape.label && shape.tool !== 'text') {
        drawContext.font = "bold 14px 'Open Sans', sans-serif";
        const bb = getBoundingBox(shape);
        const lx = Math.max(0, bb.x);
        const ly = Math.max(15, bb.y - 8);

        drawContext.lineWidth = 3;
        drawContext.strokeStyle = 'white';
        drawContext.strokeText(shape.label, lx, ly);
        
        drawContext.fillStyle = shape.color;
        drawContext.fillText(shape.label, lx, ly);
    }
}

function redrawAll() {
    const canvas = document.getElementById('draw-canvas');
    if (!canvas) return;
    drawContext.clearRect(0, 0, canvas.width, canvas.height);
    if (legacyImage) {
        drawContext.drawImage(legacyImage, 0, 0, canvas.width, canvas.height);
    }
    const objects = dbDesc.models[dbDesc.activeView].drawingObjects || [];
    objects.forEach((shape, index) => {
        drawShape(shape);
        if (isDrawingMode && drawTool === 'move' && selectedShapeIndex === index) {
            const bb = getBoundingBox(shape);
            drawContext.strokeStyle = 'rgba(0,0,0,0.5)';
            drawContext.lineWidth = 1;
            drawContext.setLineDash([5, 5]);
            drawContext.strokeRect(bb.x, bb.y, bb.w, bb.h);
            drawContext.setLineDash([]);
        }
    });
}

function attachDrawingEvents() {
    const canvas = document.getElementById('draw-canvas');
    if (!canvas) return;
    
    const getPos = (e) => {
        const rect = canvas.getBoundingClientRect();
        if (e.touches && e.touches.length > 0) {
            return { x: e.touches[0].clientX - rect.left, y: e.touches[0].clientY - rect.top };
        }
        return { x: e.clientX - rect.left, y: e.clientY - rect.top };
    };

    const startDraw = (e) => {
        if (!isDrawingMode || isEditingText) return;
        isDrawing = true;
        const pos = getPos(e);
        lastX = pos.x;
        lastY = pos.y;
        
         if (drawTool === 'move') {
            const objects = dbDesc.models[dbDesc.activeView].drawingObjects || [];
            selectedShapeIndex = -1;
            for (let i = objects.length - 1; i >= 0; i--) {
                if (hitTest(pos.x, pos.y, objects[i])) {
                    selectedShapeIndex = i;
                    break;
                }
            }
            redrawAll();
            if (selectedShapeIndex !== -1) {
                isDrawing = true;
                dragStartX = pos.x;
                dragStartY = pos.y;
            }
            return;
        }

        if (drawTool === 'path') {
            if (!isDrawingPath) {
                isDrawingPath = true;
                pathPoints = [{x: pos.x, y: pos.y}];
                currentShape = { tool: 'path', type: drawType, color: drawColor, points: [...pathPoints] };
            } else {
                pathPoints.push({x: pos.x, y: pos.y});
                currentShape.points = [...pathPoints];
            }
            redrawAll();
            drawShape({...currentShape, previewX: pos.x, previewY: pos.y});
            return;
        }

        isDrawing = true;

        if (drawTool === 'text') {
            openInlineEditor(pos.x, pos.y, '', (newText) => {
                if (newText) {
                    if (!dbDesc.models[dbDesc.activeView].drawingObjects) dbDesc.models[dbDesc.activeView].drawingObjects = [];
                    dbDesc.models[dbDesc.activeView].drawingObjects.push({ tool: 'text', color: drawColor, text: newText, x: pos.x, y: pos.y + 7 });
                    redrawAll();
                    saveDrawing();
                }
            });
            isDrawing = false;
        } else if (drawTool === 'pen') {
            currentShape = { tool: 'pen', type: drawType, color: drawColor, points: [{x: pos.x, y: pos.y}] };
        } else if (drawTool === 'rect') {
            currentShape = { tool: 'rect', type: drawType, color: drawColor, fill: 'transparent', x: pos.x, y: pos.y, w: 0, h: 0 };
        } else if (drawTool === 'circle') {
            currentShape = { tool: 'circle', type: drawType, color: drawColor, fill: 'transparent', x: pos.x, y: pos.y, radius: 0 };
        } else if (drawTool === 'arrow') {
            currentShape = { tool: 'arrow', type: drawType, color: drawColor, x1: pos.x, y1: pos.y, x2: pos.x, y2: pos.y };
        }
    };

    const draw = (e) => {
        if (!isDrawing || !isDrawingMode) return;
        if (e.cancelable && e.type !== 'mousemove') e.preventDefault(); 
        const pos = getPos(e);

        if (drawTool === 'move') {
            if (selectedShapeIndex !== -1) {
                const dx = pos.x - dragStartX;
                const dy = pos.y - dragStartY;
                moveShape(dbDesc.models[dbDesc.activeView].drawingObjects[selectedShapeIndex], dx, dy);
                dragStartX = pos.x;
                dragStartY = pos.y;
                redrawAll();
            }
            return;
        }

        if (drawTool === 'path') {
            if (isDrawingPath && currentShape) {
                redrawAll();
                drawShape({...currentShape, previewX: pos.x, previewY: pos.y});
            }
            return;
        }

        if (drawTool === 'pen') {
            currentShape.points.push({x: pos.x, y: pos.y});
        } else if (drawTool === 'rect') {
            currentShape.w = pos.x - lastX;
            currentShape.h = pos.y - lastY;
        } else if (drawTool === 'circle') {
            currentShape.radius = Math.sqrt(Math.pow(pos.x - lastX, 2) + Math.pow(pos.y - lastY, 2));
        } else if (drawTool === 'arrow') {
            currentShape.x2 = pos.x;
            currentShape.y2 = pos.y;
        }

        redrawAll();
        if (currentShape) drawShape(currentShape);
    };

    const endDraw = () => {
        if (drawTool === 'path') return; // Percurso termina no Esc ou Clicando Direito

        if (isDrawing && !isEditingText) {
            isDrawing = false;
            if (drawTool === 'move') {
                saveDrawing();
                return;
            }
            if (currentShape) {
                if (!dbDesc.models[dbDesc.activeView].drawingObjects) {
                    dbDesc.models[dbDesc.activeView].drawingObjects = [];
                }
                
                const shapeToSave = currentShape;
                dbDesc.models[dbDesc.activeView].drawingObjects.push(shapeToSave);
                currentShape = null;
                redrawAll();
                saveDrawing();

                if (shapeToSave.tool !== 'text') {
                    const bb = getBoundingBox(shapeToSave);
                    const lx = Math.max(10, bb.x + (bb.w / 2) - 50);
                    const ly = Math.max(10, bb.y + bb.h + 10);
                    openInlineEditor(lx, ly, '', (newLabel) => {
                        if (newLabel && newLabel !== '') {
                            shapeToSave.label = newLabel;
                            redrawAll();
                            saveDrawing();
                        }
                    });
                }
            }
        }
    };

    canvas.addEventListener('mousedown', startDraw);
    canvas.addEventListener('mousemove', draw);
    canvas.addEventListener('mouseup', endDraw);
    canvas.addEventListener('mouseout', endDraw);
    
    canvas.addEventListener('contextmenu', (e) => {
        if (isDrawingMode && drawTool === 'path' && isDrawingPath) {
            e.preventDefault();
            finishPath();
        }
    });

    canvas.addEventListener('touchstart', startDraw, { passive: false });
    canvas.addEventListener('touchmove', draw, { passive: false });
    canvas.addEventListener('touchend', endDraw);
    
    window.addEventListener('resize', () => {
        if (dbDesc.models[dbDesc.activeView].image) {
            setupCanvas();
        }
    });
}

function setupCanvas() {
    const canvas = document.getElementById('draw-canvas');
    const wrapper = document.getElementById('img-wrapper');
    
    if (!wrapper || wrapper.clientWidth === 0) return;
    
    canvas.width = wrapper.clientWidth;
    canvas.height = wrapper.clientHeight;

    drawContext = canvas.getContext('2d');
    drawContext.lineCap = 'round';
    drawContext.lineJoin = 'round';
    drawContext.lineWidth = 4;
    
    const legacySrc = dbDesc.models[dbDesc.activeView].legacyDrawing;
    if (legacySrc) {
        legacyImage = new Image();
        legacyImage.onload = () => {
            redrawAll();
        };
        legacyImage.src = legacySrc;
    } else {
        legacyImage = null;
        redrawAll();
    }
}

function toggleDrawingMode() {
    isDrawingMode = !isDrawingMode;
    const canvas = document.getElementById('draw-canvas');
    const toolbar = document.getElementById('draw-toolbar');
    const btnDraw = document.getElementById('btn-draw');

    if (isDrawingMode) {
        canvas.style.pointerEvents = 'auto';
        canvas.style.cursor = 'crosshair';
        toolbar.style.display = 'flex';
        btnDraw.style.display = 'none';
        setupCanvas();
    } else {
        canvas.style.pointerEvents = 'none';
        canvas.style.cursor = 'default';
        toolbar.style.display = 'none';
        btnDraw.style.display = 'inline-block';
    }
}

function clearDrawings() {
    if (confirm("Tem certeza que deseja apagar todas as marcações?")) {
        dbDesc.models[dbDesc.activeView].drawingObjects = [];
        dbDesc.models[dbDesc.activeView].drawings = '';
        dbDesc.models[dbDesc.activeView].legacyDrawing = '';
        legacyImage = null;
        redrawAll();
        saveDrawing();
    }
}

function saveDrawing() {
    const canvas = document.getElementById('draw-canvas');
    dbDesc.models[dbDesc.activeView].drawings = canvas.toDataURL('image/png');
    saveDesc();
    checkDiagramAlerts();
}

function setDrawTool(tool, btn) {
    if (drawTool === 'path' && isDrawingPath && tool !== 'path') {
        finishPath();
    }

    drawTool = tool;
    if (tool !== 'move') {
        selectedShapeIndex = -1;
        redrawAll();
    }
    document.querySelectorAll('#draw-toolbar .active-tool').forEach(b => {
        b.classList.remove('active-tool');
        b.style.border = '';
    });
    if(btn) {
        btn.classList.add('active-tool');
        btn.style.border = '2px solid #0f172a';
    }

    if (tool === 'path') {
        showToast("Clique para adicionar pontos ao percurso. Pressione 'Esc' ou 'Botão Direito' para finalizar.", "info");
    }
}

function setDrawType(type, color, btn) {
    drawType = type;
    drawColor = color;
    document.querySelectorAll('#draw-toolbar .color-btn').forEach(b => {
        b.classList.remove('active-color');
        b.style.border = '';
    });
    if(btn) {
        btn.classList.add('active-color');
        btn.style.border = '2px solid #0f172a';
    }
    if (drawTool === 'move' && selectedShapeIndex !== -1) {
        const shape = dbDesc.models[dbDesc.activeView].drawingObjects[selectedShapeIndex];
        shape.color = color;
        shape.type = type;
        redrawAll();
        saveDrawing();
    }
}
