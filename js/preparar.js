// Lógica principal do módulo Preparar

document.addEventListener('DOMContentLoaded', () => {
    initPrepararUI();
});

let db = { sec1: [], sec2: [], sec3: [], sec4: [], sec5: [], time: { 1:{i:'',f:''}, 2:{i:'',f:''}, 3:{i:'',f:''}, 4:{i:'',f:''}, 5:{i:'',f:''} }, processName: '', s1_phrase: 'Mitigar {{dores}} para viabilizar {{necessidades}}.' };
let editState = { s0: -1, s1: -1, s2: -1, s3: -1, s4: -1, s5: -1 };

const CAT_MAP = { 'PES':'Pessoas e Equipes', 'TEC':'Sistemas e Tecnologias', 'MAT':'Infraestrutura e Materiais', 'LEI':'Leis, Normas e Funções', 'TEM':'Tempo e Prazos' };
const STK_MAP = { 'DONO': 'Dono do Processo', 'GEST': 'Gestor do Processo', 'FACIL': 'Facilitador(es)', 'EXEC': 'Executores do Processo', 'TIC': 'Membro de TIC' };
const STATIC_TARGETS = ['disp_s1_obj','disp_s1_pains','disp_s1_needs','disp_swot_s','disp_swot_w','disp_swot_o','disp_swot_t','disp_s4_kpi','disp_s4_kri','disp_int','disp_s5_art','disp_s5_res'];

