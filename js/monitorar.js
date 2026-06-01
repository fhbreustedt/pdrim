let dbMon = {
    config: {},
    data: {
        logs: [],
        instances: {},
        descActivities: [],
        descRisks: []
    }
};

let charts = {};
let isDragMode = false;

document.addEventListener('DOMContentLoaded', () => {
    initMonitorarUI();
});

document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        const customChartModal = document.getElementById('customChartModalOverlay');
        if (customChartModal && customChartModal.style.display === 'flex') {
            closeCustomChartModal();
            return;
        }
        const widgetModal = document.getElementById('widgetModalOverlay');
        if (widgetModal && widgetModal.style.display === 'flex') {
            toggleWidgetModal();
            return;
        }
    }
});

function initMonitorarUI() {
    console.log("Módulo Monitorar inicializado.");

    if(localStorage.getItem('pdrim_mon_v10_9')) {
        try {
            const stored = JSON.parse(localStorage.getItem('pdrim_mon_v10_9'));
            if (stored.data) {
                dbMon = stored;
            }
        } catch(e) {}
    } else {
        refreshData(); 
    }

    if (!dbMon.config) dbMon.config = {};
    if (dbMon.config.dateFilter) {
        const filterEl = document.getElementById('dash-filter-date');
        if (filterEl) filterEl.value = dbMon.config.dateFilter;
    }

    updateBreadcrumbs();
    updateHeaderInitiative();
    
    restoreWidgetOrder();
    initDragAndDrop();
    renderDashboard();
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
            } else if (index === 4) {
                try { const parsed = JSON.parse(data); if (parsed.data && parsed.data.logs.length > 0) hasData = true; } catch(e) {}
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

function refreshData() {
    let logs = [];
    let instances = {};
    let descActivities = [];
    let descRisks = [];

    const impStored = localStorage.getItem('pdrim_imp_v10_9');
    if (impStored) {
        try {
            const parsed = JSON.parse(impStored);
            if (Array.isArray(parsed)) { logs = parsed; }
            else { logs = parsed.logs || []; instances = parsed.instances || {}; }
        } catch(e) {}
    }

    const descStored = localStorage.getItem('pdrim_desc_v10_9');
    if (descStored) {
        try {
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
        } catch(e) {}
    }

    dbMon.data = { logs, instances, descActivities, descRisks };
    saveMonitorar();
    renderDashboard();
    showToast("Dados atualizados com sucesso da base local.", "success");
}

function saveMonitorar() {
    localStorage.setItem('pdrim_mon_v10_9', JSON.stringify(dbMon));
    localStorage.setItem('pdrim_exported', 'false');
    updateBreadcrumbs();
}

function saveWidgetOrder() {
    const order = {};
    const containers = document.querySelectorAll('.dash-col, .dashboard-bottom');
    containers.forEach(container => {
        const widgetIds = [...container.querySelectorAll('.dash-widget')].map(w => w.id);
        if (container.id) {
            order[container.id] = widgetIds;
        }
    });
    dbMon.config.widgetOrder = order;
    saveMonitorar();
}

function restoreWidgetOrder() {
    const order = dbMon.config.widgetOrder;
    if (!order) return;
    
    for (const [containerId, widgetIds] of Object.entries(order)) {
        const container = document.getElementById(containerId);
        if (container) {
            widgetIds.forEach(widgetId => {
                const widget = document.getElementById(widgetId);
                if (widget) {
                    container.appendChild(widget);
                    if (containerId === 'col-bottom') {
                        widget.classList.add('dash-half');
                    } else {
                        widget.classList.remove('dash-half');
                    }
                }
            });
        }
    }
}

window.toggleDragMode = function() {
    isDragMode = document.getElementById('toggle-drag-mode').checked;
    const widgets = document.querySelectorAll('.dash-widget');
    widgets.forEach(w => {
        w.setAttribute('draggable', isDragMode);
        const h4 = w.querySelector('h4');
        if (h4) {
            h4.style.cursor = isDragMode ? 'move' : 'default';
            if (isDragMode && !h4.innerHTML.includes('⠿')) {
                h4.innerHTML = '<span class="drag-handle" style="color: #cbd5e1; margin-right: 5px;">⠿</span>' + h4.innerHTML;
            } else if (!isDragMode) {
                h4.innerHTML = h4.innerHTML.replace(/<span class="drag-handle"[^>]*>⠿<\/span>/, '');
            }
        }
    });
};

function initDragAndDrop() {
    const widgets = document.querySelectorAll('.dash-widget');
    const containers = document.querySelectorAll('.dash-col, .dashboard-bottom');

    widgets.forEach(widget => {
        widget.addEventListener('dragstart', (e) => {
            if (!isDragMode) { e.preventDefault(); return; }
            widget.classList.add('dragging-widget');
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/plain', widget.id);
            widget.dataset.sourceContainer = widget.parentElement.id;
        });
        
        widget.addEventListener('dragend', () => {
            widget.classList.remove('dragging-widget');
            const parent = widget.parentElement;
            if (parent && parent.id === 'col-bottom') {
                widget.classList.add('dash-half');
            } else {
                widget.classList.remove('dash-half');
            }
            saveWidgetOrder();
        });
    });

    containers.forEach(container => {
        container.addEventListener('dragover', (e) => {
            if (!isDragMode) return;
            const draggable = document.querySelector('.dragging-widget');
            if (draggable && draggable.dataset.sourceContainer === container.id) {
                e.preventDefault();
                const afterElement = getDragAfterElement(container, e.clientX, e.clientY);
                if (afterElement == null) {
                    container.appendChild(draggable);
                } else {
                    container.insertBefore(draggable, afterElement);
                }
            }
        });
    });
}

function getDragAfterElement(container, x, y) {
    const draggableElements = [...container.querySelectorAll('.dash-widget:not(.dragging-widget)')];
    
    return draggableElements.reduce((closest, child) => {
        const box = child.getBoundingClientRect();
        let offset;
        
        if (container.id === 'col-bottom') {
            const centerX = box.left + box.width / 2;
            const centerY = box.top + box.height / 2;
            if (Math.abs(y - centerY) < box.height / 2) {
                offset = x - centerX;
            } else {
                offset = y - centerY;
            }
        } else {
            offset = y - (box.top + box.height / 2);
        }
        
        if (offset < 0 && offset > closest.offset) {
            return { offset: offset, element: child };
        } else {
            return closest;
        }
    }, { offset: Number.NEGATIVE_INFINITY }).element;
}

window.toggleWidgetModal = function() {
    const modal = document.getElementById('widgetModalOverlay');
    if (modal.style.display === 'none' || !modal.style.display) {
        const hidden = dbMon.config.hiddenWidgets || [];
        document.querySelectorAll('#widget-toggles input[type="checkbox"]:not(#toggle-alerts):not(#toggle-drag-mode)').forEach(chk => {
            chk.checked = !hidden.includes(chk.value);
        });
        document.getElementById('toggle-alerts').checked = dbMon.config.showAlerts !== false;
        document.getElementById('toggle-drag-mode').checked = isDragMode;
        renderCustomChartsList();
        modal.style.display = 'flex';
    } else {
        modal.style.display = 'none';
    }
};

window.updateWidgetConfig = function() {
    const hidden = [];
    document.querySelectorAll('#widget-toggles input').forEach(chk => {
        if (!chk.checked) hidden.push(chk.value);
    });
    dbMon.config.hiddenWidgets = hidden;
    saveMonitorar();
    applyWidgetVisibility();
};

window.toggleAlerts = function() {
    dbMon.config.showAlerts = document.getElementById('toggle-alerts').checked;
    saveMonitorar();
    renderSmartAlerts();
};

window.openCustomChartModal = function() { document.getElementById('customChartModalOverlay').style.display = 'flex'; };
window.closeCustomChartModal = function() { document.getElementById('customChartModalOverlay').style.display = 'none'; };
window.saveCustomChart = function() {
    const title = document.getElementById('cc-title').value;
    const type = document.getElementById('cc-type').value;
    const entity = document.getElementById('cc-entity').value;
    const group = document.getElementById('cc-group').value;
    if(!title) return;
    if(!dbMon.config.customCharts) dbMon.config.customCharts = [];
    const newId = 'custom-chart-' + Date.now();
    dbMon.config.customCharts.push({ id: newId, title, type, entity, group });
    saveMonitorar(); closeCustomChartModal(); renderCustomChartsList(); renderDashboard();
};
window.deleteCustomChart = function(id) {
    dbMon.config.customCharts = dbMon.config.customCharts.filter(c => c.id !== id);
    if(charts[id]) { charts[id].destroy(); delete charts[id]; }
    const el = document.getElementById(id); if(el) el.remove();
    saveMonitorar(); renderCustomChartsList(); renderDashboard();
};
window.renderCustomChartsList = function() {
    const list = document.getElementById('custom-charts-list'); if(!list) return;
    list.innerHTML = '';
    (dbMon.config.customCharts || []).forEach(c => {
        list.innerHTML += `<div style="display:flex; justify-content:space-between; background:#f8fafc; padding:8px; border:1px solid #cbd5e1; border-radius:4px;">
            <span style="font-size:0.85rem; font-weight:600;">${c.title}</span>
            <button class="btn-edit-action" style="color:#ef4444;" onclick="deleteCustomChart('${c.id}')">✕</button>
        </div>`;
    });
};

function applyWidgetVisibility() {
    const hidden = dbMon.config.hiddenWidgets || [];
    const allWidgets = ['wdg-adherence', 'wdg-leadtime', 'wdg-cycletime', 'wdg-correlation', 'wdg-heatmap', 'wdg-risktype', 'wdg-incidentstatus', 'wdg-activities', 'wdg-incidents'];
    allWidgets.forEach(w => {
        const el = document.getElementById(w);
        if(el) {
            el.style.display = hidden.includes(w) ? 'none' : 'flex';
        }
    });
}

function renderDashboard() {
    let { logs, instances, descActivities, descRisks } = dbMon.data;
    
    Object.keys(charts).forEach(key => {
        if(charts[key]) charts[key].destroy();
    });
    document.querySelectorAll('.custom-dynamic-widget').forEach(el => el.remove());

    const emptyState = document.getElementById('dashboard-empty-state');
    const dashGrid = document.querySelector('.dashboard-grid');
    const dashBottom = document.querySelector('.dashboard-bottom');
    const alertsContainer = document.getElementById('smart-alerts-container');

    if ((!logs || logs.length === 0) && (!descActivities || descActivities.length === 0) && (!descRisks || descRisks.length === 0)) {
        if (emptyState) emptyState.style.display = 'block';
        if (dashGrid) dashGrid.style.display = 'none';
        if (dashBottom) dashBottom.style.display = 'none';
        if (alertsContainer) alertsContainer.style.display = 'none';
        return;
    } else {
        if (emptyState) emptyState.style.display = 'none';
        if (dashGrid) dashGrid.style.display = '';
        if (dashBottom) dashBottom.style.display = '';
    }

    const filterEl = document.getElementById('dash-filter-date');
    const filterVal = filterEl ? filterEl.value : 'all';
    if (!dbMon.config) dbMon.config = {};
    if (dbMon.config.dateFilter !== filterVal) {
        dbMon.config.dateFilter = filterVal;
        saveMonitorar();
    }

    let logsToUse = logs;
    if (filterVal !== 'all') {
        const days = parseInt(filterVal);
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - days);
        logsToUse = logs.filter(l => new Date(l.startDate || l.date) >= cutoff);
    }

    const actsPrevistas = logsToUse.filter(l => l.type === 'atividade' && l.refId).length;
    const actsAvulsas = logsToUse.filter(l => l.type === 'atividade' && !l.refId).length;
    
    charts.adherence = new Chart(document.getElementById('chartAdherence'), {
        type: 'doughnut',
        data: {
            labels: ['Previstas', 'Avulsas'],
            datasets: [{
                data: [actsPrevistas || 0.1, actsAvulsas],
                backgroundColor: ['#22c55e', '#ef4444']
            }]
        },
        options: { plugins: { legend: { position: 'bottom' } } }
    });

    const processDurations = [];
    const instKeys = Object.keys(instances || {});
    instKeys.forEach(instId => {
        const instLogs = logsToUse.filter(l => l.instanceId === instId);
        if (instLogs.length > 0) {
            const starts = instLogs.map(l => new Date(l.startDate || l.date).getTime()).filter(t => !isNaN(t));
            const ends = instLogs.map(l => l.endDate ? new Date(l.endDate).getTime() : Date.now()).filter(t => !isNaN(t));
            if (starts.length > 0 && ends.length > 0) {
                const minStart = Math.min(...starts);
                const maxEnd = Math.max(...ends);
                const diffMs = maxEnd - minStart;
                processDurations.push({ id: instId, hours: diffMs / 3600000 });
            }
        }
    });
    processDurations.sort((a,b) => b.hours - a.hours);
    const topDurations = processDurations.slice(0, 5);

    charts.leadTime = new Chart(document.getElementById('chartLeadTime'), {
        type: 'bar',
        data: {
            labels: topDurations.map(d => d.id),
            datasets: [{ label: 'Duração (Horas)', data: topDurations.map(d => d.hours.toFixed(1)), backgroundColor: '#3b82f6' }]
        },
        options: { indexAxis: 'y', plugins: { legend: { display: false } } }
    });

    const actConcluido = logs.filter(l => l.type === 'atividade' && l.endDate).length;
    const actAndamento = logs.filter(l => l.type === 'atividade' && !l.endDate && l.startDate).length;
    const actPendente = logs.filter(l => l.type === 'atividade' && !l.endDate && !l.startDate).length;
    
    charts.activityStatus = new Chart(document.getElementById('chartActivityStatus'), {
        type: 'bar',
        data: {
            labels: ['Concluído', 'Andamento', 'Pendente'],
            datasets: [{ data: [actConcluido, actAndamento, actPendente], backgroundColor: ['#22c55e', '#f59e0b', '#94a3b8'] }]
        },
        options: { plugins: { legend: { display: false } } }
    });

    const incConcluido = logs.filter(l => l.type === 'risco' && l.endDate).length;
    const incAndamento = logs.filter(l => l.type === 'risco' && !l.endDate).length;
    
    charts.incidentStatus = new Chart(document.getElementById('chartIncidentStatus'), {
        type: 'pie',
        data: {
            labels: ['Mitigado', 'Em Tratamento'],
            datasets: [{ data: [incConcluido || 0.1, incAndamento], backgroundColor: ['#22c55e', '#ef4444'] }]
        },
        options: { plugins: { legend: { position: 'bottom' } } }
    });

    const months = {};
    logsToUse.forEach(l => {
        const dt = new Date(l.startDate || l.date);
        const mKey = `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2, '0')}`;
        if (!months[mKey]) months[mKey] = { incidents: 0, activities: 0 };
        if (l.type === 'risco') months[mKey].incidents++;
        if (l.type === 'atividade') months[mKey].activities++;
    });
    const sortedMonths = Object.keys(months).sort();
    
    charts.correlation = new Chart(document.getElementById('chartCorrelation'), {
        type: 'line',
        data: {
            labels: sortedMonths.length > 0 ? sortedMonths : ['Sem dados'],
            datasets: [
                { label: 'Atividades', data: sortedMonths.length > 0 ? sortedMonths.map(m => months[m].activities) : [0], borderColor: '#22c55e', backgroundColor: 'rgba(34, 197, 94, 0.2)', fill: true, tension: 0.4 },
                { label: 'Incidentes', data: sortedMonths.length > 0 ? sortedMonths.map(m => months[m].incidents) : [0], borderColor: '#ef4444', backgroundColor: 'rgba(239, 68, 68, 0.2)', fill: true, tension: 0.4 }
            ]
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } }
    });

    const riskMaxImpact = {};
    descRisks.forEach(r => riskMaxImpact[r.id] = 0);
    descActivities.forEach(act => {
        if (!act.noRisk && act.riskAssocs) {
            act.riskAssocs.forEach(ra => {
                if (ra.imp > (riskMaxImpact[ra.riskId] || 0)) {
                    riskMaxImpact[ra.riskId] = ra.imp;
                }
            });
        }
    });
    
    const previstosImpactCounts = { 1: 0, 2: 0, 3: 0 };
    Object.values(riskMaxImpact).forEach(imp => {
        if (imp > 0) previstosImpactCounts[imp] = (previstosImpactCounts[imp] || 0) + 1;
    });

    const manifestadosImpactCounts = { 1: 0, 2: 0, 3: 0 };
    logsToUse.filter(l => l.type === 'risco').forEach(l => {
        if (l.refId) {
            const imp = riskMaxImpact[l.refId] || 0;
            if (imp > 0) manifestadosImpactCounts[imp] = (manifestadosImpactCounts[imp] || 0) + 1;
        } else {
            manifestadosImpactCounts[2] = (manifestadosImpactCounts[2] || 0) + 1; // Avulso - Médio
        }
    });

    charts.riskType = new Chart(document.getElementById('chartRiskTypeImpact'), {
        type: 'bar',
        data: {
            labels: ['Baixo', 'Médio', 'Alto'],
            datasets: [
                { label: 'Previstos', data: [previstosImpactCounts[1], previstosImpactCounts[2], previstosImpactCounts[3]], backgroundColor: '#94a3b8' },
                { label: 'Manifestados', data: [manifestadosImpactCounts[1], manifestadosImpactCounts[2], manifestadosImpactCounts[3]], backgroundColor: '#ef4444' }
            ]
        },
        options: { plugins: { legend: { display: false } } }
    });

    renderHeatmap(descActivities);
    renderLists(logsToUse, descActivities);
    
    // Gráficos Customizados
    (dbMon.config.customCharts || []).forEach(cc => {
        const cont = document.getElementById('col-bottom');
        if(cont) {
            cont.insertAdjacentHTML('beforeend', `<div class="dash-widget dash-half custom-dynamic-widget" id="${cc.id}">
                <h4>${cc.title}</h4><canvas id="canvas-${cc.id}"></canvas></div>`);
            let labels = []; let dataPoints = [];
            let bgColors = ['#3b82f6', '#22c55e', '#ef4444', '#f59e0b', '#8b5cf6'];
            const relevantLogs = logsToUse.filter(l => l.type === cc.entity);
            
            if (cc.group === 'status') {
                labels = ['Concluído', 'Andamento', 'Pendente'];
                dataPoints = [
                    relevantLogs.filter(l => l.endDate).length,
                    relevantLogs.filter(l => !l.endDate && l.startDate).length,
                    relevantLogs.filter(l => !l.endDate && !l.startDate).length
                ];
                bgColors = ['#22c55e', '#f59e0b', '#94a3b8'];
            } else if (cc.group === 'month') {
                const months = {};
                relevantLogs.forEach(l => {
                    const dt = new Date(l.startDate || l.date);
                    const mKey = `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2, '0')}`;
                    months[mKey] = (months[mKey] || 0) + 1;
                });
                labels = Object.keys(months).sort();
                dataPoints = labels.map(m => months[m]);
            }
            
            charts[cc.id] = new Chart(document.getElementById(`canvas-${cc.id}`), {
                type: cc.type,
                data: {
                    labels: labels.length ? labels : ['Sem dados'],
                    datasets: [{ label: 'Qtd Registros', data: labels.length ? dataPoints : [0], backgroundColor: bgColors }]
                },
                options: { plugins: { legend: { display: cc.type === 'pie' || cc.type === 'doughnut' } } }
            });
        }
    });

    applyWidgetVisibility();
    if (isDragMode) toggleDragMode(); // Força a reinserção do ícone de drag
    renderSmartAlerts();
}

