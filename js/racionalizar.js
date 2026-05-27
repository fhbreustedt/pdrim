// Editor Quill Completo
const quill = new Quill('#editor-container', {
    theme: 'snow',
    modules: { toolbar: [
        [{ 'header': [1, 2, 3, 4, 5, 6, false] }, { 'font': [] }],
        ['bold', 'italic', 'underline', 'strike'],
        [{ 'color': [] }, { 'background': [] }],
        [{ 'script': 'sub'}, { 'script': 'super' }],
        [{ 'list': 'ordered'}, { 'list': 'bullet' }],
        [{ 'indent': '-1'}, { 'indent': '+1' }, { 'align': [] }],
        ['link', 'image', 'video', 'formula', 'clean']
    ]}
});
const quillResources = new Quill('#resources-editor-container', {
    theme: 'snow',
    modules: { toolbar: [
        ['bold', 'italic', 'underline'],
        [{ 'list': 'ordered'}, { 'list': 'bullet' }],
        ['link', 'clean']
    ]}
});

const categories = { 'Capacitação': 'var(--color-capacitacao)', 'Gestão da Mudança': 'var(--color-mudanca)', 'Tecnologia': 'var(--color-tecnologia)', 'Implantação': 'var(--color-implantacao)', 'Definição de Riscos': 'var(--color-riscos)', 'Tratamento de Riscos': 'var(--color-riscos)', 'Metas e Indicadores': 'var(--color-metas)' };

let flatActions = [];
let currentView = 'cards';
let currentSortCol = 'start';
let currentSortDir = 'asc';
let selectedForDeletion = [];

let sourceModelDesc = null; 
let sourceDataDesc = null;

function detectSourceModel() {
    try {
        const descDataStr = localStorage.getItem('pdrim_desc_v10_9');
        if (descDataStr) {
            const descData = JSON.parse(descDataStr);
            if (descData && descData.models) {
                const tobe = descData.models['to-be'];
                const asis = descData.models['as-is'];
                const basePref = descData.baseModel || 'auto';

                if (basePref === 'to-be') {
                    sourceModelDesc = 'to-be';
                    sourceDataDesc = tobe;
                } else if (basePref === 'as-is') {
                    sourceModelDesc = 'as-is';
                    sourceDataDesc = asis;
                } else {
                    if (tobe && (tobe.risks.length > 0 || tobe.activities.length > 0)) {
                        sourceModelDesc = 'to-be';
                        sourceDataDesc = tobe;
                    } else if (asis && (asis.risks.length > 0 || asis.activities.length > 0)) {
                        sourceModelDesc = 'as-is';
                        sourceDataDesc = asis;
                    }
                }
            }
        }
    } catch (e) {
        console.error(e);
    }
}

function initUI() {
    detectSourceModel();
    updateSourceModelIndicator();

    if(localStorage.getItem('pdrim_rac_v10_9')) {
        try {
            flatActions = JSON.parse(localStorage.getItem('pdrim_rac_v10_9'));
            if (!Array.isArray(flatActions)) flatActions = [];
        } catch(e) {}
    }

    const filter = document.getElementById('filter');
    const catSelect = document.getElementById('cat');
    if (catSelect) {
        catSelect.addEventListener('change', handleCategoryChange);
    }

    Object.keys(categories).forEach(c => {
        const opt = document.createElement('option'); opt.value = c; opt.innerText = c; filter.appendChild(opt);
    });
    
    const dropdownContent = document.querySelector('.dropdown-content');
    if (dropdownContent && !document.getElementById('btn-zerar-rac')) {
        dropdownContent.insertAdjacentHTML('beforeend', `<a href="#" id="btn-zerar-rac" onclick="zerarArtefato(); return false;" style="color: var(--danger);">Zerar Artefato</a>`);
    }
    
    const formTitle = document.getElementById('formTitle');
    if (formTitle && !document.getElementById('btn-cancel-formTitle')) {
        const wrapper = document.createElement('div');
        wrapper.style.display = 'flex';
        wrapper.style.justifyContent = 'space-between';
        wrapper.style.alignItems = 'center';
        wrapper.style.marginBottom = '15px';
        formTitle.parentNode.insertBefore(wrapper, formTitle);
        formTitle.style.marginTop = '0';
        formTitle.style.marginBottom = '0';
        wrapper.appendChild(formTitle);

        const cancelBtn = document.createElement('button');
        cancelBtn.id = 'btn-cancel-formTitle';
        cancelBtn.className = 'btn-edit-action btn-cancel-section';
        cancelBtn.innerText = 'Cancelar';
        cancelBtn.style.backgroundColor = '#fee2e2';
        cancelBtn.style.color = '#991b1b';
        cancelBtn.type = 'button';
        cancelBtn.onclick = resetForm;
        wrapper.appendChild(cancelBtn);
    }
    updateBreadcrumbs();
    updateHeaderInitiative();
}

function updateSourceModelIndicator() {
    let indicator = document.getElementById('source-model-indicator');
    if (!indicator) {
        const headerControls = document.querySelector('.header-controls');
        if (headerControls) {
            indicator = document.createElement('div');
            indicator.id = 'source-model-indicator';
            indicator.style.fontSize = '0.75rem';
            indicator.style.fontWeight = 'bold';
            indicator.style.color = '#64748b';
            indicator.style.padding = '6px 12px';
            indicator.style.backgroundColor = '#f8fafc';
            indicator.style.borderRadius = '4px';
            indicator.style.border = '1px solid var(--border-color)';
            indicator.style.display = 'flex';
            indicator.style.alignItems = 'center';
            indicator.style.gap = '6px';
            headerControls.insertBefore(indicator, headerControls.firstChild);
        }
    }
    if (indicator) {
        if (sourceModelDesc) {
            indicator.innerHTML = `🔗 <span>Ações baseadas no modelo: <b style="color:var(--dark-accent)">${sourceModelDesc.toUpperCase()}</b></span>`;
            indicator.style.display = 'flex';
        } else {
            indicator.style.display = 'none';
        }
    }
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
    
    toast.offsetHeight; // Força uma reflow para a animação disparar
    toast.classList.add('show');
    
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}

