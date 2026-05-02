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

const categories = { 'Capacitação': 'var(--color-capacitacao)', 'Gestão da Mudança': 'var(--color-mudanca)', 'Tecnologia': 'var(--color-tecnologia)', 'Implantação': 'var(--color-implantacao)', 'Definição de Riscos': 'var(--color-riscos)', 'Tratamento de Riscos': 'var(--color-riscos)', 'Metas e Indicadores': 'var(--color-metas)' };

let flatActions = [];
let currentView = 'timeline';
let currentSortCol = 'start';
let currentSortDir = 'asc';

function initUI() {
    const legend = document.getElementById('legend');
    const filter = document.getElementById('filter');
    legend.innerHTML = '';
    Object.keys(categories).forEach(c => {
        legend.innerHTML += `<div class="legend-item"><div class="color-box" style="background:${categories[c]}"></div> ${c}</div>`;
        const opt = document.createElement('option'); opt.value = c; opt.innerText = c; filter.appendChild(opt);
    });
}

function openNewForm() { resetForm(); document.getElementById('formTitle').innerText = 'Nova Ação'; document.getElementById('formContainer').style.display = 'block'; window.scrollTo(0,0); }
function resetForm() { document.getElementById('formContainer').style.display = 'none'; document.getElementById('pdrimForm').reset(); document.getElementById('editId').value = ''; quill.setContents([]); }

function editAction(id) {
    const action = flatActions.find(a => a.id == id);
    if (!action) return;

    const startAction = flatActions.find(a => a.id === id && (a.label === 'Início' || a.label === 'Evento Único'));
    const endAction = flatActions.find(a => a.id === id && a.label === 'Fim');

    document.getElementById('editId').value = action.id;
    document.getElementById('title').value = action.title;
    document.getElementById('cat').value = action.cat;
    document.getElementById('start').value = startAction.date;
    document.getElementById('end').value = endAction ? endAction.date : startAction.date;
    quill.root.innerHTML = action.desc;
    document.getElementById('formTitle').innerText = 'Editar Ação';
    document.getElementById('formContainer').style.display = 'block';
    window.scrollTo(0,0);
}

