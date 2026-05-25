let dbDesc = {
    activeView: 'as-is',
    models: {
        'as-is': { image: '', activities: [], risks: [] },
        'to-be': { image: '', activities: [], risks: [] },
        'compare': { image: '', activities: [], risks: [] }
    }
};
let selectedActivityId = null;
let selectedRiskId = null;

document.addEventListener('DOMContentLoaded', () => {
    initDescobrirUI();
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
                        });
                    }
                    parsed.models[k].risks.forEach(r => {
                        delete r.prob;
                        delete r.imp;
                    });
                });
            }


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

    const model = dbDesc.models[view];
    const imgEmpty = document.getElementById('img-overlay-empty');
    const imgDisplay = document.getElementById('img-display');
    const btnRemove = document.getElementById('btn-remove-img');

    if (model.image) {
        imgEmpty.style.display = 'none';
        imgDisplay.src = model.image;
        imgDisplay.style.display = 'block';
        btnRemove.style.display = 'inline-block';
    } else {
        imgEmpty.style.display = 'block';
        imgDisplay.src = '';
        imgDisplay.style.display = 'none';
        btnRemove.style.display = 'none';
    }

    selectedActivityId = null;
    selectedRiskId = null;
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
        saveDesc();
        switchImgView(dbDesc.activeView);
        showToast("Imagem removida com sucesso!", "success");
    }
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
                'as-is': { image: '', activities: [], risks: [] },
                'to-be': { image: '', activities: [], risks: [] },
                'compare': { image: '', activities: [], risks: [] }
            }
        };
        selectedActivityId = null;
        selectedRiskId = null;
        saveDesc();
        switchImgView('as-is');
        showToast("Artefato zerado com sucesso!", "success");
    }
}

function printPage() {
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
    selectedActivityId = id;
    if (id !== null) selectedRiskId = null;
    renderAll();
}

function selectRisk(id) {
    selectedRiskId = id;
    if (id !== null) selectedActivityId = null;
    renderAll();
}

function renderAll() {
    renderActivityList();
    renderRiskList();
    renderMatrix();
    renderHeatmap();
}

