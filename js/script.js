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
        document.getElementById('btn-export-init').style.display = 'inline-block';
        document.getElementById('btn-pdf-init').style.display = 'inline-block';
        document.getElementById('btn-zerar-init').style.display = 'inline-block';
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
    // Placeholder: A geração combinada exige relatórios estruturados para cada fase.
    showToast('A geração consolidada do PDF da Iniciativa será habilitada nas próximas versões. Por favor, exporte as telas individualmente.', 'info');
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