let timelineExpandedAll = false;
function toggleAllCardsTimeline() {
    timelineExpandedAll = !timelineExpandedAll;
    const btn = document.getElementById('btn-toggle-all-timeline');
    if (btn) btn.innerText = timelineExpandedAll ? "Recolher Todos" : "Expandir Todos";
    
    document.querySelectorAll('.timeline-card').forEach(card => {
        const idx = card.id.split('-')[1];
        if (idx !== undefined) toggleCardExpansion(idx, timelineExpandedAll);
    });
}

function toggleCardExpansion(index, expand) {
    const cardView = document.getElementById(`card-${index}`);
    const textView = document.getElementById(`text-view-${index}`);

    if (expand) {
        cardView.style.display = 'block';
        textView.style.display = 'none';
    } else {
        cardView.style.display = 'none';
        textView.style.display = 'flex';
    }
}

function showStatusSelectInTimeline(id, currentStatus, element) {
    currentStatus = currentStatus.toLowerCase();
    const sel = document.createElement('select');
    sel.className = 'status-select-inline';
    ['pendente', 'andamento', 'realizado'].forEach(o => { const op = document.createElement('option'); op.value = o; op.text = o.toUpperCase(); if (o === currentStatus) op.selected = true; sel.add(op); });
    sel.onchange = () => { flatActions.forEach(a => { if (a.id == id) a.status = sel.value; }); save(); render(); };
    sel.onblur = () => render();
    element.parentElement.insertBefore(sel, element);
    element.style.display = 'none'; 
    setTimeout(() => sel.focus(), 10);
}

function getIndicatorFieldHtml(data = {}) {
    const id = `ind_${Date.now()}_${Math.random()}`;
    return `
        <div class="indicator-entry" style="background: #fff; padding: 10px; border-radius: 4px; border: 1px solid #e9d5ff;">
            <div style="display: grid; grid-template-columns: 2fr 1fr 1fr 1fr 1fr auto; gap: 12px; align-items: flex-end;">
                <div>
                    <label for="indName_${id}">Nome do Indicador</label>
                    <input type="text" class="indName" id="indName_${id}" placeholder="Ex: Número de incidentes..." value="${data.name || ''}">
                </div>
                <div>
                    <label for="indMeta_${id}">Meta</label>
                    <input type="number" class="indMeta" id="indMeta_${id}" step="any" placeholder="Ex: 1" value="${data.meta || ''}">
                </div>
                <div>
                    <label for="indUnit_${id}">Unidade</label>
                    <input type="text" class="indUnit" id="indUnit_${id}" placeholder="Ex: %" value="${data.unit || ''}">
                </div>
                <div>
                    <label for="indMin_${id}">Mínimo</label>
                    <input type="number" class="indMin" id="indMin_${id}" step="any" placeholder="Ex: 0" value="${data.min || ''}">
                </div>
                <div>
                    <label for="indMax_${id}">Máximo</label>
                    <input type="number" class="indMax" id="indMax_${id}" step="any" placeholder="Ex: 3" value="${data.max || ''}">
                </div>
                <button type="button" class="btn-main btn-danger" style="padding: 8px 10px; font-size: 0.7rem;" onclick="this.parentElement.parentElement.remove()">✕</button>
            </div>
        </div>
    `;
}

function addIndicatorField(data = {}) {
    const list = document.getElementById('indicator-list');
    if (list) {
        list.insertAdjacentHTML('beforeend', getIndicatorFieldHtml(data));
    }
}

function handleCategoryChange() {
    const cat = document.getElementById('cat').value;
    let container = document.getElementById('link-container');
    const indicatorFields = document.getElementById('indicator-fields');
    
    if (!container) {
        const formRow1 = document.querySelector('.form-row-1');
        if (formRow1) {
            container = document.createElement('div');
            container.id = 'link-container';
            container.style.display = 'none';
            formRow1.insertAdjacentElement('afterend', container);
        }
    }
    
    if (indicatorFields) {
        if (cat === 'Metas e Indicadores') {
            indicatorFields.style.display = 'flex';
            const list = document.getElementById('indicator-list');
            if (list && list.children.length === 0) {
                addIndicatorField();
            }
        } else {
            indicatorFields.style.display = 'none';
        }
    }

    if (!container || !sourceDataDesc) return;

    if (cat === 'Tratamento de Riscos') {
        let opts = '<option value="">-- Ação Global (Sem Vínculo) --</option>';
        sourceDataDesc.risks.forEach(r => {
            opts += `<option value="risk_${r.id}">Risco: ${r.desc}</option>`;
        });
        container.innerHTML = `
            <div style="margin-bottom: 15px;">
                <label style="font-size: 0.65rem; font-weight: 700; color: #64748b; text-transform: uppercase; margin-bottom: 4px; display: block;">Vincular a Risco (${sourceModelDesc.toUpperCase()})</label>
                <select id="linked-item" style="padding: 10px; border: 1px solid var(--border-color); border-radius: 4px; font-size: 0.85rem; width: 100%;">${opts}</select>
            </div>
        `;
        container.style.display = 'block';
    } else if (cat === 'Metas e Indicadores') {
        let opts = '<option value="">-- Indicador Global (Sem Vínculo) --</option>';
        if (sourceDataDesc.activities.length > 0) {
            opts += '<optgroup label="Atividades">';
            sourceDataDesc.activities.forEach(a => {
                opts += `<option value="act_${a.id}">Atividade: ${a.name}</option>`;
            });
            opts += '</optgroup>';
        }
        if (sourceDataDesc.risks.length > 0) {
            opts += '<optgroup label="Riscos">';
            sourceDataDesc.risks.forEach(r => {
                opts += `<option value="risk_${r.id}">Risco: ${r.desc}</option>`;
            });
            opts += '</optgroup>';
        }
        container.innerHTML = `
            <div style="margin-bottom: 15px;">
                <label style="font-size: 0.65rem; font-weight: 700; color: #64748b; text-transform: uppercase; margin-bottom: 4px; display: block;">Vincular a Atividade/Risco (${sourceModelDesc.toUpperCase()})</label>
                <select id="linked-item" style="padding: 10px; border: 1px solid var(--border-color); border-radius: 4px; font-size: 0.85rem; width: 100%;">${opts}</select>
            </div>
        `;
        container.style.display = 'block';
    } else {
        container.style.display = 'none';
        container.innerHTML = '';
    }
}