function renderSmartAlerts() {
    const container = document.getElementById('smart-alerts-container');
    if (!container) return;
    if (dbMon.config.showAlerts === false) { container.style.display = 'none'; return; }
    
    container.style.display = 'flex'; container.innerHTML = '';
    let { logs, instances } = dbMon.data; if (logs.length === 0) return;
    let alerts = [];
    
    const activeRisks = logs.filter(l => l.type === 'risco' && !l.endDate);
    if (activeRisks.length > 0) alerts.push({ type: 'warning', text: `Atenção: Existem ${activeRisks.length} incidentes de risco pendentes neste processo.` });
    
    const actsPrevistas = logs.filter(l => l.type === 'atividade' && l.refId).length;
    const actsAvulsas = logs.filter(l => l.type === 'atividade' && !l.refId).length;
    if (actsAvulsas > actsPrevistas && actsPrevistas > 0) alerts.push({ type: 'warning', text: `Aderência Baixa: Foram executadas mais atividades avulsas (${actsAvulsas}) do que previstas (${actsPrevistas}) no modelo padrão.` });
    else if (actsPrevistas > 0 && actsAvulsas === 0) alerts.push({ type: 'success', text: `Excelente! 100% de aderência ao fluxo padrão nas atividades executadas.` });

    const now = new Date(); const thirtyDaysAgo = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000)); const sixtyDaysAgo = new Date(now.getTime() - (60 * 24 * 60 * 60 * 1000));
    const getInstDurations = (stC, enC) => { let durs = []; Object.keys(instances || {}).forEach(instId => { const instLogs = logs.filter(l => l.instanceId === instId); if (instLogs.length > 0) { const starts = instLogs.map(l => new Date(l.startDate || l.date).getTime()).filter(t => !isNaN(t)); const ends = instLogs.map(l => l.endDate ? new Date(l.endDate).getTime() : Date.now()).filter(t => !isNaN(t)); if (starts.length > 0 && ends.length > 0) { const minStart = Math.min(...starts); const maxEnd = Math.max(...ends); if (minStart >= stC.getTime() && minStart < enC.getTime()) { durs.push(maxEnd - minStart); } } } }); return durs.length ? durs.reduce((a,b)=>a+b,0)/durs.length : null; };
    const avgRecent = getInstDurations(thirtyDaysAgo, now); const avgPast = getInstDurations(sixtyDaysAgo, thirtyDaysAgo);
    
    if (avgRecent !== null && avgPast !== null) {
        if (avgRecent < avgPast) alerts.push({ type: 'success', text: `O Lead Time médio das instâncias reduziu em ${Math.round(((avgPast - avgRecent) / avgPast) * 100)}% nos últimos 30 dias!` });
        else if (avgRecent > avgPast) alerts.push({ type: 'info', text: `O Lead Time médio aumentou em ${Math.round(((avgRecent - avgPast) / avgPast) * 100)}% nos últimos 30 dias em comparação ao período anterior.` });
    }
    
    alerts.forEach(al => {
        let color = '#3b82f6'; let bg = '#eff6ff'; let border = '#bfdbfe'; let icon = 'ℹ️';
        if(al.type === 'warning') { color = '#b45309'; bg = '#fffbeb'; border = '#fde68a'; icon = '⚠️'; }
        if(al.type === 'success') { color = '#15803d'; bg = '#f0fdf4'; border = '#bbf7d0'; icon = '✅'; }
        container.innerHTML += `<div style="background:${bg}; border:1px solid ${border}; color:${color}; padding:10px 15px; border-radius:6px; font-size:0.85rem; font-weight:600; display:flex; align-items:center; gap:8px;"><span>${icon}</span> <span>${al.text}</span></div>`;
    });
}

