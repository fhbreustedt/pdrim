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
let expandedPopActivities = {};

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
        expandedPopActivities = {};
        saveDesc();
        switchImgView('as-is');
        showToast("Artefato zerado com sucesso!", "success");
    }
}

function printPage() {
    renderPrintPOPs();
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
    renderActivityList();
    renderRiskList();
    renderMatrix();
    renderHeatmap();
    renderPop();
}

function addActivity() {
    const inp = document.getElementById('new-activity-desc');
    if (!inp.value.trim()) return;
    
    const newAct = {
        id: 'act_' + Date.now(),
        name: inp.value.trim(),
        riskAssocs: [],
        noRisk: false,
        steps: []
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
    const btnLinkAllActs = document.getElementById('btn-link-all-acts');
    const addWrapper = document.getElementById('activity-add-wrapper');
    const linkWrapper = document.getElementById('activity-link-wrapper');
    const acts = dbDesc.models[dbDesc.activeView].activities;
    const allRisks = dbDesc.models[dbDesc.activeView].risks;
    let html = '';

    if (selectedRiskId) {
        title.innerText = 'Atividades do Risco Selecionado';
        btnBack.style.display = 'inline-block';
        if (btnLinkAllActs) btnLinkAllActs.style.display = 'inline-block';
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
        if (btnLinkAllActs) btnLinkAllActs.style.display = 'none';
        addWrapper.style.display = 'flex';
        linkWrapper.style.display = 'none';
        
        if (acts.length === 0) {
            list.innerHTML = '<span class="empty-msg">Nenhuma atividade cadastrada nesta aba.</span>';
            return;
        }
        
        acts.forEach(a => {
            const isSel = a.id === selectedActivityId;
            const bg = isSel ? 'var(--dark-accent)' : '#f8fafc';
            const col = isSel ? '#fff' : '#475569';
            
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
            
            html += `<div class="mini-card hover-trigger" style="background:${bg}; color:${col}; cursor:pointer; align-items:center;" onclick="selectActivity('${a.id}')">
                <div style="flex:1; display:flex; align-items:center;">
                    ${riskIcon}
                    <b style="font-size:0.75rem; display:block; word-break:break-word; flex:1;">${a.name}</b>
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
    
    const allRisks = dbDesc.models[dbDesc.activeView].risks;
    
    if (!selectedActivityId) {
        // Modo Banco de Riscos
        actContainer.style.display = 'none';
        bankContainer.style.display = 'block';
        title.innerText = 'Riscos do Processo';
        btnBack.style.display = 'none';
        if (btnLinkAllRisks) btnLinkAllRisks.style.display = 'none';
        
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
    
    chkNoRisk.checked = act.noRisk || false;
    
    if (act.noRisk) {
        addWrapper.style.display = 'none';
        if (btnLinkAllRisks) btnLinkAllRisks.style.display = 'none';
        list.innerHTML = '<span class="empty-msg" style="background: #f0fdf4; border-color: #bbf7d0; color: #166534;">✅ Atividade marcada como sem riscos.</span>';
        return;
    }
    
    if (btnLinkAllRisks) btnLinkAllRisks.style.display = 'inline-block';
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
    saveDesc();
    renderPop();
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