function openNewForm() { resetForm(); document.getElementById('formTitle').innerText = 'Nova Ação'; document.getElementById('formContainer').style.display = 'block'; window.scrollTo(0,0); handleCategoryChange(); }
function resetForm() { document.getElementById('formContainer').style.display = 'none'; document.getElementById('pdrimForm').reset(); document.getElementById('editId').value = ''; quill.setContents([]); quillResources.setContents([]); const indicatorList = document.getElementById('indicator-list'); if (indicatorList) indicatorList.innerHTML = ''; handleCategoryChange(); render(); }

function openNewFormWithCategory(cat) {
    openNewForm();
    document.getElementById('cat').value = cat;
    handleCategoryChange();
}

function editAction(id) {
    const action = flatActions.find(a => a.id == id);
    if (!action) return;

    const startAction = flatActions.find(a => a.id === id && (a.label === 'Início' || a.label === 'Evento Único'));
    const endAction = flatActions.find(a => a.id === id && a.label === 'Fim');

    document.getElementById('editId').value = action.id;
    document.getElementById('title').value = action.title;
    document.getElementById('cat').value = action.cat;
    handleCategoryChange();
    const linkedItemSel = document.getElementById('linked-item');
    if (linkedItemSel && action.linkedItem) {
        linkedItemSel.value = action.linkedItem;
    }
    const indicatorList = document.getElementById('indicator-list');
    if (indicatorList) indicatorList.innerHTML = '';

    if (action.indicatorData && Array.isArray(action.indicatorData)) {
        action.indicatorData.forEach(indData => addIndicatorField(indData));
    }
    document.getElementById('start').value = startAction ? startAction.date : '';
    document.getElementById('end').value = endAction ? endAction.date : (startAction ? startAction.date : '');
    quill.root.innerHTML = action.desc;
    quillResources.root.innerHTML = action.resources || '';
    document.getElementById('formTitle').innerText = 'Editar Ação';
    document.getElementById('formContainer').style.display = 'block';
    window.scrollTo(0,0);
    render();
}

document.getElementById('pdrimForm').addEventListener('submit', function(e) {
    e.preventDefault();
    const editId = document.getElementById('editId').value;
    
    const linkContainer = document.getElementById('link-container');
    let linkedItem = '';
    if (linkContainer && linkContainer.style.display !== 'none') {
        const linkedItemSel = document.getElementById('linked-item');
        if (linkedItemSel) linkedItem = linkedItemSel.value;
    }

    let indicatorData = [];
    if (document.getElementById('cat').value === 'Metas e Indicadores') {
        const entries = document.querySelectorAll('#indicator-list .indicator-entry');
        entries.forEach(entry => {
            const name = entry.querySelector('.indName').value;
            const meta = entry.querySelector('.indMeta').value;
            const unit = entry.querySelector('.indUnit').value;
            const min = entry.querySelector('.indMin').value;
            const max = entry.querySelector('.indMax').value;

            if (name || meta || unit || min || max) {
                indicatorData.push({ name, meta, unit, min, max });
            }
        });
    }

    const common = { id: editId ? parseInt(editId) : Date.now(), title: document.getElementById('title').value, cat: document.getElementById('cat').value, desc: quill.root.innerHTML, resources: quillResources.root.innerHTML, status: 'pendente', linkedItem: linkedItem, indicatorData: indicatorData };
    if(editId) flatActions = flatActions.filter(a => a.id != editId);
    const s = document.getElementById('start').value;
    const en = document.getElementById('end').value;
    if(s === en) flatActions.push({...common, date: s, label: 'Evento Único'});
    else { flatActions.push({...common, date: s, label: 'Início'}); flatActions.push({...common, date: en, label: 'Fim'}); }
    save();
    resetForm(); render();
});

function toggleDeleteMode() {
    const wrapper = document.getElementById('capture-area');
    const btn = document.getElementById('btnDeleteToggle');
    wrapper.classList.toggle('delete-mode');
    const isDeleteMode = wrapper.classList.contains('delete-mode');
    btn.innerText = isDeleteMode ? "Cancelar" : "Excluir Ação";

    const headerCheckbox = document.querySelector('.delete-checkbox-header');
    if (headerCheckbox) {
        headerCheckbox.style.display = isDeleteMode ? 'inline-block' : 'none';
        if (!isDeleteMode) headerCheckbox.checked = false;
    }

    if (!isDeleteMode) {
        selectedForDeletion = [];
        render();
    }
}

function selectAll(check) { 
    document.querySelectorAll('.delete-checkbox').forEach(cb => { 
        if (cb.checked !== check) {
            cb.checked = check; 
            handleCheckboxChange(cb); 
        }
    }); 
}

// LÓGICA DE SINCRONIA NA EXCLUSÃO
function handleCheckboxChange(cb) {
    const actionId = parseInt(cb.value);
    const isChecked = cb.checked;

    if (isChecked && !selectedForDeletion.includes(actionId)) {
        selectedForDeletion.push(actionId);
    } else if (!isChecked) {
        selectedForDeletion = selectedForDeletion.filter(id => id !== actionId);
    }

    // Sincroniza todos os checkboxes com o mesmo Action ID
    document.querySelectorAll(`.delete-checkbox[value="${actionId}"]`).forEach(input => {
        input.checked = isChecked;
        const idx = input.getAttribute('data-index');
        
        // Cards view
        const cardItem = input.closest('.action-card-item');
        if (cardItem) cardItem.classList.toggle('deleting-card', isChecked);

        // Timeline view
        const tmItem = input.closest('.tm-item');
        if (tmItem) tmItem.classList.toggle('deleting-tm-item', isChecked);

        if (idx !== null && idx !== "undefined" && idx !== "") {
            const card = document.getElementById(`card-${idx}`);
            if (card) card.classList.toggle('deleting-timeline-card', isChecked);
            
            const endText = document.getElementById(`end-text-${idx}`);
            if (endText) endText.classList.toggle('deleting-end-text', isChecked);
        }
    });

    // Estiliza linha da tabela
    const row = document.getElementById(`row-${actionId}`);
    if (row) row.classList.toggle('deleting-table-row', isChecked);
}