function renderHeatmap(descActivities) {
    const hm = document.getElementById('heatmap-container');
    if (hm) hm.style.overflow = 'visible';
    const counts = { '3-1':[], '3-2':[], '3-3':[], '2-1':[], '2-2':[], '2-3':[], '1-1':[], '1-2':[], '1-3':[] };
    if (descActivities) { descActivities.forEach(act => { if (!act.noRisk && act.riskAssocs) { act.riskAssocs.forEach(ra => { const r = dbMon.data.descRisks.find(x => x.id === ra.riskId); if (r) counts[`${ra.prob}-${ra.imp}`].push(r.desc); }); } }); }
    
    const makeCell = (p, i, bg) => { 
        const risks = [...new Set(counts[`${p}-${i}`])];
        const val = counts[`${p}-${i}`].length; 
        let text = '';
        if (val > 0) {
            const riskListHtml = risks.map(r => `• ${r}`).join('<br>');
            text = `<div class="hover-trigger" style="width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; cursor: help;">
                        <b style="font-size:1.2rem; color:#fff; text-shadow: 0 1px 2px rgba(0,0,0,0.5);">${val}</b>
                        <div class="hover-target no-print" style="top: auto; bottom: 80%; left: 50%; transform: translateX(-50%); right: auto; width: max-content; max-width: 250px; flex-direction: column; align-items: flex-start; text-align: left; font-size: 0.75rem; color: #1e293b; z-index: 100;">
                            <b style="color: var(--dark-accent); border-bottom: 1px solid #e2e8f0; width: 100%; padding-bottom: 4px; margin-bottom: 4px;">Riscos (${val}):</b>
                            <span>${riskListHtml}</span>
                        </div>
                    </div>`;
        }
        return `<div style="background:${bg}; display:flex; align-items:center; justify-content:center; border-radius:2px;">${text}</div>`; 
    };
    hm.innerHTML = `${makeCell(3, 1, '#facc15')} ${makeCell(3, 2, '#ef4444')} ${makeCell(3, 3, '#b91c1c')} ${makeCell(2, 1, '#4ade80')} ${makeCell(2, 2, '#facc15')} ${makeCell(2, 3, '#ef4444')} ${makeCell(1, 1, '#22c55e')} ${makeCell(1, 2, '#4ade80')} ${makeCell(1, 3, '#facc15')}`;
}