function addActivity() {
    const inp = document.getElementById('new-activity-desc');
    if (!inp.value.trim()) return;
    
    const newAct = {
        id: 'act_' + Date.now(),
        name: inp.value.trim(),
        riskAssocs: [],
        noRisk: false
    };
    
    dbDesc.models[dbDesc.activeView].activities.push(newAct);
    inp.value = '';
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
    const addWrapper = document.getElementById('activity-add-wrapper');
    const acts = dbDesc.models[dbDesc.activeView].activities;
    const allRisks = dbDesc.models[dbDesc.activeView].risks;
    let html = '';

    if (selectedRiskId) {
        title.innerText = 'Atividades do Risco Selecionado';
        btnBack.style.display = 'inline-block';
        addWrapper.style.display = 'none';
        
        const filteredActs = acts.filter(a => !a.noRisk && a.riskAssocs && a.riskAssocs.find(ra => ra.riskId === selectedRiskId));
        
        if (filteredActs.length === 0) {
            list.innerHTML = '<span class="empty-msg">Nenhuma atividade vinculada a este risco.</span>';
            return;
        }
        
        filteredActs.forEach(a => {
            const bg = '#f8fafc';
            const col = '#475569';
            
            let riskIcon = '';
            if (a.riskAssocs && a.riskAssocs.length > 0) {
                const riskNames = a.riskAssocs.map(ra => {
                    const r = allRisks.find(x => x.id === ra.riskId);
                    return r ? r.desc : '';
                }).filter(Boolean).join('\n- ');
                riskIcon = `<span title="Riscos Associados:\n- ${riskNames}" style="font-size:0.8rem; margin-right:6px; cursor:help;">⚠️</span>`;
            }
            
            html += `<div class="mini-card hover-trigger" style="background:${bg}; color:${col}; cursor:pointer; align-items:center;" onclick="selectActivity('${a.id}')">
                <div style="flex:1; display:flex; align-items:center;">
                    ${riskIcon}
                    <b style="font-size:0.75rem; display:block; word-break:break-word; flex:1;">${a.name}</b>
                </div>
                <div class="no-print hover-target" style="top:50%; transform:translateY(-50%); right:4px; align-items:center;">
                    <span style="cursor:pointer; color:#ef4444; font-size:1.1rem; line-height:1;" onclick="event.stopPropagation(); removeRisk('${a.id}', '${selectedRiskId}')" title="Desvincular">✕</span>
                </div>
            </div>`;
        });
    } else {
        title.innerText = 'Atividades do Modelo';
        btnBack.style.display = 'none';
        addWrapper.style.display = 'flex';
        
        if (acts.length === 0) {
            list.innerHTML = '<span class="empty-msg">Nenhuma atividade cadastrada nesta aba.</span>';
            return;
        }
        
        acts.forEach(a => {
            const isSel = a.id === selectedActivityId;
            const bg = isSel ? 'var(--dark-accent)' : '#f8fafc';
            const col = isSel ? '#fff' : '#475569';
            
            let riskIcon = '';
            if (a.riskAssocs && a.riskAssocs.length > 0) {
                const riskNames = a.riskAssocs.map(ra => {
                    const r = allRisks.find(x => x.id === ra.riskId);
                    return r ? r.desc : '';
                }).filter(Boolean).join('\n- ');
                riskIcon = `<span title="Riscos Associados:\n- ${riskNames}" style="font-size:0.8rem; margin-right:6px; cursor:help;">⚠️</span>`;
            } else if (a.noRisk) {
                riskIcon = `<span title="Atividade marcada como sem riscos" style="font-size:0.8rem; margin-right:6px; cursor:help;">✅</span>`;
            }
            
            html += `<div class="mini-card hover-trigger" style="background:${bg}; color:${col}; cursor:pointer; align-items:center;" onclick="selectActivity('${a.id}')">
                <div style="flex:1; display:flex; align-items:center;">
                    ${riskIcon}
                    <b style="font-size:0.75rem; display:block; word-break:break-word; flex:1;">${a.name}</b>
                </div>
                <div class="no-print hover-target" style="top:50%; transform:translateY(-50%); right:4px; align-items:center;">
                    <span style="cursor:pointer; color:#0284c7; font-size:1.1rem; line-height:1; margin-right:4px;" onclick="event.stopPropagation(); selectActivity('${a.id}')" title="Vincular Risco">🔗</span>
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
    const list = document.getElementById('risk-list');
    const addWrapper = document.getElementById('risk-add-wrapper');
    const chkNoRisk = document.getElementById('chk-no-risk');
    
    const allRisks = dbDesc.models[dbDesc.activeView].risks;
    
    if (!selectedActivityId) {
        // Modo Banco de Riscos
        actContainer.style.display = 'none';
        bankContainer.style.display = 'block';
        title.innerText = 'Riscos do Processo';
        btnBack.style.display = 'none';
        
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
                    actIcon = `<span title="Atividades Vinculadas:\n- ${actNames}" style="font-size:0.8rem; margin-right:6px; cursor:help;">🔗</span>`;
                }
                
                let actOpts = '<option value="">-- Vincular a Atividade --</option>';
                availableActs.forEach(a => actOpts += `<option value="${a.id}">${a.name}</option>`);
                
                let linkedHtml = linkedActs.map(a => `<span class="cat-badge" style="background:#f1f5f9; color:#475569; margin-top:4px; display:inline-flex; align-items:center; gap:4px; padding: 2px 6px;">${a.name} <b class="no-print" style="cursor:pointer; color:#ef4444; font-size: 0.8rem; line-height:1;" onclick="removeRisk('${a.id}', '${r.id}')" title="Desvincular">✕</b></span>`).join(' ');
                
                html += `<div class="mini-card hover-trigger" style="display:flex; flex-direction:column; gap:8px; background:${bg}; color:${col};">
                    <div style="display:flex; justify-content:space-between; align-items:center; min-height:24px; cursor:pointer;" onclick="selectRisk('${r.id}')">
                        <div style="flex:1; display:flex; align-items:center;">
                            ${actIcon}
                            <span style="font-size:0.75rem; font-weight:600; line-height:1.2; flex:1; word-break:break-word;">⚠️ ${r.desc}</span>
                        </div>
                        <div class="no-print hover-target" style="top:4px; right:4px; align-items:center;">
                            <span style="cursor:pointer; color:#0284c7; font-size:1.1rem; line-height:1; margin-right:4px;" onclick="event.stopPropagation(); document.getElementById('link-box-${r.id}').style.display='block'" title="Vincular Atividade">🔗</span>
                            <span style="cursor:pointer; color:#ef4444; font-size:1.1rem; line-height:1;" onclick="event.stopPropagation(); removeGlobalRisk('${r.id}')" title="Excluir">✕</span>
                        </div>
                    </div>
                    
                    <div class="no-print" id="link-box-${r.id}" style="display:none; margin-top:4px; border-top:1px dashed #e2e8f0; padding-top:8px;">
                        <div style="display:flex; gap:6px; align-items:center;" onclick="event.stopPropagation();">
                            <select id="sel-act-${r.id}" class="status-select-inline" style="flex:1; font-size:0.7rem; padding:4px;">${actOpts}</select>
                            <button class="btn-main btn-secondary" style="padding:4px 8px; font-size:0.7rem;" onclick="linkActToRisk('${r.id}')">Vincular</button>
                        </div>
                        ${linkedHtml ? `<div style="display:flex; flex-wrap:wrap; gap:4px; padding-top:8px;" onclick="event.stopPropagation();">${linkedHtml}</div>` : ''}
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
    
    chkNoRisk.checked = act.noRisk || false;
    
    if (act.noRisk) {
        addWrapper.style.display = 'none';
        list.innerHTML = '<span class="empty-msg" style="background: #f0fdf4; border-color: #bbf7d0; color: #166534;">✅ Atividade marcada como sem riscos.</span>';
        return;
    }
    
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
                <span style="font-size:0.75rem; font-weight:600; line-height: 1.2; max-width: 80%;">⚠️ ${r.desc}</span>
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

function linkActToRisk(rId) {
    const sel = document.getElementById(`sel-act-${rId}`);
    const actId = sel.value;
    if (!actId) return;
    
    const act = dbDesc.models[dbDesc.activeView].activities.find(a => a.id === actId);
    if (act && !act.riskAssocs.find(ra => ra.riskId === rId)) {
        act.riskAssocs.push({ riskId: rId, prob: 1, imp: 1 });
        saveDesc();
        renderAll();
    }
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

function renderMatrix() {
    const tbody = document.getElementById('matrix-body');
    let html = '';
    let hasItems = false;
    
    const allRisks = dbDesc.models[dbDesc.activeView].risks;
    
    dbDesc.models[dbDesc.activeView].activities.forEach(act => {
        if (act.noRisk) {
            hasItems = true;
            html += `<tr>
                <td style="font-size:0.75rem; font-weight:700; color:#475569; max-width: 150px; overflow-wrap: break-word;">${act.name}</td>
                <td colspan="4" style="font-size:0.75rem; color:#16a34a; font-style:italic; text-align:center;">Atividade não possui risco associado</td>
            </tr>`;
        } else if (act.riskAssocs && act.riskAssocs.length > 0) {
            act.riskAssocs.forEach((ra) => {
                const r = allRisks.find(x => x.id === ra.riskId);
                if (r) {
                    hasItems = true;
                    const lvl = getRiskLevelInfo(ra.prob, ra.imp);
                    html += `<tr>
                        <td style="font-size:0.75rem; font-weight:700; color:#475569; max-width: 150px; overflow-wrap: break-word;">${act.name}</td>
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
                            <span class="cat-badge" style="background:${lvl.bg}; color:${lvl.col}; border-color:${lvl.col};">${lvl.lbl} (${ra.prob * ra.imp})</span>
                        </td>
                    </tr>`;
                }
            });
        }
    });

    if (!hasItems) {
        html = `<tr><td colspan="5" class="empty-state" style="text-align:center">Nenhuma atividade cadastrada neste modelo.</td></tr>`;
    }
    
    tbody.innerHTML = html;
}

function renderHeatmap() {
    const hm = document.getElementById('heatmap-container');
    const counts = { '3-1':0, '3-2':0, '3-3':0, '2-1':0, '2-2':0, '2-3':0, '1-1':0, '1-2':0, '1-3':0 };
    
    dbDesc.models[dbDesc.activeView].activities.forEach(act => {
        if (!act.noRisk && act.riskAssocs) {
            act.riskAssocs.forEach(ra => {
                counts[`${ra.prob}-${ra.imp}`]++;
            });
        }
    });

    const makeCell = (p, i, bg) => {
        const val = counts[`${p}-${i}`];
        const text = val > 0 ? `<b style="font-size:1.5rem; color:#fff; text-shadow: 0 1px 2px rgba(0,0,0,0.5);">${val}</b>` : '';
        return `<div style="background:${bg}; display:flex; align-items:center; justify-content:center; border-radius:2px;">${text}</div>`;
    };

    // Construindo o grid (linha a linha, Prob de 3 até 1, e Impacto de 1 até 3)
    hm.innerHTML = `
        ${makeCell(3, 1, '#facc15')} ${makeCell(3, 2, '#ef4444')} ${makeCell(3, 3, '#b91c1c')}
        ${makeCell(2, 1, '#4ade80')} ${makeCell(2, 2, '#facc15')} ${makeCell(2, 3, '#ef4444')}
        ${makeCell(1, 1, '#22c55e')} ${makeCell(1, 2, '#4ade80')} ${makeCell(1, 3, '#facc15')}
    `;
}

function saveDesc() {
    try {
        localStorage.setItem('pdrim_desc_v10_9', JSON.stringify(dbDesc));
        updateBreadcrumbs();
    } catch (e) {
        showToast("Erro ao salvar: Limite de armazenamento atingido.", "error");
    }
}