function deleteSingleAction(id) {
    const action = flatActions.find(a => a.id == id);
    if (!action) return;
    if (confirm(`Tem certeza que deseja excluir a ação "${action.title}"? Esta ação não pode ser desfeita.`)) {
        flatActions = flatActions.filter(a => a.id != id);
        selectedForDeletion = selectedForDeletion.filter(selId => selId != id);
        const editId = document.getElementById('editId').value;
        if (editId && editId == id) resetForm();
        save();
        render();
        showToast("Ação excluída com sucesso!", "success");
    }
}

function confirmBulkDelete() {
    if (selectedForDeletion.length === 0) return showToast("Selecione uma ação.", "warning");
    if (confirm(`Excluir permanentemente ${selectedForDeletion.length} ações?`)) {
        flatActions = flatActions.filter(a => !selectedForDeletion.includes(a.id));
        const editId = document.getElementById('editId').value;
        if (editId && selectedForDeletion.includes(parseInt(editId))) resetForm();
        selectedForDeletion = [];
        save();
        toggleDeleteMode(); render();
    }
}

function render() {
    const fVal = document.getElementById('filter').value;
    const filtered = flatActions.filter(a => fVal === 'all' || a.cat === fVal);

    const currentEditId = document.getElementById('editId').value;
    const viewsContainer = document.getElementById('views-container');
    if (currentEditId) {
        viewsContainer.classList.add('editing-active');
    } else {
        viewsContainer.classList.remove('editing-active');
    }
    
    const alertBox = document.getElementById('missing-categories-alert');
    if (alertBox) {
        if (flatActions.length > 0) {
            const usedCats = new Set(flatActions.map(a => a.cat));
            const allCats = Object.keys(categories);
            const missingCats = allCats.filter(c => !usedCats.has(c));
            
            if (missingCats.length > 0) {
                const missingLinks = missingCats.map(c => `<span class="action-link" style="margin-right: 5px; color: var(--accent); text-decoration: underline; cursor: pointer;" onclick="openNewFormWithCategory('${c}')">${c}</span>`).join(', ');
                alertBox.innerHTML = `<b style="color: inherit;">🚫 Falta cadastrar ações de:</b> ${missingLinks}`;
                alertBox.style.display = 'block';
            } else {
                alertBox.style.display = 'none';
            }
        } else {
            alertBox.style.display = 'none';
        }
    }

    const btnExpand = document.getElementById('btn-toggle-all-timeline');
    if (btnExpand) {
        // Exibe apenas se estiver na view timeline e houver dados
        btnExpand.style.display = (currentView === 'timeline' && filtered.length > 0) ? 'inline-block' : 'none';
    }

    if (currentView === 'cards') {
        renderCards(filtered);
    } else if (currentView === 'timeline') {
        renderTimeline(filtered);
    } else {
        renderTable(filtered);
    }
}

function getLinkedItemName(linkedItem) {
    if (!linkedItem || !sourceDataDesc) return '';
    if (linkedItem.startsWith('risk_')) {
        const id = linkedItem.substring(5);
        const r = sourceDataDesc.risks.find(x => x.id === id);
        return r ? `⚠️ ${r.desc}` : '';
    } else if (linkedItem.startsWith('act_')) {
        const id = linkedItem.substring(4);
        const a = sourceDataDesc.activities.find(x => x.id === id);
        return a ? `📋 ${a.name}` : '';
    }
    return '';
}

function getIndicatorHtml(indicatorData, linkedItem) {
    if (!indicatorData || !Array.isArray(indicatorData) || indicatorData.length === 0) return '';

    let tooltipContent = '';
    indicatorData.forEach(ind => {
        let prefix = 'Indicador';
        if (linkedItem && linkedItem.startsWith('act_')) prefix = 'KPI';
        else if (linkedItem && linkedItem.startsWith('risk_')) prefix = 'KRI';

        tooltipContent += `<div style="padding: 5px 0; border-bottom: 1px dashed var(--border-color);">`;
        if (ind.name) tooltipContent += `<strong style="color: var(--dark-accent);">${prefix}:</strong> ${ind.name}`;
        
        let stats = [];
        if (ind.min !== '' && ind.min !== null) stats.push(`<b>Mín:</b> ${ind.min}`);
        if (ind.max !== '' && ind.max !== null) stats.push(`<b>Máx:</b> ${ind.max}`);
        if (ind.meta !== '' && ind.meta !== null) stats.push(`<b>Meta:</b> ${ind.meta}${ind.unit ? ind.unit : ''}`);
        
        if (stats.length > 0) {
            if (ind.name) tooltipContent += `<br>`;
            tooltipContent += stats.join(' | ');
        }
        tooltipContent += `</div>`;
    });
    
    if (tooltipContent.endsWith('</div>')) {
        const lastBorderIndex = tooltipContent.lastIndexOf(' border-bottom');
        if (lastBorderIndex > -1) {
            tooltipContent = tooltipContent.substring(0, lastBorderIndex) + tooltipContent.substring(lastBorderIndex).replace(' border-bottom: 1px dashed var(--border-color);', '');
        }
    }

    return `<div class="custom-tooltip-container" style="display:inline-block; position:relative; margin-left:6px; font-size:0.85rem;" onclick="toggleTooltip(event, this)" onmouseenter="showTooltip(this)" onmouseleave="hideTooltip(this)">
                <span style="cursor:pointer;">🎯 (${indicatorData.length})</span>
                <div class="custom-tooltip no-print" style="font-weight:normal; line-height:1.4;">${tooltipContent}</div>
            </div>`;
}