function calcStats(arr) {
    if(arr.length === 0) return { mean: 0, mode: 0, stdDev: 0 };
    const mean = arr.reduce((a,b)=>a+b, 0) / arr.length;
    const stdDev = Math.sqrt(arr.reduce((sq, n) => sq + Math.pow(n - mean, 2), 0) / (arr.length - 1 || 1));
    const counts = {};
    let maxFreq = 0; let mode = arr[0];
    arr.forEach(a => {
        const bucket = Math.round(a * 10) / 10;
        counts[bucket] = (counts[bucket] || 0) + 1;
        if(counts[bucket] > maxFreq) { maxFreq = counts[bucket]; mode = bucket; }
    });
    return { mean, mode, stdDev };
}

function formatDurationFromHours(hours) {
    if (isNaN(hours) || hours === 0) return '-';
    const d = Math.floor(hours / 24);
    const h = Math.floor(hours % 24);
    const m = Math.round((hours * 60) % 60);
    let str = '';
    if (d > 0) str += `${d}d `;
    if (h > 0) str += `${h}h `;
    if (m > 0) str += `${m}m`;
    return str.trim() || '< 1m';
}

function renderLists(logs, descActivities) {
    const actList = document.getElementById('list-activities'); let actHtml = ''; const groupedActs = {};
    let hasAct = false;
    descActivities.forEach(act => {
        const actLogs = logs.filter(l => l.refId === act.id && l.type === 'atividade');
        if(actLogs.length > 0) {
            hasAct = true;
            const completed = actLogs.filter(l => l.startDate && l.endDate);
            const durs = completed.map(l => (new Date(l.endDate) - new Date(l.startDate)) / 3600000);
            const stats = calcStats(durs);
            const respSet = [...new Set(actLogs.map(l => l.responsible).filter(Boolean))].join(', ') || '-';
            
            actHtml += `<div class="dash-list-item" style="align-items: flex-start;">
                <div style="display:flex; flex-direction:column; gap:4px; flex: 1;">
                    <span style="font-weight: 600; color: #334155;">${act.name}</span>
                    <span style="font-size:0.7rem; color:#64748b;">Resp: ${respSet} | Moda: ${formatDurationFromHours(stats.mode)} | Desv. Pad.: ±${stats.stdDev.toFixed(1)}h</span>
                </div>
                <div style="display:flex; flex-direction:column; align-items: flex-end; justify-content: center;">
                    <span style="font-size:0.7rem; color:#64748b;">Média</span>
                    <span style="font-size:0.85rem; font-weight:bold; color:var(--dark-accent);">${formatDurationFromHours(stats.mean)}</span>
                </div>
            </div>`;
        }
    });
    if(!hasAct) actHtml = '<div class="empty-msg">Nenhuma atividade registrada no período.</div>';
    actList.innerHTML = actHtml;

    const incList = document.getElementById('list-incidents'); let incHtml = '';
    const incidents = logs.filter(l => l.type === 'risco').sort((a,b) => new Date(b.date || b.startDate) - new Date(a.date || a.startDate));
    incidents.slice(0, 10).forEach(inc => { const dt = new Date(inc.startDate || inc.date).toLocaleDateString('pt-BR'); const st = inc.endDate ? '<span style="color:#166534">Mitigado</span>' : '<span style="color:#b91c1c">Em Tratamento</span>'; incHtml += `<div class="dash-list-item"><div style="display:flex; flex-direction:column; gap:4px;"><span style="font-weight: 600; color: #b91c1c;">${inc.title}</span><span style="font-size:0.7rem; color:#64748b;">${dt} | Resp: ${inc.responsible || 'N/A'}</span></div><span style="font-size:0.75rem; font-weight:bold;">${st}</span></div>`; });
    incList.innerHTML = incHtml || '<div class="empty-msg">Nenhum incidente registrado.</div>';
}