document.getElementById('pdrimForm').addEventListener('submit', function(e) {
    e.preventDefault();
    const editId = document.getElementById('editId').value;
    const common = { id: editId ? parseInt(editId) : Date.now(), title: document.getElementById('title').value, cat: document.getElementById('cat').value, desc: quill.root.innerHTML, status: 'pendente' };
    if(editId) flatActions = flatActions.filter(a => a.id != editId);
    const s = document.getElementById('start').value;
    const en = document.getElementById('end').value;
    if(s === en) flatActions.push({...common, date: s, label: 'Evento Único'});
    else { flatActions.push({...common, date: s, label: 'Início'}); flatActions.push({...common, date: en, label: 'Fim'}); }
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

    if (!isDeleteMode) render();
}

function selectAll(check) { document.querySelectorAll('.delete-checkbox').forEach(cb => { cb.checked = check; handleCheckboxChange(cb); }); }

// LÓGICA DE SINCRONIA NA EXCLUSÃO
function handleCheckboxChange(cb) {
    const actionId = cb.value;
    const isChecked = cb.checked;

    // Sincroniza todos os checkboxes com o mesmo Action ID
    document.querySelectorAll(`.delete-checkbox[value="${actionId}"]`).forEach(input => {
        input.checked = isChecked;
        const card = document.getElementById(`card-${input.getAttribute('data-index')}`);
        if (card) card.classList.toggle('selected-to-delete', isChecked);
    });

    // Estiliza linha da tabela
    const row = document.getElementById(`row-${actionId}`);
    if (row) row.classList.toggle('selected-to-delete', isChecked);
}

function confirmBulkDelete() {
    const selected = Array.from(document.querySelectorAll('.delete-checkbox:checked')).map(cb => parseInt(cb.value));
    if (selected.length === 0) return alert("Selecione uma ação.");
    if (confirm(`Excluir permanentemente ${new Set(selected).size} ações?`)) {
        flatActions = flatActions.filter(a => !selected.includes(a.id));
        toggleDeleteMode(); render();
    }
}

function render() {
    const fVal = document.getElementById('filter').value;
    const filtered = flatActions.filter(a => fVal === 'all' || a.cat === fVal);

    if (currentView === 'timeline') {
        renderTimeline(filtered);
    } else {
        renderTable(filtered);
    }
}

function renderTimeline(data) {
    const root = document.getElementById('timeline-root');
    root.innerHTML = '';
    const sorted = data.sort((a, b) => new Date(a.date) - new Date(b.date));

    if (sorted.length === 0) {
        root.innerHTML = '<div class="empty-state">Sem ações cadastradas</div>';
        return;
    }

    sorted.forEach((ev, index) => {
        const isBound = (index === 0 || index === sorted.length - 1);
        const dStr = ev.date.split('-').reverse().join('/');
        root.insertAdjacentHTML('beforeend', `
            <div class="tm-item">
                <div class="tm-left">
                    <input type="checkbox" class="delete-checkbox" value="${ev.id}" data-index="${index}" onchange="handleCheckboxChange(this)">
                    <span class="tm-date ${isBound ? 'bound' : 'regular'}">${dStr}</span>
                    <span class="tm-tag">${ev.label}</span>
                </div>
                <div class="tm-center"></div>
                <div class="marker ${isBound ? (index === 0 ? 'start' : 'end') : 'mid'}"></div>
                <div class="tm-right ${isBound ? 'no-indent' : 'indent-right'}">
                    <div class="timeline-card ${ev.status}" id="card-${index}" style="background: ${categories[ev.cat]}">
                        <div class="card-header" style="display: none;">${ev.cat}</div>
                        <div class="card-actions">
                            <button class="btn-edit-action" onclick="editAction(${ev.id})">EDITAR</button>
                            <div class="status-tag tag-${ev.status}" title="Alterar status" onclick="showStatusSelect(${ev.id},'${ev.date}', '${index}', '${ev.status}')">
                                ${ev.status}
                                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>
                            </div>
                        </div>
                        <span class="card-title">${ev.title}</span>
                        <div class="card-content">${ev.desc}</div>
                        <button class="btn-more" onclick="this.previousElementSibling.classList.toggle('expanded'); this.innerText = this.innerText === 'Ver mais' ? 'Ver menos' : 'Ver mais';">Ver mais</button>
                    </div>
                </div>
            </div>
        `);
    });

    setTimeout(() => {
        document.querySelectorAll('.card-content').forEach(c => {
            if (c.scrollHeight > c.clientHeight + 2) c.nextElementSibling.style.display = 'block';
            else c.nextElementSibling.style.display = 'none';
        });
    }, 150);
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
    root.innerHTML = '';
    const uniqueActions = getUniqueActions(data);

    if (uniqueActions.length === 0) {
        root.innerHTML = '<tr><td colspan="7" class="empty-state">Sem ações cadastradas</td></tr>';
        return;
    }

    // Aplica a ordenação atualizada
    uniqueActions.sort((a, b) => {
        let valA, valB;
        switch(currentSortCol) {
            case 'title': valA = a.title.toLowerCase(); valB = b.title.toLowerCase(); break;
            case 'cat': valA = a.cat.toLowerCase(); valB = b.cat.toLowerCase(); break;
            case 'start': valA = new Date(a.startDate).getTime(); valB = new Date(b.startDate).getTime(); break;
            case 'end': valA = new Date(a.endDate).getTime(); valB = new Date(b.endDate).getTime(); break;
            case 'status': valA = a.status.toLowerCase(); valB = b.status.toLowerCase(); break;
            default: valA = new Date(a.startDate).getTime(); valB = new Date(b.startDate).getTime();
        }
        
        // Correção de ordenação para strings e números
        if (valA < valB) return currentSortDir === 'asc' ? -1 : 1;
        if (valA > valB) return currentSortDir === 'asc' ? 1 : -1;
        return 0;
    });

    uniqueActions.forEach(action => {
        const startStr = action.startDate.split('-').reverse().join('/');
        const endStr = action.endDate.split('-').reverse().join('/');
        root.insertAdjacentHTML('beforeend', `
            <tr class="action-row ${action.status}" id="row-${action.id}">
                <td><input type="checkbox" class="delete-checkbox" value="${action.id}" onchange="handleCheckboxChange(this)"></td>
                <td>${action.title}</td>
                <td>${action.cat}</td>
                <td>${startStr}</td>
                <td>${endStr}</td>
                <td>
                    <div class="status-tag tag-${action.status}" title="Alterar status" onclick="showStatusSelectInTable(${action.id}, '${action.status}', this)">
                        ${action.status}
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>
                    </div>
                </td>
                <td>
                    <button class="btn-edit-action" onclick="editAction(${action.id})">EDITAR</button>
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
    sel.onchange = () => { flatActions.forEach(a => { if (a.id == id) a.status = sel.value; }); render(); };
    sel.onblur = () => render();
    element.style.display = 'none'; 
    element.parentElement.appendChild(sel); 
    setTimeout(() => sel.focus(), 10);
}

function showStatusSelect(id, date, index, cur) {
    const card = document.getElementById(`card-${index}`);
    const sel = document.createElement('select'); sel.className = 'status-select-inline';
    ['pendente', 'andamento', 'realizado'].forEach(o => { const op = document.createElement('option'); op.value = o; op.text = o.toUpperCase(); if(o===cur) op.selected = true; sel.add(op); });
    sel.onchange = () => { flatActions.forEach(a => { if (a.id == id) a.status = sel.value; }); render(); };
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
    document.getElementById('timeline-view').style.display = view === 'timeline' ? 'block' : 'none';
    document.getElementById('table-view').style.display = view === 'table' ? 'block' : 'none';

    document.getElementById('btn-view-timeline').classList.toggle('active', view === 'timeline');
    document.getElementById('btn-view-table').classList.toggle('active', view === 'table');
    render();
}

// Fecha o dropdown se o usuário clicar fora dele
window.onclick = function(event) {
  if (!event.target.matches('.dropdown .btn-main')) {
    document.querySelectorAll('.dropdown.show').forEach(d => d.classList.remove('show'));
  }
}

function importJSON(fileInput) {
    if (!fileInput.files.length) return;
    const reader = new FileReader();
    reader.onload = (e) => { try { flatActions = JSON.parse(e.target.result); render(); fileInput.value = ''; } catch (err) { alert("Arquivo JSON Inválido."); } };
    reader.readAsText(fileInput.files[0]);
}

function exportJSON() {
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([JSON.stringify(flatActions)], {type: "application/json"})); a.download = "pdrim_racionalizar.json"; a.click();
}

async function savePDF() { 
    const a = document.getElementById('capture-area'); a.classList.add('pdf-mode'); 
    const c = await html2canvas(a, {scale:2, useCORS: true}); 
    const p = new jspdf.jsPDF('p','mm','a4'); 
    p.addImage(c.toDataURL('image/png'), 'PNG', 0,0,210, (c.height*210)/c.width); 
    p.save("pdrim_racionalizar.pdf"); a.classList.remove('pdf-mode'); 
}

initUI(); render();