function renderCards(data) {
    const root = document.getElementById('cards-root');
    root.innerHTML = '';
    const uniqueActions = getUniqueActions(data);

    if (uniqueActions.length === 0) {
        root.innerHTML = '<div class="empty-state" style="grid-column: 1 / -1;">Sem ações cadastradas</div>';
        return;
    }

    const byCat = {};
    Object.keys(categories).forEach(c => byCat[c] = []);
    uniqueActions.forEach(a => { if(byCat[a.cat]) byCat[a.cat].push(a); });

    const currentEditId = document.getElementById('editId').value;

    Object.keys(byCat).forEach(cat => {
        const actions = byCat[cat].sort((a,b) => new Date(a.startDate) - new Date(b.startDate));
        if(actions.length === 0) return;

        const minDateTime = Math.min(...actions.map(a => new Date(a.startDate).getTime()));
        const maxDateTime = Math.max(...actions.map(a => new Date(a.endDate).getTime()));

        let html = `<div class="t-step" style="border-top: 6px solid ${categories[cat]}; display: flex; flex-direction: column; justify-content: flex-start; text-align: left; padding: 15px;">
            <strong style="margin-bottom: 12px; font-size: 1rem; color: var(--dark-accent);">${cat}</strong>
            <div style="display: grid; grid-template-columns: auto 1fr auto auto; gap: 10px; padding: 0 4px 6px 4px; border-bottom: 1px solid var(--border-color); font-size: 0.65rem; font-weight: 700; color: #94a3b8; text-transform: uppercase;">
                <span style="text-align: center;">Status</span>
                <span>Ação</span>
                <span style="text-align: right;">Início</span>
                <span style="text-align: right;">Fim</span>
            </div>
            <div style="display: flex; flex-direction: column; gap: 4px; margin-top: 8px;">`;
        
        actions.forEach((act, index) => {
            const s = act.startDate.split('-').reverse().join('/');
            const e = act.endDate.split('-').reverse().join('/');
            const isEditingThis = (currentEditId && act.id == currentEditId);
            const isDeletingThis = selectedForDeletion.includes(act.id);
            const editClass = isEditingThis ? 'editing-card' : '';
            const deleteClass = isDeletingThis ? 'deleting-card' : '';
            const checkedAttr = isDeletingThis ? 'checked' : '';
            const borderStyle = index === actions.length - 1 ? 'none' : '1px solid #f1f5f9';
            
            const actStartT = new Date(act.startDate).getTime();
            const actEndT = new Date(act.endDate).getTime();
            
            const startColor = actStartT === minDateTime ? 'color: var(--accent); font-weight: 700;' : 'color: #64748b; font-weight: 400;';
            const endColor = actEndT === maxDateTime ? 'color: var(--accent); font-weight: 700;' : 'color: #64748b; font-weight: 400;';
            
            const linkedName = getLinkedItemName(act.linkedItem);
            const linkedIcon = linkedName ? `<div class="custom-tooltip-container" style="display:inline-block; position:relative; margin-left:6px; font-size:0.85rem;" onclick="toggleTooltip(event, this)" onmouseenter="showTooltip(this)" onmouseleave="hideTooltip(this)"><span style="cursor:pointer;">🔗</span><div class="custom-tooltip no-print" style="font-weight:normal; line-height:1.4;"><b>Vínculo:</b><br>${linkedName}</div></div>` : '';
            const indicatorIcon = getIndicatorHtml(act.indicatorData, act.linkedItem);

            html += `<div class="action-card-item hover-trigger ${editClass} ${deleteClass}" style="display: grid; grid-template-columns: auto 1fr auto auto; gap: 10px; align-items: center; padding: 12px 4px; border-bottom: ${borderStyle}; border-radius: 4px; position: relative; transition: all 0.3s;">
                <div style="text-align: center; display: flex; align-items: center; justify-content: center; gap: 8px;">
                    <input type="checkbox" class="delete-checkbox" value="${act.id}" onchange="handleCheckboxChange(this)" ${checkedAttr}>
                    <span class="status-dot ${act.status}" title="${act.status}" onclick="showStatusSelectInTable(${act.id}, '${act.status}', this)" style="cursor:pointer;"></span>
                </div>
                <div style="display: flex; flex-direction: column; padding-right: 10px;"><span style="font-size:0.8rem; line-height:1.3; font-weight: 600; color: var(--dark-accent); word-break: break-word;">${act.title}${linkedIcon}${indicatorIcon}</span></div>
                <span style="font-size:0.75rem; text-align: right; white-space: nowrap; ${startColor}">${s}</span>
                <span style="font-size:0.75rem; text-align: right; white-space: nowrap; ${endColor}">${e}</span>
                <div class="no-print hover-target" style="top: 50%; transform: translateY(-50%); right: 4px;">
                    <span style="cursor:pointer; color:#0284c7; font-size: 1rem; line-height: 1;" onclick="editAction(${act.id})" title="Editar">✎</span>
                    <span style="cursor:pointer; color:#ef4444; font-size: 1rem; line-height: 1; margin-left: 8px;" onclick="deleteSingleAction(${act.id})" title="Excluir">✕</span>
                </div>
            </div>`;
        });

        html += `</div></div>`;
        root.insertAdjacentHTML('beforeend', html);
    });
}