function toggleDropdown(event) { event.stopPropagation(); const dropdown = document.getElementById("otherActionsDropdown").parentElement; const isShowing = dropdown.classList.contains('show'); document.querySelectorAll('.dropdown.show').forEach(d => d.classList.remove('show')); if (!isShowing) dropdown.classList.add('show'); }
window.onclick = function(event) { 
    if (!event.target.matches('.dropdown .btn-main')) { document.querySelectorAll('.dropdown.show').forEach(d => d.classList.remove('show')); } 
    if (event.target.classList.contains('modal-overlay')) {
        if (event.target.id === 'widgetModalOverlay') toggleWidgetModal();
        else if (event.target.id === 'customChartModalOverlay') closeCustomChartModal();
    }
}

function importJSON(event) { if (!event.target.files.length) return; const reader = new FileReader(); reader.onload = (e) => { try { const parsed = JSON.parse(e.target.result); dbMon = parsed; saveMonitorar(); renderDashboard(); showToast("Dashboard importado com sucesso!", "success"); } catch (err) { showToast("Arquivo JSON Inválido.", "error"); } }; reader.readAsText(event.target.files[0]); event.target.value = ''; }
function exportJSON() { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([JSON.stringify(dbMon)], {type: "application/json"})); a.download = `pdrim_monitorar_${new Date().toISOString().slice(0,10)}.json`; a.click(); localStorage.setItem('pdrim_exported', 'true'); showToast("Arquivo exportado com sucesso!", "success"); }
function zerarArtefato() { if (confirm("Tem certeza que deseja apagar os dados do painel? Isso não apagará os dados de Implementar, apenas a visualização atual.")) { dbMon = { config: {}, data: { logs: [], instances: {}, descActivities: [], descRisks: [] } }; saveMonitorar(); renderDashboard(); showToast("Dashboard zerado com sucesso!", "success"); } }
function printPage() { 
    const a = document.getElementById('capture-area'); 
    if(a) a.classList.add('pdf-mode'); 
    const originalTitle = document.title; 
    document.title = "pdrim_monitorar"; 
    showToast("Preparando PDF...", "info"); 
    Object.values(charts).forEach(c => { if(c) c.resize(); });
    setTimeout(() => { 
        window.print(); 
        document.title = originalTitle; 
        if(a) a.classList.remove('pdf-mode'); 
        Object.values(charts).forEach(c => { if(c) c.resize(); });
    }, 500); 
}