function initPrepararUI() {
    console.log("Módulo Preparar inicializado.");
    
    // Injeta botões Cancelar globalmente no cabeçalho das seções
    document.querySelectorAll('.section').forEach(sec => {
        const titleDiv = sec.querySelector('.section-title');
        if (titleDiv) {
            const editBtn = titleDiv.querySelector('button[onclick^="toggleEdit"]');
            if (editBtn) {
                const wrapper = document.createElement('div');
                wrapper.className = 'no-print section-actions';
                wrapper.style.display = 'flex';
                wrapper.style.gap = '8px';
                editBtn.parentNode.insertBefore(wrapper, editBtn);
                wrapper.appendChild(editBtn);
                
                const cancelBtn = document.createElement('button');
                cancelBtn.className = 'btn-edit-action btn-cancel-section';
                cancelBtn.innerText = 'Cancelar';
                cancelBtn.style.backgroundColor = '#fee2e2';
                cancelBtn.style.color = '#991b1b';
                cancelBtn.style.display = 'none';
                cancelBtn.onclick = (e) => {
                    e.stopPropagation();
                    toggleEdit(sec.id, true);
                };
                wrapper.appendChild(cancelBtn);
            }
        }
    });

    if(localStorage.getItem('pdrim_prep_v10_9')) {
        const stored = JSON.parse(localStorage.getItem('pdrim_prep_v10_9'));
        if(stored.sec6 && !stored.sec5) { stored.sec5 = stored.sec6; delete stored.sec6; }
        db = { ...db, ...stored };
    }
    render(); 
    loadTimeData();
    updateBreadcrumbs();
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

function updateSectionState(sectionElement) {
    if (!sectionElement) return;
    const anyOpen = Array.from(sectionElement.querySelectorAll('.form-box')).some(b => b.style.display === 'block');
    if (anyOpen) {
        sectionElement.classList.add('editing-section');
    } else {
        sectionElement.classList.remove('editing-section');
    }
    
    const cancelBtn = sectionElement.querySelector('.btn-cancel-section');
    if (cancelBtn) {
        cancelBtn.style.display = anyOpen ? 'block' : 'none';
    }
}

function showToast(message, type = 'error') {
    const container = document.getElementById('toast-container');
    if (!container) return alert(message);
    
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

function saveProcessName() {
    db.processName = document.getElementById('process_name').value;
    renderProcessName();
    save();
    cancelProcessName();
}

function cancelProcessName() {
    const box = document.getElementById('form_process_name');
    if (box) box.style.display = 'none';
    updateSectionState(document.getElementById('sec0'));
    const sec = document.getElementById('sec0'); if (sec) sec.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function editProcessName() {
    const sectionElement = document.getElementById('sec0');
    sectionElement.querySelectorAll('.form-box').forEach(b => b.style.display = 'none');
    
    const box = document.getElementById('form_process_name');
    if (box) box.style.display = 'block';
    
    updateSectionState(sectionElement);
    
    const input = document.getElementById('process_name');
    if (input) {
        input.value = db.processName || '';
        input.focus();
    }
}

function renderProcessName() {
    const inp = document.getElementById('process_name');
    const disp = document.getElementById('disp_process_name');
    if (inp) inp.value = db.processName || '';
    if (disp) {
        disp.innerHTML = (db.processName || 'Processo Não Definido') + `
            <div class="no-print hover-target">
                <span style="cursor:pointer; color:#0284c7; font-size: 1.2rem;" onclick="editProcessName()" title="Editar">✎</span>
            </div>`;
    }
    const headerName = document.getElementById('header-initiative-name');
    const headerText = document.getElementById('header-initiative-text');
    if (headerName && headerText) {
        if (db.processName) { headerText.innerText = db.processName; headerName.style.display = 'block'; }
        else { headerName.style.display = 'none'; }
    }
}

function toggleEdit(id, forceClose = false) {
    const boxes = document.querySelectorAll(`#${id} .form-box`);
    if(boxes.length === 0) return;
    
    const sectionElement = document.getElementById(id);
    const isCurrentlyEditing = sectionElement ? sectionElement.classList.contains('editing-section') : false;
    const isOpening = forceClose ? false : !isCurrentlyEditing;

    boxes.forEach(box => box.style.display = isOpening ? 'block' : 'none');
    updateSectionState(sectionElement);
    if (!isOpening && sectionElement) {
        sectionElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    const pref = 's' + id.replace('sec', '');
    let secForAddItem = id;
    if (pref === 's0') secForAddItem = 'sec2';

    let stateChanged = false;

    // Redefinir formulários e limpar contexto de edição ao fechar ou reabrir livremente
    if (!isOpening || editState[pref] === -1 || editState[pref] === undefined) {
        if (!isOpening && editState[pref] !== undefined && editState[pref] >= 0) {
            editState[pref] = -1;
            stateChanged = true;
        }

        const btn = document.querySelector(`#${id} button[onclick="addItem('${secForAddItem}', '${pref}')"]`);
        if (btn) {
            btn.innerText = 'Add';
            const cancelBtn = btn.parentElement.querySelector('.btn-cancel-edit');
            if (cancelBtn) cancelBtn.style.display = 'none';
        }

        boxes.forEach(box => {
            const inputs = box.querySelectorAll('input, select, textarea');
            inputs.forEach(el => {
                if (el.type === 'checkbox') el.checked = false;
                else if (el.id === 's1_custom_phrase') el.value = db.s1_phrase || 'Mitigar {{dores}} para viabilizar {{necessidades}}.';
                else if (el.id === 'process_name') el.value = db.processName || '';
                else el.value = '';
            });
        });
        if (id === 'sec4') toggleS4Input();
        if (id === 'sec5') toggleS5Icon();
    }

    if (stateChanged) render();
    if (id === 'sec6') updateTimeline();
}

let stkDetailsOpen = false;
function toggleStkDetails() {
    stkDetailsOpen = !stkDetailsOpen;
    const main = document.getElementById('disp_stk_main');
    const simple = document.getElementById('disp_stk_simple');
    const btn = document.getElementById('btn_toggle_stk');
    if (stkDetailsOpen) {
        main.style.display = 'grid';
        simple.style.display = 'none';
        btn.innerText = '(Ocultar detalhes)';
    } else {
        main.style.display = 'none';
        simple.style.display = 'flex';
        btn.innerText = '(Ver detalhes)';
    }
}

let currentTimeView = 'cards';
let currentSwotView = 'matrix';
let currentS3View = 'type';
function switchS3View(view) {
    currentS3View = view;
    render();
}

function switchTimeView(view) {
    currentTimeView = view;
    document.getElementById('disp_time_cards').style.display = view === 'cards' ? 'flex' : 'none';
    document.getElementById('disp_time_timeline').style.display = view === 'timeline' ? 'block' : 'none';
    document.getElementById('disp_time_table').style.display = view === 'table' ? 'block' : 'none';
    
    document.getElementById('btn-time-cards').classList.toggle('active', view === 'cards');
    document.getElementById('btn-time-timeline').classList.toggle('active', view === 'timeline');
    document.getElementById('btn-time-table').classList.toggle('active', view === 'table');
    updateTimeline();
}

function switchSwotView(view) {
    currentSwotView = view;
    document.getElementById('disp_swot_matrix').style.display = view === 'matrix' ? 'block' : 'none';
    document.getElementById('disp_swot_table').style.display = view === 'table' ? 'block' : 'none';
    
    document.getElementById('btn-swot-matrix').classList.toggle('active', view === 'matrix');
    document.getElementById('btn-swot-table').classList.toggle('active', view === 'table');
    render();
}

function saveS1Phrase() {
    const input = document.getElementById('s1_custom_phrase');
    if (input) {
        db.s1_phrase = input.value || 'Mitigar {{dores}} para viabilizar {{necessidades}}.';
        save();
        cancelS1Phrase();
        render();
    }
}

function cancelS1Phrase() {
    const box = document.getElementById('form_s1_phrase');
    if (box) box.style.display = 'none';
    updateSectionState(document.getElementById('sec1'));
    const sec = document.getElementById('sec1'); if (sec) sec.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function editS1Phrase() {
    const sectionElement = document.getElementById('sec1');
    sectionElement.querySelectorAll('.form-box').forEach(b => b.style.display = 'none');
    
    const box = document.getElementById('form_s1_phrase');
    if (box) box.style.display = 'block';
    
    updateSectionState(sectionElement);
    
    const input = document.getElementById('s1_custom_phrase');
    if (input) {
        input.value = db.s1_phrase || 'Mitigar {{dores}} para viabilizar {{necessidades}}.';
        input.focus();
    }
}

function resetS1Phrase() {
    const input = document.getElementById('s1_custom_phrase');
    if (input) {
        input.value = 'Mitigar {{dores}} para viabilizar {{necessidades}}.';
        saveS1Phrase();
    }
}

function toggleVarHelp() {
    const box = document.getElementById('var_help_box');
    if (box) box.style.display = box.style.display === 'none' ? 'block' : 'none';
}

function toggleS4Input() {
    const cat = document.getElementById('s4_cat')?.value;
    const lblCrit = document.getElementById('lbl_s4_critical');
    if(lblCrit) lblCrit.style.display = (cat === 'KRI') ? 'flex' : 'none';
}

function toggleS5Icon() {
    const cat = document.getElementById('s5_cat')?.value;
    const iconSel = document.getElementById('s5_icon');
    if(iconSel) iconSel.style.display = (cat === 'RES') ? 'none' : '';
}

function addItem(sec, pref) {
    const valElement = document.getElementById(pref+'_val');
    const val = valElement ? valElement.value : '';
    if(!val) return;

    let typeVal = document.getElementById(pref+'_type')?.value;
    let scopeVal = document.getElementById(pref+'_scope')?.value;
    if (pref === 's3') {
        const ts = document.getElementById('s3_ts').value;
        if (ts === 'RES') { typeVal = 'RES'; scopeVal = null; }
        else { typeVal = 'SCOPE'; scopeVal = ts; }
    }
    
    let isCritical = false;
    if (pref === 's4') {
        const chk = document.getElementById('s4_critical');
        isCritical = chk && chk.checked;
            
        const metaStr = document.getElementById('s4_meta')?.value;
        const uniStr = document.getElementById('s4_uni')?.value;
        
        // Validação da ausência de unidade se a meta for declarada
        if (metaStr && metaStr.trim() !== '' && (!uniStr || uniStr.trim() === '')) {
            showToast("Por favor, informe a 'Unidade' para a meta.", "error");
            return;
        }

        const minStr = document.getElementById('s4_min')?.value;
        const maxStr = document.getElementById('s4_max')?.value;
        const curStr = document.getElementById('s4_cur')?.value;

        let minNum = NaN, maxNum = NaN, curNum = NaN;

        if (minStr && minStr.trim() !== '') minNum = parseFloat(minStr.replace(',', '.'));
        if (maxStr && maxStr.trim() !== '') maxNum = parseFloat(maxStr.replace(',', '.'));
        if (curStr && curStr.trim() !== '') curNum = parseFloat(curStr.replace(',', '.'));

        if (!isNaN(minNum) && !isNaN(maxNum) && maxNum < minNum) {
            showToast("O valor 'Máx' não pode ser menor que o 'Mín'.", "error");
            return;
        }

        if (!isNaN(curNum)) {
            if (!isNaN(minNum) && curNum < minNum) {
                showToast("O valor 'Atual' não pode ser menor que o 'Mín'.", "error");
                return;
            }
            if (!isNaN(maxNum) && curNum > maxNum) {
                showToast("O valor 'Atual' não pode ser maior que o 'Máx'.", "error");
                return;
            }
        }
    }

    // Alerta de itens possivelmente duplicados inseridos (Mas continua salvando)
    const isEdit = editState[pref] !== undefined && editState[pref] >= 0;
    const isDuplicate = db[sec].some((item, i) => item.val.trim().toLowerCase() === val.trim().toLowerCase() && (!isEdit || i !== editState[pref]));
    if (isDuplicate) {
        showToast(`Aviso: O item '${val}' já foi inserido nesta seção.`, "warning");
    }

    const newItem = { cat: document.getElementById(pref+'_cat')?.value, val: val, icon: document.getElementById(pref+'_icon')?.value, type: typeVal, scope: scopeVal, min: document.getElementById(pref+'_min')?.value, max: document.getElementById(pref+'_max')?.value, cur: document.getElementById(pref+'_cur')?.value, meta: document.getElementById(pref+'_meta')?.value, uni: document.getElementById(pref+'_uni')?.value, isCritical: isCritical };

    if (editState[pref] !== undefined && editState[pref] >= 0) {
        db[sec][editState[pref]] = newItem;
        editState[pref] = -1;
        const btnObjs = document.querySelectorAll(`button[onclick="addItem('${sec}', '${pref}')"]`);
        btnObjs.forEach(b => {
            b.innerText = 'Add';
            const cancelBtn = b.parentElement.querySelector('.btn-cancel-edit');
            if (cancelBtn) cancelBtn.style.display = 'none';
        });

        // Oculta o formulário após salvar a edição e zera a visualização
        closeForm(sec, pref);
    } else {
        db[sec].push(newItem);
    }

    if (valElement && valElement.tagName === 'INPUT') valElement.value = '';
    if (pref === 's4') {
        if (document.getElementById('s4_critical')) document.getElementById('s4_critical').checked = false;
        ['s4_min', 's4_max', 's4_cur', 's4_meta', 's4_uni'].forEach(id => { const el = document.getElementById(id); if(el) el.value = ''; });
        if(document.getElementById('s4_cat').value === 'INT') { const sel = document.getElementById('s4_val_sel'); if(sel) sel.value = ''; }
    }
    render(); save();
}

function remove(sec, idx) { db[sec].splice(idx, 1); render(); save(); }

function cancelEdit(sec, pref) {
    editState[pref] = -1;
    closeForm(sec, pref);
    const btnObjs = document.querySelectorAll(`button[onclick="addItem('${sec}', '${pref}')"]`);
    btnObjs.forEach(b => {
        b.innerText = 'Add';
        const cancelBtn = b.parentElement.querySelector('.btn-cancel-edit');
        if (cancelBtn) cancelBtn.style.display = 'none';
    });
    render();
}

function closeForm(sec, pref) {
    const sectionElement = document.getElementById(sec === 'sec2' && pref === 's0' ? 'sec0' : sec);
    if (sectionElement) {
        const valInput = document.getElementById(pref + '_val');
        const formBox = valInput ? valInput.closest('.form-box') : sectionElement.querySelector('.form-box');
        if (formBox) {
            formBox.style.display = 'none';
            const inputs = formBox.querySelectorAll('input, select, textarea');
            inputs.forEach(el => {
                if (el.type === 'checkbox') el.checked = false;
                else el.value = '';
            });
        }
        updateSectionState(sectionElement);
        sectionElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}

function editItem(sec, idx, pref) {
    const item = db[sec][idx];
    if (!item) return;

    editState[pref] = idx;

    // Determina o elemento da seção correto que contém o formulário
    const sectionElement = document.getElementById(sec === 'sec2' && pref === 's0' ? 'sec0' : sec);
    sectionElement.querySelectorAll('.form-box').forEach(b => b.style.display = 'none');
    const valInput = document.getElementById(pref + '_val');
    const formBox = valInput ? valInput.closest('.form-box') : sectionElement.querySelector('.form-box');
    
    const addButton = formBox ? formBox.querySelector(`button[onclick="addItem('${sec}', '${pref}')"]`) : null;

    // Preenche os campos comuns
    if (document.getElementById(pref + '_cat')) {
        document.getElementById(pref + '_cat').value = item.cat;
    }
    if (document.getElementById(pref + '_val')) {
        document.getElementById(pref + '_val').value = item.val;
    }

    // Lógica específica da seção para preencher formulários
    if (pref === 's3') {
        const tsElement = document.getElementById('s3_ts');
        if (item.type === 'RES') {
            tsElement.value = 'RES';
        } else { // SCOPE
            tsElement.value = item.scope;
        }
    } else if (pref === 's4') {
        document.getElementById('s4_min').value = item.min || '';
        document.getElementById('s4_max').value = item.max || '';
        document.getElementById('s4_cur').value = item.cur || '';
        document.getElementById('s4_meta').value = item.meta || '';
        document.getElementById('s4_uni').value = item.uni || '';
        const chk = document.getElementById('s4_critical');
        if (chk) { chk.checked = item.isCritical || false; }
        toggleS4Input(); // Atualiza a UI para especificidades de KRI/KPI
    } else if (pref === 's5') {
        if (document.getElementById('s5_icon')) { document.getElementById('s5_icon').value = item.icon; }
        toggleS5Icon();
    }

    // Mostra o formulário e atualiza o texto do botão
    if (formBox) { formBox.style.display = 'block'; }
    updateSectionState(sectionElement);
    if (addButton) { 
        addButton.innerText = 'Salvar'; 
        let cancelBtn = addButton.parentElement.querySelector('.btn-cancel-edit');
        if (!cancelBtn) {
            cancelBtn = document.createElement('button');
            cancelBtn.className = 'btn-main btn-cancel btn-cancel-edit';
            cancelBtn.innerText = 'Cancelar';
            cancelBtn.type = 'button';
            cancelBtn.onclick = () => {
                cancelEdit(sec, pref);
            };
            addButton.parentElement.appendChild(cancelBtn);
        }
        cancelBtn.style.display = 'flex';
    }
    
    render();
    sectionElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function render() {
    renderProcessName();
    STATIC_TARGETS.forEach(t => { if(document.getElementById(t)) document.getElementById(t).innerHTML = ''; });
    
    function makeCard(it, sec, pref) {
        const idx = db[sec].indexOf(it);
        const isEditing = (editState[pref] === idx);
        const editClass = isEditing ? 'editing-card' : '';
        return `<div class="mini-card hover-trigger ${editClass}" style="display:block;">
            <span style="display:block; margin-bottom:4px; word-break:break-word;">${it.val}</span>
            <div class="no-print hover-target">
                <span style="cursor:pointer; color:#0284c7;" onclick="editItem('${sec}',${idx},'${pref}')" title="Editar">✎</span>
                <span style="cursor:pointer; color:red;" onclick="remove('${sec}',${idx})" title="Excluir">✕</span>
            </div>
        </div>`;
    }

    function makeBadge(it, sec, pref, title = '') {
        const idx = db[sec].indexOf(it);
        const isEditing = (editState[pref] === idx);
        const editClass = isEditing ? 'editing-card' : '';
        const titleAttr = title ? `title="${title}"` : '';
        return `<div class="hover-trigger ${editClass}" style="box-shadow: 0 1px 2px rgba(0,0,0,0.05); background: #ffffff; color: #475569; padding: 3px 10px; border-radius: 12px; font-size: 0.7rem; font-weight: 600; display: inline-flex; align-items: center; border: 1px solid #e2e8f0; word-break: break-word;" ${titleAttr}>
            ${it.val}
            <span class="no-print hover-target" style="top: -8px; right: -8px; padding: 2px 4px; gap: 4px;">
                <span style="cursor:pointer; color:#0284c7; font-size: 0.8rem; line-height: 1;" onclick="editItem('${sec}',${idx},'${pref}')" title="Editar">✎</span>
                <span style="cursor:pointer; color:#ef4444; font-size: 0.8rem; line-height: 1;" onclick="remove('${sec}',${idx})" title="Excluir">✕</span>
            </span>
        </div>`;
    }

    // SEÇÃO 1
    db.sec1.forEach((it) => {
        const h = makeCard(it, 'sec1', 's1');
        if(it.cat === 'OBJ') document.getElementById('disp_s1_obj').innerHTML += h;
        else if(it.cat === 'DOR') document.getElementById('disp_s1_pains').innerHTML += h;
        else if(it.cat === 'NEC') document.getElementById('disp_s1_needs').innerHTML += h;
    });
    const dores = db.sec1.filter(x => x.cat === 'DOR').map(x => x.val);
    const necs = db.sec1.filter(x => x.cat === 'NEC').map(x => x.val);
    const propBox = document.getElementById('disp_s1_prop');
    
    const template = db.s1_phrase || 'Mitigar {{dores}} para viabilizar {{necessidades}}.';
    
    const vars = {
        'processo': db.processName,
        'dores': dores.join(', '),
        'necessidades': necs.join(', '),
        'objetivos': db.sec1.filter(x => x.cat === 'OBJ').map(x => x.val).join(', '),
        'forças': db.sec2.filter(x => x.cat === 'S').map(x => x.val).join(', '),
        'fraquezas': db.sec2.filter(x => x.cat === 'W').map(x => x.val).join(', '),
        'oportunidades': db.sec2.filter(x => x.cat === 'O').map(x => x.val).join(', '),
        'ameaças': db.sec2.filter(x => x.cat === 'T').map(x => x.val).join(', '),
        'donos': db.sec2.filter(x => x.cat === 'DONO').map(x => x.val).join(', '),
        'gestores': db.sec2.filter(x => x.cat === 'GEST').map(x => x.val).join(', '),
        'facilitadores': db.sec2.filter(x => x.cat === 'FACIL').map(x => x.val).join(', '),
        'executores': db.sec2.filter(x => x.cat === 'EXEC').map(x => x.val).join(', '),
        'tic': db.sec2.filter(x => x.cat === 'TIC').map(x => x.val).join(', '),
        'kpis': db.sec4.filter(x => x.cat === 'KPI').map(x => x.val).join(', '),
        'kris': db.sec4.filter(x => x.cat === 'KRI').map(x => x.val).join(', '),
        'artefatos': db.sec5.filter(x => x.cat === 'ART').map(x => x.val).join(', '),
        'resultados': db.sec5.filter(x => x.cat === 'RES').map(x => x.val).join(', ')
    };

    let processedPhrase = template;
    Object.keys(vars).forEach(k => {
        processedPhrase = processedPhrase.replace(new RegExp(`\\{\\{${k}\\}\\}`, 'gi'), `<b style="color:var(--dark-accent)">${vars[k] || '...'}</b>`);
    });

    propBox.className = 'value-prop-box hover-trigger';
    propBox.style.display = 'block'; 
    propBox.innerHTML = processedPhrase + `
        <div class="no-print hover-target">
            <span style="cursor:pointer; color:#0284c7;" onclick="editS1Phrase()" title="Editar">✎</span>
        </div>`;
    
    const phraseInput = document.getElementById('s1_custom_phrase');
    if (phraseInput) phraseInput.value = template;

    // SEÇÃO 2 (Agrupada)
    const dispStkMain = document.getElementById('disp_stk_main');
    const dispStkSimple = document.getElementById('disp_stk_simple');
    const dispStkFacil = document.getElementById('disp_stk_facil');
    if(dispStkMain) dispStkMain.innerHTML = '';
    if(dispStkSimple) dispStkSimple.innerHTML = '';
    if(dispStkFacil) dispStkFacil.innerHTML = '';
    
    const stkLabels = { 'DONO': 'Dono(s)', 'GEST': 'Gestor(es)', 'TIC': 'Membro(s) de TIC', 'EXEC': 'Executor(es)' };

    function renderStkCat(cat) {
        const items = db.sec2.filter(it => it.cat === cat);
        if (items.length === 0) return '';
        let html = `<div>
            <div style="font-size: 0.65rem; color: #64748b; font-weight: 700; text-transform: uppercase; margin-bottom: 6px;">${stkLabels[cat]}</div>
            <div style="display: flex; flex-wrap: wrap; gap: 6px;">`;
        html += items.map(it => makeBadge(it, 'sec2', 's0', STK_MAP[it.cat])).join('');
        html += `</div></div>`;
        return html;
    }

    if (dispStkSimple) {
        let simpleHtml = '';
        ['DONO', 'GEST', 'TIC', 'EXEC'].forEach(cat => {
            const items = db.sec2.filter(it => it.cat === cat);
            simpleHtml += items.map(it => makeBadge(it, 'sec2', 's0', STK_MAP[it.cat])).join('');
        });
        dispStkSimple.innerHTML = simpleHtml;
    }

    if (dispStkMain) {
        const col1 = [renderStkCat('DONO'), renderStkCat('TIC')].filter(Boolean).join('<div style="margin-top:12px"></div>');
        const col2 = renderStkCat('GEST');
        const col3 = renderStkCat('EXEC');
        if (col1 || col2 || col3) {
            dispStkMain.innerHTML = `
                <div style="display: flex; flex-direction: column; padding-right: 15px;">${col1}</div>
                <div style="display: flex; flex-direction: column; border-left: 1px dashed #cbd5e1; border-right: 1px dashed #cbd5e1; padding: 0 15px;">${col2}</div>
                <div style="display: flex; flex-direction: column; padding-left: 15px;">${col3}</div>
            `;
        }
    }

    const facilItems = db.sec2.filter(it => it.cat === 'FACIL');
    if (dispStkFacil) {
        let html = facilItems.map(it => makeBadge(it, 'sec2', 's0', STK_MAP[it.cat])).join('');
        dispStkFacil.innerHTML = html || '<span class="empty-msg" style="text-transform:lowercase">não definido</span>';
    }

    db.sec2.filter(it => ['S','W','O','T'].includes(it.cat)).forEach(it => {
        document.getElementById('disp_swot_'+it.cat.toLowerCase()).innerHTML += makeCard(it, 'sec2', 's2');
    });

    let htmlSwotTable = `<table class="actions-table"><thead><tr><th>Categoria</th><th>Ambiente</th><th>Descrição</th><th class="no-print">Ações</th></tr></thead><tbody>`;
    const swotItems = db.sec2.filter(it => ['S','W','O','T'].includes(it.cat));
    
    if (swotItems.length === 0) {
        htmlSwotTable += `<tr><td colspan="4" class="empty-state" style="text-align:center">Sem itens SWOT cadastrados</td></tr>`;
    } else {
        const swotMap = { 'S': {n: 'Força', t: 'Interno'}, 'W': {n: 'Fraqueza', t: 'Interno'}, 'O': {n: 'Oportunidade', t: 'Externo'}, 'T': {n: 'Ameaça', t: 'Externo'} };
        swotItems.forEach((it) => {
            const idx = db.sec2.indexOf(it);
            const isEditing = (editState['s2'] === idx);
            const editClass = isEditing ? 'editing-card' : '';
            htmlSwotTable += `<tr class="${editClass}">
                <td><b>${swotMap[it.cat].n}</b></td>
                <td><span style="font-size:0.7rem; color:#64748b; font-weight:bold">${swotMap[it.cat].t}</span></td>
                <td>${it.val}</td>
                <td class="no-print">
                    <span style="cursor:pointer; color:#0284c7; margin-right:10px;" onclick="editItem('sec2',${idx},'s2')" title="Editar">✎</span>
                    <span style="cursor:pointer; color:red;" onclick="remove('sec2',${idx})" title="Excluir">✕</span>
                </td>
            </tr>`;
        });
    }
    htmlSwotTable += `</tbody></table>`;
    const dispSwotTable = document.getElementById('disp_swot_table');
    if (dispSwotTable) dispSwotTable.innerHTML = htmlSwotTable;

    // SEÇÃO 3 (Agrupada)
    const dispSec3 = document.getElementById('disp_s3_dynamic');
    dispSec3.innerHTML = '';

    const btnCat = document.getElementById('btn-s3-cat');
    const btnType = document.getElementById('btn-s3-type');
    if (btnCat && btnType) {
        btnCat.classList.toggle('active', currentS3View === 'category');
        btnType.classList.toggle('active', currentS3View === 'type');
    }

    let sec3Html = `<div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 15px; width: 100%;">`;

    if (currentS3View === 'category') {
        [...new Set(db.sec3.map(it => it.cat))].forEach(c => {
            const items = db.sec3.filter(it => it.cat === c);
            const inItems = items.filter(it => it.type === 'SCOPE' && it.scope === 'IN');
            const outItems = items.filter(it => it.type === 'SCOPE' && it.scope === 'OUT');
            const resItems = items.filter(it => it.type === 'RES');

            let cardHtml = `<div class="t-step" style="border-top: 6px solid var(--primary); display: flex; flex-direction: column; justify-content: flex-start; text-align: left; padding: 15px; background: #fff; box-shadow: 0 1px 3px rgba(0,0,0,0.05); margin: 0;">
                <strong style="margin-bottom: 12px; font-size: 1rem; color: var(--dark-accent); border-bottom: 1px solid var(--border-color); padding-bottom: 8px;">${CAT_MAP[c]||c}</strong>
                <div style="display: flex; flex-direction: column; gap: 12px;">`;

            if (inItems.length > 0) {
                cardHtml += `<div>
                    <div style="font-size: 0.7rem; color: #64748b; font-weight: 700; text-transform: uppercase; margin-bottom: 6px; border-bottom: 1px dashed #cbd5e1; padding-bottom: 4px;">✅ Inclusões</div>
                    <div style="display: flex; flex-wrap: wrap; gap: 6px; padding: 0 10px;">${inItems.map(it => makeBadge(it, 'sec3', 's3')).join('')}</div>
                </div>`;
            }
            if (outItems.length > 0) {
                cardHtml += `<div>
                    <div style="font-size: 0.7rem; color: #64748b; font-weight: 700; text-transform: uppercase; margin-bottom: 6px; border-bottom: 1px dashed #cbd5e1; padding-bottom: 4px;">❌ Exclusões</div>
                    <div style="display: flex; flex-wrap: wrap; gap: 6px; padding: 0 10px;">${outItems.map(it => makeBadge(it, 'sec3', 's3')).join('')}</div>
                </div>`;
            }
            if (resItems.length > 0) {
                cardHtml += `<div>
                    <div style="font-size: 0.7rem; color: #64748b; font-weight: 700; text-transform: uppercase; margin-bottom: 6px; border-bottom: 1px dashed #cbd5e1; padding-bottom: 4px;">🛠️ Recursos</div>
                    <div style="display: flex; flex-wrap: wrap; gap: 6px; padding: 0 10px;">${resItems.map(it => makeBadge(it, 'sec3', 's3')).join('')}</div>
                </div>`;
            }

            cardHtml += `</div></div>`;
            sec3Html += cardHtml;
        });
    } else {
        const types = [
            { id: 'IN', title: '✅ Inclusões', border: '#10b981', filter: it => it.type === 'SCOPE' && it.scope === 'IN' },
            { id: 'OUT', title: '❌ Exclusões', border: '#ef4444', filter: it => it.type === 'SCOPE' && it.scope === 'OUT' },
            { id: 'RES', title: '🛠️ Recursos', border: '#f59e0b', filter: it => it.type === 'RES' }
        ];
        types.forEach(t => {
            const itemsOfType = db.sec3.filter(t.filter);
            if (itemsOfType.length === 0) return;
            
            let cardHtml = `<div class="t-step" style="border-top: 6px solid ${t.border}; display: flex; flex-direction: column; justify-content: flex-start; text-align: left; padding: 15px; background: #fff; box-shadow: 0 1px 3px rgba(0,0,0,0.05); margin: 0;">
                <strong style="margin-bottom: 12px; font-size: 1rem; color: var(--dark-accent); border-bottom: 1px solid var(--border-color); padding-bottom: 8px;">${t.title}</strong>
                <div style="display: flex; flex-direction: column; gap: 12px;">`;

            [...new Set(itemsOfType.map(it => it.cat))].forEach(c => {
                const itemsOfCat = itemsOfType.filter(it => it.cat === c);
                cardHtml += `<div>
                    <div style="font-size: 0.7rem; color: #64748b; font-weight: 700; text-transform: uppercase; margin-bottom: 6px; border-bottom: 1px dashed #cbd5e1; padding-bottom: 4px;">${CAT_MAP[c]||c}</div>
                    <div style="display: flex; flex-wrap: wrap; gap: 6px; padding: 0 10px;">${itemsOfCat.map(it => makeBadge(it, 'sec3', 's3')).join('')}</div>
                </div>`;
            });

            cardHtml += `</div></div>`;
            sec3Html += cardHtml;
        });
    }

    sec3Html += `</div>`;
    
    if (db.sec3.length === 0) {
        dispSec3.innerHTML = '<div class="empty-msg" style="padding:15px">sem dados cadastrados</div>';
    } else {
        dispSec3.innerHTML = sec3Html;
    }

    // SEÇÃO 4
    db.sec4.forEach((it, i) => {
        const uni = it.uni ? ` (${it.uni})` : '';
        const isEditing = (editState['s4'] === i);
        const editClass = isEditing ? 'editing-card' : '';
        
        if (it.cat === 'INT' || (it.cat === 'KRI' && it.isCritical)) {
            const metaHtml = it.meta ? `<span style="color:#64748b; font-weight:bold; font-size:0.75rem; text-align:center;">Meta:<br/>${it.meta}${uni}</span>` : '';
            document.getElementById('disp_int').innerHTML += `
                <div class="hover-trigger ${editClass}" style="padding:4px; border-bottom:1px solid #fee2e2; display:flex; justify-content:space-between; align-items:center; gap:10px;">
                    <span style="flex:1;">🚫 ${it.val}</span> 
                    ${metaHtml}
                    <div class="no-print hover-target" style="top: 50%; transform: translateY(-50%);">
                        <span class="no-print" style="cursor:pointer; color:#0284c7; font-size:0.8rem;" onclick="editItem('sec4',${i},'s4')" title="Editar">✎</span>
                        <span class="no-print" style="cursor:pointer; color:red; font-size:0.8rem;" onclick="remove('sec4',${i})" title="Excluir">✕</span>
                    </div>
                </div>`;
        } else {
            let details = '';
            if (it.cur) details += `Atual: ${it.cur}`;
            const minMax = [];
            if (it.min) minMax.push(`Mín: ${it.min}`);
            if (it.max) minMax.push(`Máx: ${it.max}`);
            if (minMax.length > 0) {
                if (details) details += '<br>';
                details += minMax.join(' | ');
            }
            const metaHtml = it.meta ? `<div style="background: #e0f2fe; color: #0284c7; padding: 4px 8px; border-radius: 4px; font-weight: 700; font-size: 0.75rem; text-align: center; white-space: nowrap;">Meta:<br/> ${it.meta}</div>` : '';
            
            document.getElementById(it.cat==='KPI'?'disp_s4_kpi':'disp_s4_kri').innerHTML += `
                <div class="mini-card hover-trigger ${editClass}" style="display:flex; flex-direction:column; gap:8px;">
                    <b style="line-height:1.2; word-break:break-word;">${it.val}${uni}</b>
                    <div style="display:flex; justify-content:space-between; align-items:flex-end; width:100%; min-height: 22px;">
                        <small style="color:#64748b; font-size:0.65rem; flex:1;">${details}</small>
                        ${metaHtml}
                    </div>
                    <div class="no-print hover-target">
                        <span style="cursor:pointer; color:#0284c7; font-weight:bold;" onclick="editItem('sec4',${i},'s4')" title="Editar">✎</span>
                        <span style="cursor:pointer; color:red; font-weight:bold;" onclick="remove('sec4',${i})" title="Excluir">✕</span>
                    </div>
                </div>`;
        }
    });

    // SEÇÃO 5
    db.sec5.forEach((it, i) => {
        const isEditing = (editState['s5'] === i);
        const editClass = isEditing ? 'editing-card' : '';
        if(it.cat === 'ART') document.getElementById('disp_s5_art').innerHTML += `
            <div class="artefact-card hover-trigger ${editClass}">
                <div class="artefact-icon">${it.icon||'📄'}</div>
                <div class="artefact-info" style="word-break:break-word;">${it.val}</div>
                <div class="no-print hover-target">
                    <span style="cursor:pointer; color:#0284c7;" onclick="editItem('sec5',${i},'s5')" title="Editar">✎</span>
                    <span style="cursor:pointer; color:red;" onclick="remove('sec5',${i})" title="Excluir">✕</span>
                </div>
            </div>`;
        else document.getElementById('disp_s5_res').innerHTML += makeCard(it, 'sec5', 's5');
    });

    // Mensagem de vazio global
    if(dispStkMain && dispStkMain.innerHTML==='') dispStkMain.innerHTML = '<span class="empty-msg" style="grid-column: span 3;">sem partes interessadas cadastradas</span>';
    if(dispStkSimple && dispStkSimple.innerHTML==='') dispStkSimple.innerHTML = '<span class="empty-msg">sem partes interessadas cadastradas</span>';
    if(dispSec3.innerHTML==='') dispSec3.innerHTML = '<div class="empty-msg" style="padding:15px">sem dados cadastrados</div>';
    STATIC_TARGETS.forEach(id => { const el=document.getElementById(id); if(el && el.innerHTML.trim()==='') el.innerHTML='<span class="empty-msg">sem dados cadastrados</span>'; });
    
    updateTimeline();
}

// CRONOGRAMA
function editTimeStep(idx) {
    const sectionElement = document.getElementById('sec6');
    const formBox = sectionElement.querySelector('.form-box');
    
    if (formBox) {
        formBox.style.display = 'block';
        updateSectionState(sectionElement);
    }
    
    const selectIdx = document.getElementById('t_idx');
    if (selectIdx) {
        selectIdx.value = idx;
        loadTimeData();
    }
    
    if (sectionElement) sectionElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function loadTimeData() { 
    const idx = document.getElementById('t_idx').value; 
    if (idx) {
        document.getElementById('t_i').value = db.time[idx].i; 
        document.getElementById('t_f').value = db.time[idx].f; 
    } else {
        document.getElementById('t_i').value = ''; 
        document.getElementById('t_f').value = ''; 
    }
    updateTimeline(); 
}
function saveTimeStep() { 
    const idx = document.getElementById('t_idx').value; 
    if (!idx) { showToast("Selecione uma etapa para salvar.", "error"); return; }
    const startStr = document.getElementById('t_i').value; 
    const endStr = document.getElementById('t_f').value; 
    
    if (startStr && endStr) {
        if (new Date(endStr) <= new Date(startStr)) {
            showToast("A data de 'Fim' deve ser estritamente maior que a data de 'Início'.", "error");
            return;
        }
    }
    
    db.time[idx].i = startStr; 
    db.time[idx].f = endStr; 
    updateTimeline(); 
    save(); 
}
function updateTimeline() {
    let total = 0;
    let htmlTimeline = '';
    let htmlTable = `<table class="actions-table"><thead><tr><th>Etapa</th><th>Início</th><th>Fim</th><th>Duração</th><th class="no-print">Ações</th></tr></thead><tbody>`;
    const steps = ['PREPARAR', 'DESCOBRIR', 'RACIONALIZAR', 'IMPLEMENTAR', 'MONITORAR'];
    let validSteps = [];
    
    const sec6Box = document.querySelector('#sec6 .form-box');
    const isSec6Editing = sec6Box && sec6Box.style.display === 'block';
    const selectedIdx = parseInt(document.getElementById('t_idx').value) || 0;

    for(let i=1; i<=5; i++) {
        const d = db.time[i];
        const dateEl = document.getElementById('td'+i);
        const durEl = document.getElementById('tr'+i);
        
        const tStepCard = dateEl ? dateEl.closest('.t-step') : null;
        if (tStepCard) {
            if (isSec6Editing && selectedIdx === i) {
                tStepCard.classList.add('editing-card');
            } else {
                tStepCard.classList.remove('editing-card');
            }
        }
        
        if(d.i && d.f) {
            const s = new Date(d.i + 'T00:00:00');
            const e = new Date(d.f + 'T00:00:00');
            const diff = Math.ceil((e - s)/86400000) + 1;
            dateEl.innerText = `${d.i.split('-').reverse().join('/')} - ${d.f.split('-').reverse().join('/')}`;
            if(i < 5) { durEl.innerText = diff + 'd'; total += diff; }
            else durEl.innerText = 'CONTÍNUO';
            validSteps.push({i, name: steps[i-1], start: d.i, end: d.f, diff: diff});
        } else { dateEl.innerText = '-'; durEl.innerText = (i===5) ? 'CONTÍNUO' : '0d'; }
    }
    document.getElementById('total_init').innerText = total;
    
    if (validSteps.length === 0) {
        htmlTimeline = '<div class="empty-state">Sem dados de cronograma preenchidos</div>';
        htmlTable += `<tr><td colspan="5" class="empty-state" style="text-align:center">Sem dados de cronograma preenchidos</td></tr>`;
    } else {
        validSteps.forEach((step, index) => {
            const startStr = step.start.split('-').reverse().join('/');
            const endStr = step.end.split('-').reverse().join('/');
            const dur = (step.i === 5) ? 'CONTÍNUO' : `${step.diff} dias`;
            const isBound = (index === 0 || index === validSteps.length - 1);

            const isEditingThis = isSec6Editing && selectedIdx === step.i;
            const timelineCardClass = isEditingThis ? 'editing-timeline-card' : '';
            const tableRowClass = isEditingThis ? 'editing-table-row' : '';

            htmlTimeline += `
            <div class="tm-item">
                <div class="tm-left">
                    <span class="tm-date ${isBound ? 'bound' : 'regular'}">${startStr}</span>
                    <span class="tm-tag">Início</span>
                </div>
                <div class="tm-center"></div>
                <div class="marker ${isBound ? (index === 0 ? 'start' : 'end') : 'mid'}"></div>
                <div class="tm-right">
                    <div class="timeline-card hover-trigger ${timelineCardClass}" style="border-left: 6px solid var(--dark-accent);">
                        <span class="card-title">0${step.i} - ${step.name}</span>
                        <div class="card-content">
                            <b>Fim previsto:</b> ${endStr}<br>
                            <b>Duração:</b> ${dur}
                        </div>
                        <div class="no-print hover-target">
                            <span style="cursor:pointer; color:#0284c7; font-size: 1.1rem;" onclick="editTimeStep(${step.i})" title="Editar">✎</span>
                        </div>
                    </div>
                </div>
            </div>`;

            // Injeta o separador vazio entre os itens
            if (index !== validSteps.length - 1) {
                htmlTimeline += `
                <div class="tm-item no-print" style="min-height: 30px; padding: 0;">
                    <div class="tm-left" style="border-bottom: 2px dotted var(--border-color); height: 15px; margin-bottom: 15px; margin-left: 30px;"></div>
                    <div class="tm-center"></div>
                    <div class="tm-right" style="border-bottom: 2px dotted var(--border-color); height: 15px; margin-bottom: 15px; margin-right: 30px;"></div>
                </div>`;
            }

            htmlTable += `<tr class="${tableRowClass}">
                <td><b>0${step.i} - ${step.name}</b></td>
                <td>${startStr}</td>
                <td>${endStr}</td>
                <td>${dur}</td>
                <td class="no-print">
                    <span style="cursor:pointer; color:#0284c7; font-size: 1rem;" onclick="editTimeStep(${step.i})" title="Editar">✎</span>
                </td>
            </tr>`;
        });
    }
    htmlTable += `</tbody></table>`;
    
    const dispTimeline = document.getElementById('disp_time_timeline');
    if (dispTimeline) dispTimeline.innerHTML = htmlTimeline;
    const dispTable = document.getElementById('disp_time_table');
    if (dispTable) dispTable.innerHTML = htmlTable;
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

// Fecha o dropdown se o usuário clicar fora dele
window.onclick = function(event) {
  if (!event.target.matches('.dropdown .btn-main')) {
    document.querySelectorAll('.dropdown.show').forEach(d => d.classList.remove('show'));
  }
}

function save() { localStorage.setItem('pdrim_prep_v10_9', JSON.stringify(db)); localStorage.setItem('pdrim_exported', 'false'); updateBreadcrumbs(); }
function exportJSON() { const a=document.createElement('a'); a.href=URL.createObjectURL(new Blob([JSON.stringify(db,null,2)],{type:'application/json'})); a.download=`pdrim_preparar_${new Date().toISOString().slice(0,10)}.json`; a.click(); localStorage.setItem('pdrim_exported', 'true'); }
function importJSON(e) { const f=e.target.files[0]; if(!f)return; const r=new FileReader(); r.onload=(ev)=>{try{db=JSON.parse(ev.target.result); render(); save(); showToast("Arquivo importado com sucesso!", "success");}catch(err){showToast("Erro ao importar o arquivo.", "error");}}; r.readAsText(f); e.target.value=''; }
function zerarArtefato() {
    if (confirm("Tem certeza que deseja apagar TODOS os dados preenchidos neste Canvas? Esta ação não pode ser desfeita.")) {
        db = { sec1: [], sec2: [], sec3: [], sec4: [], sec5: [], time: { 1:{i:'',f:''}, 2:{i:'',f:''}, 3:{i:'',f:''}, 4:{i:'',f:''}, 5:{i:'',f:''} }, processName: '', s1_phrase: 'Mitigar {{dores}} para viabilizar {{necessidades}}.' };
        editState = { s0: -1, s1: -1, s2: -1, s3: -1, s4: -1, s5: -1 };
        document.querySelectorAll('.form-box').forEach(box => box.style.display = 'none');
        document.querySelectorAll('.section').forEach(sec => updateSectionState(sec));
        save();
        render();
        showToast("Artefato zerado com sucesso!", "success");
    }
}

function printPage() {
    let detailsWereClosed = false;
    if (!stkDetailsOpen) {
        toggleStkDetails();
        detailsWereClosed = true;
    }

    const a = document.querySelector('.preparar-wrapper'); 
    if (a) a.classList.add('pdf-mode'); 

    const originalTitle = document.title;
    document.title = "pdrim_preparar";

    showToast("Preparando impressão / PDF...", "info");

    // Aguarda o Toast renderizar e os estilos aplicarem antes de congelar a tela com o window.print
    setTimeout(() => {
        window.print();

        document.title = originalTitle;
        if (a) a.classList.remove('pdf-mode'); 
        
        if (detailsWereClosed) toggleStkDetails();
    }, 500);
}