function renderTimeline(data) {
    const root = document.getElementById('timeline-root');
    const empty = document.getElementById('timeline-empty');
    root.innerHTML = '';
    const sorted = data.sort((a, b) => new Date(a.date) - new Date(b.date));
    if (sorted.length === 0) {
        if (empty) empty.style.display = 'block';
        root.style.display = 'none';
        return;
    }
    if (empty) empty.style.display = 'none';
    root.style.display = 'block';

    const uniqueActions = getUniqueActions(data);
    const categoryDates = {};
    uniqueActions.forEach(action => {
        if (!categoryDates[action.cat]) {
            categoryDates[action.cat] = { min: new Date(action.startDate).getTime(), max: new Date(action.endDate).getTime() };
        } else {
            categoryDates[action.cat].min = Math.min(categoryDates[action.cat].min, new Date(action.startDate).getTime());
            categoryDates[action.cat].max = Math.max(categoryDates[action.cat].max, new Date(action.endDate).getTime());
        }
    });

    const currentEditId = document.getElementById('editId').value;

    // Paleta de cores fortes para os títulos de cada categoria baseada nas cores pastéis de fundo
    const catColorsDark = { 'Capacitação': '#334155', 'Gestão da Mudança': '#b45309', 'Tecnologia': '#1d4ed8', 'Implantação': '#15803d', 'Definição de Riscos': '#b91c1c', 'Tratamento de Riscos': '#b91c1c', 'Metas e Indicadores': '#7e22ce' };

    sorted.forEach((ev, index) => {
        const isBound = (index === 0 || index === sorted.length - 1);
        const dStr = ev.date.split('-').reverse().join('/');
        const isEditingThis = (currentEditId && ev.id == currentEditId);
        const isDeletingThis = selectedForDeletion.includes(ev.id);
        const isSimpleEnd = (ev.label === 'Fim' && index !== sorted.length - 1);
        
        const eventTime = new Date(ev.date).getTime();
        const isCategoryStart = categoryDates[ev.cat] && eventTime === categoryDates[ev.cat].min && (ev.label === 'Início' || ev.label === 'Evento Único');
        const isCategoryEnd = categoryDates[ev.cat] && eventTime === categoryDates[ev.cat].max && (ev.label === 'Fim' || ev.label === 'Evento Único');
        const dateClass = (isCategoryStart || isCategoryEnd) ? 'bound' : 'regular';

        let tagText = '';
        if (isCategoryStart) tagText = 'Início de Etapa';
        else if (isCategoryEnd) tagText = 'Fim de Etapa';

        const checkedAttr = isDeletingThis ? 'checked' : '';

        const leftContent = `
            <input type="checkbox" class="delete-checkbox" value="${ev.id}" data-index="${index}" onchange="handleCheckboxChange(this)" style="vertical-align: middle; margin-right: 4px;" ${checkedAttr}>
            <span class="tm-date ${dateClass}">${dStr}</span>
            ${tagText ? `<span class="tm-tag">${tagText}</span>` : ''}
        `;

        let rightContent = '';

        if (isSimpleEnd) {
            rightContent = `
                <div class="timeline-end-row" style="display: flex; align-items: center; gap: 8px; transition: all 0.3s;">
                    <span class="cat-badge" style="background: ${categories[ev.cat]};">${ev.cat}</span>
                    <span id="end-text-${index}" class="simple-end-text" style="font-size: 0.85rem; font-weight: 600; font-style: italic; color: #64748b;">Fim da Ação: ${ev.title}</span>
                </div>
            `;
        } else {
            const timelineCardClass = isEditingThis ? 'editing-timeline-card' : '';
            const timelineCardDeleteClass = isDeletingThis ? 'deleting-timeline-card' : '';
            let actionTextLabel = '';
            if (ev.label === 'Evento Único') actionTextLabel = 'Ação Única';
            else if (ev.label === 'Início') actionTextLabel = 'Início da Ação';
            else if (ev.label === 'Fim') actionTextLabel = 'Fim da Ação';

            const linkedName = getLinkedItemName(ev.linkedItem);
            const linkedIcon = linkedName ? `<div class="custom-tooltip-container" style="display:inline-block; position:relative; margin-left:6px; font-size:0.85rem;" onclick="toggleTooltip(event, this)" onmouseenter="showTooltip(this)" onmouseleave="hideTooltip(this)"><span style="cursor:pointer;">🔗</span><div class="custom-tooltip no-print" style="font-weight:normal; line-height:1.4;"><b>Vínculo:</b><br>${linkedName}</div></div>` : '';
            const indicatorIcon = getIndicatorHtml(ev.indicatorData, ev.linkedItem);

            rightContent = `
                <div class="timeline-card-wrapper">
                    <div class="timeline-card ${ev.status} ${timelineCardClass} ${timelineCardDeleteClass}" id="card-${index}" style="background: ${categories[ev.cat]}; display: ${timelineExpandedAll ? 'block' : 'none'};">
                        <div class="card-actions">
                            <div class="status-tag tag-${ev.status}" title="Alterar status" onclick="showStatusSelectInTimeline(${ev.id}, '${ev.status}', this)">
                                ${ev.status}
                                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>
                            </div>
                            <button class="btn-edit-action" onclick="editAction(${ev.id})">EDITAR</button>
                            <button class="btn-edit-action" style="background: #fee2e2; color: #991b1b;" onclick="deleteSingleAction(${ev.id})">EXCLUIR</button>
                        </div>
                        <div class="card-title" style="margin-bottom: 8px;">
                            <span style="color: ${catColorsDark[ev.cat] || 'var(--dark-accent)'}; font-size: 1.1rem; font-weight: 800;">${ev.title}${linkedIcon}${indicatorIcon}</span> 
                            <span class="no-print action-link" style="font-size:0.75rem; color: var(--accent); text-decoration: underline; cursor: pointer;" onclick="toggleCardExpansion(${index}, false)">(Ocultar detalhes)</span>
                        </div>
                        <div style="margin-bottom: 12px;">
                            <span class="cat-badge" style="background: rgba(255,255,255,0.6);">${ev.cat}</span>
                        </div>
                        <div class="card-content">${ev.desc}</div>
                        ${ev.resources && ev.resources !== '<p><br></p>' ? `<div style="margin-top: 15px; padding-top: 10px; border-top: 1px dashed #cbd5e1;"><b style="font-size:0.8rem; color: var(--dark-accent);">Recursos Necessários:</b><div class="card-content">${ev.resources}</div></div>` : ''}
                    </div>
                    <div class="timeline-text-view hover-trigger" id="text-view-${index}" style="display: ${timelineExpandedAll ? 'none' : 'flex'}; align-items: center; gap: 8px; width: 100%; position: relative;">
                        <span class="cat-badge" style="background: ${categories[ev.cat]}; flex-shrink: 0;">${ev.cat}</span>
                        <div style="font-weight: 600; color: var(--dark-accent); flex: 1; display: flex; align-items: center; min-width: 0; padding-right: 10px;">
                            <span style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-right: 6px;">${actionTextLabel}: ${ev.title}</span>
                            <span style="flex-shrink: 0; display: flex; align-items: center;">${linkedIcon}${indicatorIcon} <span class="no-print action-link" style="font-size:0.75rem; color: var(--accent); text-decoration: underline; cursor: pointer; margin-left: 6px;" onclick="toggleCardExpansion(${index}, true)">(Ver detalhes)</span></span>
                        </div>
                        <div class="status-tag tag-${ev.status}" title="Alterar status" onclick="showStatusSelectInTimeline(${ev.id}, '${ev.status}', this)" style="margin-right: 35px; flex-shrink: 0;">
                            ${ev.status}
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>
                        </div>
                        <div class="no-print hover-target" style="right: 8px; top: 50%; transform: translateY(-50%);">
                            <span style="cursor:pointer; color:#0284c7; font-size: 1rem;" onclick="editAction(${ev.id})" title="Editar">✎</span>
                            <span style="cursor:pointer; color:#ef4444; font-size: 1rem; margin-left: 8px;" onclick="deleteSingleAction(${ev.id})" title="Excluir">✕</span>
                        </div>
                    </div>
                </div>
            `;
        }

        const tmItemClass = isEditingThis ? 'editing-tm-item' : '';
        const tmItemDeleteClass = isDeletingThis ? 'deleting-tm-item' : '';
        root.insertAdjacentHTML('beforeend', `
            <div class="tm-item ${tmItemClass} ${tmItemDeleteClass}" style="transition: all 0.3s;">
                <div class="tm-left">
                    ${leftContent}
                </div>
                <div class="tm-center"></div>
                <div class="marker ${isBound ? (index === 0 ? 'start' : 'end') : 'mid'}"></div>
                <div class="tm-right">
                    ${rightContent}
                </div>
            </div>
        `);

        // Injeta a linha de separação limpa (vazia) logo após os itens que não são o último
        if (index !== sorted.length - 1) {
            root.insertAdjacentHTML('beforeend', `
                <div class="tm-item no-print" style="min-height: 30px; padding: 0;">
                    <div class="tm-left" style="border-bottom: 2px dotted var(--border-color); height: 15px; margin-bottom: 15px; margin-left: 30px;"></div>
                    <div class="tm-center"></div>
                    <div class="tm-right" style="border-bottom: 2px dotted var(--border-color); height: 15px; margin-bottom: 15px; margin-right: 30px;"></div>
                </div>
            `);
        }
    });
}

function getUniqueActions(data) {
    const actionsMap = new Map();
    data.forEach(action => {
        if (!actionsMap.has(action.id)) {
            const allForId = data.filter(a => a.id === action.id);
            const startAction = allForId.find(a => a.label === 'Início' || a.label === 'Evento Único');
            const endAction = allForId.find(a => a.label === 'Fim');

            if (startAction) {
                actionsMap.set(action.id, {
                    ...action,
                    startDate: startAction.date,
                    endDate: endAction ? endAction.date : startAction.date
                });
            }
        }
    });
    return Array.from(actionsMap.values()).sort((a, b) => new Date(a.startDate) - new Date(b.startDate));
}

function renderTable(data) {
    const root = document.getElementById('table-body');
    const empty = document.getElementById('table-empty');
    const table = document.getElementById('table-content');
    root.innerHTML = '';
    const uniqueActions = getUniqueActions(data);

    if (uniqueActions.length === 0) {
        if (empty) empty.style.display = 'block';
        if (table) table.style.display = 'none';
        return;
    }
    if (empty) empty.style.display = 'none';
    if (table) table.style.display = 'table';

    const currentEditId = document.getElementById('editId').value;

    // Aplica a ordenação atualizada
    uniqueActions.sort((a, b) => {
        let valA, valB;
        switch(currentSortCol) {
            case 'title': valA = (a.title || '').toLowerCase(); valB = (b.title || '').toLowerCase(); break;
            case 'cat': valA = (a.cat || '').toLowerCase(); valB = (b.cat || '').toLowerCase(); break;
            case 'start': valA = new Date(a.startDate).getTime(); valB = new Date(b.startDate).getTime(); break;
            case 'end': valA = new Date(a.endDate).getTime(); valB = new Date(b.endDate).getTime(); break;
            case 'status': valA = (a.status || '').toLowerCase(); valB = (b.status || '').toLowerCase(); break;
            default: valA = new Date(a.startDate).getTime(); valB = new Date(b.startDate).getTime();
        }
        
        // Correção de ordenação para strings e números
        if (valA < valB) return currentSortDir === 'asc' ? -1 : 1;
        if (valA > valB) return currentSortDir === 'asc' ? 1 : -1;
        return 0;
    });

    uniqueActions.forEach(action => {
        const isEditingThis = (currentEditId && action.id == currentEditId);
        const isDeletingThis = selectedForDeletion.includes(action.id);
        const tableRowClass = isEditingThis ? 'editing-table-row' : '';
        const tableRowDeleteClass = isDeletingThis ? 'deleting-table-row' : '';
        const checkedAttr = isDeletingThis ? 'checked' : '';
        const startStr = action.startDate.split('-').reverse().join('/');
        const endStr = action.endDate.split('-').reverse().join('/');
        
        const linkedName = getLinkedItemName(action.linkedItem);
        const linkedIcon = linkedName ? `<div class="custom-tooltip-container" style="display:inline-block; position:relative; margin-left:6px; font-size:0.85rem;" onclick="toggleTooltip(event, this)" onmouseenter="showTooltip(this)" onmouseleave="hideTooltip(this)"><span style="cursor:pointer;">🔗</span><div class="custom-tooltip no-print" style="font-weight:normal; line-height:1.4;"><b>Vínculo:</b><br>${linkedName}</div></div>` : '';
        const indicatorIcon = getIndicatorHtml(action.indicatorData, action.linkedItem);
        const titleHtml = `<div>${action.title}${linkedIcon}${indicatorIcon}</div>`;

        root.insertAdjacentHTML('beforeend', `
            <tr class="action-row hover-trigger ${action.status} ${tableRowClass} ${tableRowDeleteClass}" id="row-${action.id}">
                <td><input type="checkbox" class="delete-checkbox" value="${action.id}" onchange="handleCheckboxChange(this)" ${checkedAttr}></td>
                <td>${titleHtml}</td>
                <td>${action.cat}</td>
                <td>${startStr}</td>
                <td>${endStr}</td>
                <td>
                    <div class="status-tag tag-${action.status}" title="Alterar status" onclick="showStatusSelectInTable(${action.id}, '${action.status}', this)">
                        ${action.status}
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>
                    </div>
                </td>
                <td class="no-print" style="position: relative; text-align: center;">
                    <span style="color: #cbd5e1; font-size: 1.2rem; cursor: help;" title="Passe o mouse para opções">...</span>
                    <div class="no-print hover-target" style="top: 50%; transform: translateY(-50%); right: 15px; margin: 0;">
                        <span style="cursor:pointer; color:#0284c7; font-size: 1.1rem; line-height: 1;" onclick="editAction(${action.id})" title="Editar">✎</span>
                        <span style="cursor:pointer; color:#ef4444; font-size: 1.1rem; line-height: 1; margin-left: 8px;" onclick="deleteSingleAction(${action.id})" title="Excluir">✕</span>
                    </div>
                </td>
            </tr>
        `);
    });
    
    updateSortHeaders();
}

function sortTable(col) {
    if (currentSortCol === col) {
        currentSortDir = currentSortDir === 'asc' ? 'desc' : 'asc';
    } else {
        currentSortCol = col;
        currentSortDir = 'asc';
    }
    render();
}

function updateSortHeaders() {
    document.querySelectorAll('.sortable').forEach(th => {
        th.classList.remove('sort-asc', 'sort-desc');
        if (th.dataset.col === currentSortCol) th.classList.add(`sort-${currentSortDir}`);
    });
}

function showStatusSelectInTable(id, currentStatus, element) {
    currentStatus = currentStatus.toLowerCase();
    const sel = document.createElement('select');
    sel.className = 'status-select-inline';
    ['pendente', 'andamento', 'realizado'].forEach(o => { const op = document.createElement('option'); op.value = o; op.text = o.toUpperCase(); if (o === currentStatus) op.selected = true; sel.add(op); });
    sel.onchange = () => { flatActions.forEach(a => { if (a.id == id) a.status = sel.value; }); save(); render(); };
    sel.onblur = () => render();
    element.style.display = 'none'; 
    element.parentElement.appendChild(sel); 
    setTimeout(() => sel.focus(), 10);
}

function showStatusSelect(id, date, index, cur) {
    const card = document.getElementById(`card-${index}`);
    const sel = document.createElement('select'); sel.className = 'status-select-inline';
    ['pendente', 'andamento', 'realizado'].forEach(o => { const op = document.createElement('option'); op.value = o; op.text = o.toUpperCase(); if(o===cur) op.selected = true; sel.add(op); });
    sel.onchange = () => { flatActions.forEach(a => { if (a.id == id) a.status = sel.value; }); save(); render(); };
    sel.onblur = () => render(); 
    card.appendChild(sel); 
    setTimeout(() => sel.focus(), 10);
}

function toggleDropdown(event) {
    event.stopPropagation();
    const dropdown = document.getElementById("otherActionsDropdown").parentElement;
    const isShowing = dropdown.classList.contains('show');
    // Fecha todos os outros dropdowns abertos
    document.querySelectorAll('.dropdown.show').forEach(d => d.classList.remove('show'));
    // Abre ou fecha o dropdown atual
    if (!isShowing) {
        dropdown.classList.add('show');
    }
}

function switchView(view) {
    currentView = view;
    document.getElementById('cards-view').style.display = view === 'cards' ? 'block' : 'none';
    document.getElementById('timeline-view').style.display = view === 'timeline' ? 'block' : 'none';
    document.getElementById('table-view').style.display = view === 'table' ? 'block' : 'none';

    document.getElementById('btn-view-cards').classList.toggle('active', view === 'cards');
    document.getElementById('btn-view-timeline').classList.toggle('active', view === 'timeline');
    document.getElementById('btn-view-table').classList.toggle('active', view === 'table');
    render();
}

window.onclick = function(event) {
  if (!event.target.matches('.dropdown .btn-main')) {
    document.querySelectorAll('.dropdown.show').forEach(d => d.classList.remove('show'));
  }
  if (!event.target.closest('.custom-tooltip-container')) {
    document.querySelectorAll('.custom-tooltip-container.pinned').forEach(t => t.classList.remove('pinned'));
  }
}

function toggleTooltip(event, el) {
    event.stopPropagation();
    const isPinned = el.classList.contains('pinned');
    document.querySelectorAll('.custom-tooltip-container.pinned').forEach(t => t.classList.remove('pinned'));
    if (!isPinned) el.classList.add('pinned');
}
function showTooltip(el) { el.classList.add('hovered'); }
function hideTooltip(el) { el.classList.remove('hovered'); }

function importJSON(fileInput) {
    if (!fileInput.files.length) return;
    const reader = new FileReader();
    reader.onload = (e) => { try { flatActions = JSON.parse(e.target.result); save(); render(); fileInput.value = ''; showToast("Arquivo importado com sucesso!", "success"); } catch (err) { showToast("Arquivo JSON Inválido.", "error"); } };
    reader.readAsText(fileInput.files[0]);
}

function zerarArtefato() {
    if (confirm("Tem certeza que deseja apagar TODAS as ações cadastradas? Esta ação não pode ser desfeita.")) {
        flatActions = [];
        save();
        resetForm();
        render();
        showToast("Artefato zerado com sucesso!", "success");
    }
}

function printPage() {
    const a = document.getElementById('capture-area') || document.querySelector('.racionalizar'); 
    if(a) a.classList.add('pdf-mode'); 

    const originalTitle = document.title;
    document.title = "pdrim_racionalizar";

    showToast("Preparando impressão / PDF...", "info");

    // Aguarda o Toast e o CSS renderizarem antes de travar a tela
    setTimeout(() => {
        window.print();

        document.title = originalTitle;
        if(a) a.classList.remove('pdf-mode'); 
    }, 500);
}

function save() { localStorage.setItem('pdrim_rac_v10_9', JSON.stringify(flatActions)); localStorage.setItem('pdrim_exported', 'false'); updateBreadcrumbs(); }
function exportJSON() { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([JSON.stringify(flatActions)], {type: "application/json"})); a.download = "pdrim_racionalizar.json"; a.click(); localStorage.setItem('pdrim_exported', 'true'); showToast("Arquivo exportado com sucesso!", "success"); }

initUI(); render();