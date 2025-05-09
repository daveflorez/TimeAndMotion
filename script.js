// script.js - v14 User Import & Step Reset Added

// --- Variables Globales ---
let steps = []; // Array de objetos: { name, category, account, interactionType, elapsedTime, startTime, isRunning, sentiment }
let timerIntervals = {}; // Objeto para almacenar intervalos: { index: intervalId }

// --- Claves de localStorage ---
const TEMPLATE_STORAGE_KEY = 'evaluationTemplates';
const SUBMITTED_DATA_KEY = 'submittedAudits';
const EVALUATOR_NAME_KEY = 'evaluatorName';
const BEHAVIOR_STORAGE_KEY = 'behaviorList';

// --- Funciones Auxiliares localStorage ---
function getEvaluationTemplates() { try { const d=localStorage.getItem(TEMPLATE_STORAGE_KEY)||'{}'; const t=JSON.parse(d); return (typeof t==='object'&&t!==null&&!Array.isArray(t))?t:{}; } catch(e) { console.error("Error reading templates:", e); return {}; } }
function getSubmittedAudits() { try { const d=localStorage.getItem(SUBMITTED_DATA_KEY)||'[]'; const a=JSON.parse(d); return Array.isArray(a)?a:[]; } catch(e) { console.error("Error reading submitted audits:", e); return []; } }
function saveSubmittedAudits(audits) { if (!Array.isArray(audits)) { console.error("Invalid data type for audits"); return; } try { localStorage.setItem(SUBMITTED_DATA_KEY, JSON.stringify(audits)); } catch(e) { console.error("Error saving audit data:", e); alert("Error saving audit data.");}}
const escapeCSV = (field) => { const str = String(field === null || field === undefined ? '' : field); if (str.includes('"') || str.includes(',') || str.includes('\n') || str.includes('\r') || /^\s|\s$/.test(str)) { return `"${str.replace(/"/g, '""')}"`; } return str; };
function formatTime(elapsedTime) { const totalMilliseconds = Math.max(0, Math.floor(elapsedTime)); const totalSeconds = Math.floor(totalMilliseconds / 1000); const minutes = Math.floor(totalSeconds / 60); const seconds = totalSeconds % 60; const hundredths = Math.floor((totalMilliseconds % 1000) / 10); return `${padZero(minutes)}:${padZero(seconds)}.${padZero(hundredths)}`; }
function padZero(num) { return num.toString().padStart(2, '0'); }

// --- Funciones Auxiliares para GUARDAR CONFIG (necesarias para Import) ---
function saveEvaluationTemplates(templates) {
     if (typeof templates !== 'object' || templates === null || Array.isArray(templates)) {
        console.error("Attempted to save invalid data type as templates:", templates);
        alert("Error: Invalid data format for templates. Cannot save.");
        return false; // Indicar fallo
     }
    try {
        localStorage.setItem(TEMPLATE_STORAGE_KEY, JSON.stringify(templates));
        return true; // Indicar éxito
    } catch (e) {
         console.error("Error saving templates:", e); alert("Error saving templates.");
         return false; // Indicar fallo
    }
}

function saveBehaviors(behaviors) {
    if (!Array.isArray(behaviors)) {
        console.error("Invalid data type for behaviors", behaviors);
        alert("Error: Invalid data format for behaviors. Cannot save.");
         return false; // Indicar fallo
    }
    try {
        localStorage.setItem(BEHAVIOR_STORAGE_KEY, JSON.stringify(behaviors));
        return true; // Indicar éxito
    } catch (e) {
        console.error("Error saving behaviors:", e); alert("Error saving behaviors.");
        return false; // Indicar fallo
    }
}
// --- FIN FUNCIONES AUXILIARES GUARDAR CONFIG ---


// --- Funciones de Inicialización y UI ---
function populateBehaviorDropdown() {
    const behaviorIdentifiedSelect = document.getElementById("behaviorIdentified");
    if (!behaviorIdentifiedSelect) { console.error("Behavior dropdown not found!"); return; }
    console.log("Populating behavior dropdown...");
    try {
        let behaviorList = JSON.parse(localStorage.getItem(BEHAVIOR_STORAGE_KEY) || '[]');
        if (!Array.isArray(behaviorList)) {
             console.warn("Invalid behavior list found in localStorage, defaulting to empty.");
             behaviorList = [];
        }
        behaviorIdentifiedSelect.innerHTML = '<option value="">-- Select Behavior --</option>'; // Reset
        behaviorList.sort((a,b) => a.localeCompare(b)).forEach(behavior => { // Ordenar al poblar
            const option = document.createElement('option');
            option.value = behavior;
            option.textContent = behavior;
            behaviorIdentifiedSelect.appendChild(option);
        });
        console.log(`Populated behavior dropdown with ${behaviorList.length} items.`);
    } catch (e) {
        console.error("Error parsing or populating behavior list:", e);
        behaviorIdentifiedSelect.innerHTML = '<option value="">-- Select Behavior --</option><option value="" disabled>Error loading list</option>';
    }
}

function populateAccountDropdown() {
    const accountSelect = document.getElementById('accountSelect');
    if (!accountSelect) return;
    const templates = getEvaluationTemplates();
    const accounts = [...new Set(Object.keys(templates).map(key => key.split('::')[0]))].filter(Boolean);
    accountSelect.innerHTML = '<option value="">-- Select Account --</option>'; // Reset
    accounts.sort().forEach(acc => {
        const option = document.createElement('option');
        option.value = acc;
        option.textContent = acc;
        accountSelect.appendChild(option);
    });
    // Resetear Interaction Type si se repuebla Account
    const interactionTypeSelect = document.getElementById('interactionTypeSelect');
     if(interactionTypeSelect) {
         interactionTypeSelect.innerHTML = '<option value="">-- Select Interaction Type --</option>';
         interactionTypeSelect.disabled = true;
         document.getElementById('loadStepsButton').disabled = true;
     }
}

function populateInteractionTypeDropdown(selectedAccount) {
    const interactionTypeSelect = document.getElementById('interactionTypeSelect');
    const loadButton = document.getElementById('loadStepsButton');
    if (!interactionTypeSelect || !loadButton) return;

    interactionTypeSelect.innerHTML = '<option value="">-- Select Interaction Type --</option>';
    interactionTypeSelect.disabled = true;
    loadButton.disabled = true;

    if (!selectedAccount) return;

    const templates = getEvaluationTemplates();
    const interactionTypes = Object.keys(templates)
        .filter(key => key.startsWith(selectedAccount + '::'))
        .map(key => key.split('::')[1])
        .filter(Boolean);

    if (interactionTypes.length > 0) {
        interactionTypes.sort().forEach(type => {
            const option = document.createElement('option');
            option.value = type;
            option.textContent = type;
            interactionTypeSelect.appendChild(option);
        });
        interactionTypeSelect.disabled = false;
    } else {
        const option = document.createElement('option');
        option.value = "";
        option.textContent = "-- No types found --";
        option.disabled = true;
        interactionTypeSelect.appendChild(option);
    }
}

// --- Listener Principal: DOMContentLoaded ---
document.addEventListener('DOMContentLoaded', (event) => {
    // --- Referencias DOM ---
    const evaluatorNameInput = document.getElementById("evaluatorName");
    const interactionIdInput = document.getElementById("interactionId");
    const agentNameInput = document.getElementById("agentName");
    const adpInput = document.getElementById("adp");
    const dateInput = document.getElementById("date");
    const agentTypeSelect = document.getElementById("agentType");
    const auditDateDisplay = document.getElementById("auditDateDisplay");
    const accountSelect = document.getElementById("accountSelect");
    const interactionTypeSelect = document.getElementById("interactionTypeSelect");
    const loadButton = document.getElementById("loadStepsButton");
    const stepListDiv = document.getElementById("stepList");
    const submitButton = document.getElementById("submitInteractionButton");
    const behaviorIdentifiedSelect = document.getElementById("behaviorIdentified");
    const submittedAuditsTableContainer = document.getElementById("submittedAuditsTableContainer");
    const exportSubmittedButton = document.getElementById("exportSubmittedButton");
    const clearSubmittedLogButton = document.getElementById("clearSubmittedLogButton");
    // Referencias DOM para Import en User Page
    const userImportConfigButton = document.getElementById("userImportConfigButton");
    const userImportConfigFileInput = document.getElementById("userImportConfigFile");

    // --- Inicialización ---
    if (dateInput) { try { dateInput.value = new Date().toISOString().split('T')[0]; } catch(e) { console.error("Failed to set interaction date:", e);} }
    if (auditDateDisplay) { try { auditDateDisplay.textContent = new Date().toLocaleDateString(); } catch(e) { console.error("Failed to set audit date:", e); auditDateDisplay.textContent = 'Error'; } }
    if (evaluatorNameInput) { const savedEvaluatorName = localStorage.getItem(EVALUATOR_NAME_KEY); if (savedEvaluatorName) { evaluatorNameInput.value = savedEvaluatorName; } evaluatorNameInput.addEventListener('input', (e) => { localStorage.setItem(EVALUATOR_NAME_KEY, e.target.value); }); }
    if (accountSelect) populateAccountDropdown(); // Poblar cuentas al inicio
    if (submittedAuditsTableContainer) displaySubmittedAudits(); // Mostrar logs guardados
    populateBehaviorDropdown(); // Poblar dropdown de behaviors

    // --- Listeners ---
    if (accountSelect) accountSelect.addEventListener('change', (e) => populateInteractionTypeDropdown(e.target.value));
    if (interactionTypeSelect) interactionTypeSelect.addEventListener('change', (e) => { if(loadButton) loadButton.disabled = !e.target.value; if (!e.target.value && stepListDiv) { stepListDiv.innerHTML = '<p>Please select Interaction Type...</p>'; steps = []; }});
    if (loadButton) loadButton.addEventListener("click", loadTemplateSteps);
    if (submitButton) submitButton.addEventListener("click", submitInteraction);
    if (exportSubmittedButton) exportSubmittedButton.addEventListener("click", exportSubmittedDataToCSV);
    if (clearSubmittedLogButton) clearSubmittedLogButton.addEventListener("click", clearSubmittedAudits);
    // Listeners para Import en User Page
    if (userImportConfigButton) {
        userImportConfigButton.addEventListener('click', () => {
            userImportConfigFileInput.click(); // Disparar input oculto
        });
    }
    if (userImportConfigFileInput) {
        userImportConfigFileInput.addEventListener('change', handleConfigurationImport_User); // Usar función específica
    }

}); // --- Fin de DOMContentLoaded ---


// --- Función para Mostrar Tabla de Enviados ---
function displaySubmittedAudits() {
    console.log("Updating submitted audits display...");
    const container = document.getElementById("submittedAuditsTableContainer");
    const exportBtn = document.getElementById("exportSubmittedButton");
    const clearBtn = document.getElementById("clearSubmittedLogButton");
    if (!container) { console.error("Submitted audits container not found!"); return; }

    const allSubmittedAudits = getSubmittedAudits();
    const hasData = allSubmittedAudits.length > 0;
    if (exportBtn) exportBtn.disabled = !hasData;
    if (clearBtn) clearBtn.disabled = !hasData;

    if (!hasData) {
        container.innerHTML = '<p>No audits submitted yet.</p>';
        return;
    }
    let tableHTML = `<table border="1"><thead><tr><th>Submitted At</th><th>Evaluator</th><th>Int. ID</th><th>Agent</th><th>ADP</th><th>Int. Date</th><th>Agent Perf.</th><th>Account</th><th>Int. Type</th><th>Behavior</th><th>Steps</th><th>Actions</th></tr></thead><tbody>`;
    allSubmittedAudits.forEach((interaction, index) => {
        const stepsSummary = Array.isArray(interaction.steps) ? `${interaction.steps.length} steps` : 'N/A';
        const submittedDate = interaction.submittedAt ? new Date(interaction.submittedAt).toLocaleString() : 'N/A';
        tableHTML += `<tr>
            <td>${submittedDate}</td>
            <td>${interaction.evaluatorName || ''}</td>
            <td>${interaction.interactionId || ''}</td>
            <td>${interaction.agentName || ''}</td>
            <td>${interaction.adp || ''}</td>
            <td>${interaction.date || ''}</td>
            <td>${interaction.agentType || ''}</td>
            <td>${interaction.account || ''}</td>
            <td>${interaction.interactionType || ''}</td>
            <td>${interaction.behaviorIdentified || ''}</td>
            <td>${stepsSummary}</td>
            <td class="action-cell"><button onclick="deleteSingleInteraction(${index})">Delete</button></td>
          </tr>`;
    });
    tableHTML += `</tbody></table>`;
    container.innerHTML = tableHTML;
}


// --- Lógica de Carga de Plantilla ---
function loadTemplateSteps() {
    const accountSelect = document.getElementById("accountSelect");
    const interactionTypeSelect = document.getElementById("interactionTypeSelect");
    if (!accountSelect || !interactionTypeSelect) { console.error("Dropdowns not found"); return;}
    const sessionAccount = accountSelect.value;
    const sessionInteractionType = interactionTypeSelect.value;
    if (!sessionAccount || !sessionInteractionType) { alert("Please select both an Account and an Interaction Type."); return; }
    console.log(`Loading template for: ${sessionAccount} - ${sessionInteractionType}`);
    const templateKey = `${sessionAccount}::${sessionInteractionType}`;
    const allTemplates = getEvaluationTemplates();
    const specificTemplateSteps = allTemplates[templateKey];

    steps = [];
    Object.values(timerIntervals).forEach(clearInterval);
    timerIntervals = {};

    if (Array.isArray(specificTemplateSteps) && specificTemplateSteps.length > 0) {
        specificTemplateSteps.forEach(masterStep => {
            if (masterStep && typeof masterStep.name === 'string' && typeof masterStep.category === 'string') {
                steps.push({
                    name: masterStep.name, category: masterStep.category,
                    account: sessionAccount, interactionType: sessionInteractionType,
                    elapsedTime: 0, startTime: 0, isRunning: false, sentiment: ""
                });
            } else { console.warn("Skipping invalid step data:", masterStep); }
        });
        console.log("Steps populated for session:", steps);
    } else {
        console.log(`No steps found for key ${templateKey}`);
        alert(`No template found for Account="${sessionAccount}", Interaction Type="${sessionInteractionType}".`);
    }
    displaySteps();
}

// --- Actualizar Sentiment en el Array ---
function updateSentiment(index, value) {
    if (index >= 0 && index < steps.length) {
        steps[index].sentiment = value;
        console.log(`Sentiment for step ${index} (${steps[index].name}) updated to: ${value}`);
    } else { console.warn(`Invalid index for sentiment update: ${index}`); }
}


// --- Lógica de Submit ---
function submitInteraction() {
    console.log("Submit button clicked");
    // 1. Obtener y validar Info Básica
    const evaluatorNameInput = document.getElementById("evaluatorName");
    const interactionIdInput = document.getElementById("interactionId");
    const agentNameInput = document.getElementById("agentName");
    const adpInput = document.getElementById("adp");
    const dateInput = document.getElementById("date");
    const agentTypeSelect = document.getElementById("agentType");
    const behaviorIdentifiedSelect = document.getElementById("behaviorIdentified");
    const evaluatorName = evaluatorNameInput?.value.trim();
    const interactionId = interactionIdInput?.value.trim();
    const agentName = agentNameInput?.value.trim();
    const adp = adpInput?.value.trim();
    const date = dateInput?.value;
    const agentType = agentTypeSelect?.value;
    const behaviorIdentified = behaviorIdentifiedSelect?.value; // Opcional
    if (!evaluatorName || !interactionId || !agentName || !adp || !date || !agentType) {
        alert("Please fill in all required basic information fields (Evaluator, Int. ID, Agent, ADP, Int. Date, Agent Perf.)."); return;
    }

    // 2. Validar Contexto y Pasos
    const accountSelect = document.getElementById("accountSelect");
    const interactionTypeSelect = document.getElementById("interactionTypeSelect");
    const account = accountSelect?.value;
    const interactionType = interactionTypeSelect?.value;
    if (!account || !interactionType) { alert("Account/Interaction Type missing. Please load steps again."); return; }
    if (steps.length === 0) { alert("No steps loaded or timed for this session."); return; }

    // 3. Construir resultados de pasos
    const stepResults = [];
    Object.values(timerIntervals).forEach(clearInterval); timerIntervals = {};
    steps.forEach((step) => {
        let finalTime = step.elapsedTime;
        if (step.isRunning && step.startTime > 0) { finalTime += (Date.now() - step.startTime); }
        step.isRunning = false; step.startTime = 0; finalTime = Math.max(0, finalTime);
        stepResults.push({ name: step.name, category: step.category, time: formatTime(finalTime), rawTime: Math.floor(finalTime), sentiment: step.sentiment || "" });
    });

    // 4. Crear OBJETO de interacción completo
    const interactionData = { interactionId, submittedAt: new Date().toISOString(), evaluatorName, agentName, adp, date, agentType, account, interactionType, behaviorIdentified, steps: stepResults };

    // 5. Guardar en localStorage
    const allSubmittedAudits = getSubmittedAudits(); allSubmittedAudits.push(interactionData); saveSubmittedAudits(allSubmittedAudits);
    console.log("Interaction submitted:", interactionData);

    // 6. Actualizar tabla de logs
    displaySubmittedAudits();

    // 7. RESETEAR FORMULARIO
    console.log("Resetting form after submit (keeping steps)...");
    if(interactionIdInput) interactionIdInput.value = '';
    if(agentNameInput) agentNameInput.value = '';
    if(adpInput) adpInput.value = '';
    if(dateInput) dateInput.value = new Date().toISOString().split('T')[0];
    if(agentTypeSelect) agentTypeSelect.selectedIndex = 0;
    if(behaviorIdentifiedSelect) behaviorIdentifiedSelect.selectedIndex = 0;
    steps.forEach(step => { step.elapsedTime = 0; step.startTime = 0; step.isRunning = false; step.sentiment = ""; });
    timerIntervals = {};
    displaySteps();
    console.log("Form reset complete.");
}


// --- Lógica para Borrar UNA Entrada del Log ---
function deleteSingleInteraction(indexToDelete) {
      console.log(`Attempting delete at index: ${indexToDelete}`);
    const allSubmittedAudits = getSubmittedAudits();
    if (indexToDelete < 0 || indexToDelete >= allSubmittedAudits.length) { console.error("Invalid index for deletion:", indexToDelete); alert("Error: Could not find entry."); return; }
    const entry = allSubmittedAudits[indexToDelete];
    if (confirm(`Delete entry for Interaction ID: ${entry.interactionId || 'N/A'}?`)) {
        allSubmittedAudits.splice(indexToDelete, 1); saveSubmittedAudits(allSubmittedAudits); displaySubmittedAudits();
        alert("Entry deleted."); console.log(`Deleted entry at index: ${indexToDelete}`);
    } else { console.log("Deletion cancelled."); }
}


// --- Lógica de Clear Log ---
function clearSubmittedAudits() {
     const audits = getSubmittedAudits();
    if (audits.length === 0) { alert("Log is already empty."); return; }
    if (confirm(`WARNING: Delete ALL (${audits.length}) submitted audits? This cannot be undone.`)) {
        try { localStorage.removeItem(SUBMITTED_DATA_KEY); console.log("Log cleared."); displaySubmittedAudits(); alert("Log cleared."); }
        catch (e) { console.error("Error clearing log:", e); alert("Error clearing log."); }
    } else { console.log("Clear log cancelled."); }
}


// --- Funciones del Cronómetro y Visualización de Pasos ---
function displaySteps() {
    const container = document.getElementById("stepList");
    if (!container) { console.error("Step list container not found!"); return; }
    container.innerHTML = '';

    if (steps.length === 0) { container.innerHTML = '<p>No steps loaded. Select Account/Interaction Type and click "Load Predefined Steps".</p>'; return; }

    const table = document.createElement('table'); table.id = 'stepListTable';
    const thead = table.createTHead(); const headerRow = thead.insertRow();
    ['Category', 'Step Name', 'Time', 'Actions', 'Sentiment'].forEach(text => { const th = document.createElement('th'); th.textContent = text; headerRow.appendChild(th); });

    const tbody = table.createTBody();
    steps.forEach((step, index) => {
        const row = tbody.insertRow();
        row.insertCell().textContent = step.category;
        row.insertCell().textContent = step.name;
        const timeCell = row.insertCell(); timeCell.classList.add('time-display');
        const timeSpan = document.createElement('span'); timeSpan.id = `time-${index}`; timeSpan.innerHTML = formatTime(step.elapsedTime);
        timeCell.appendChild(timeSpan);
        const actionsCell = row.insertCell(); actionsCell.classList.add('actions-cell');
        const startBtn = document.createElement('button'); startBtn.textContent = 'Start'; startBtn.id = `start-${index}`; startBtn.disabled = step.isRunning; startBtn.onclick = () => startTimer(index); actionsCell.appendChild(startBtn);
        const stopBtn = document.createElement('button'); stopBtn.textContent = 'Stop'; stopBtn.id = `stop-${index}`; stopBtn.disabled = !step.isRunning; stopBtn.onclick = () => stopTimer(index); actionsCell.appendChild(stopBtn);
        const resetBtn = document.createElement('button'); resetBtn.textContent = 'Reset'; resetBtn.id = `reset-${index}`; resetBtn.disabled = false; resetBtn.onclick = () => resetStepTimer(index); actionsCell.appendChild(resetBtn);
        const sentimentCell = row.insertCell(); const select = document.createElement('select'); select.id = `sentiment-${index}`; select.title = `Sentiment for ${step.name}`; select.onchange = () => updateSentiment(index, select.value);
        [{v:"",t:"-- Select --"},{v:"Positive",t:"Positive Sentiment"},{v:"Neutral",t:"Neutral Sentiment"},{v:"Negative",t:"Negative Sentiment"}].forEach(o=>{const opt=document.createElement('option');opt.value=o.v;opt.textContent=o.t;select.appendChild(opt);});
        select.value = step.sentiment || ""; sentimentCell.appendChild(select);
    });
    container.appendChild(table);
}

function startTimer(index) {
    if (index < 0 || index >= steps.length || steps[index].isRunning) return;
    const step = steps[index];
    step.isRunning = true; step.startTime = Date.now();
    document.getElementById(`start-${index}`).disabled = true;
    document.getElementById(`stop-${index}`).disabled = false;
    // document.getElementById(`reset-${index}`).disabled = true; // Opcional: deshabilitar reset mientras corre
    if (timerIntervals[index]) clearInterval(timerIntervals[index]);
    timerIntervals[index] = setInterval(() => {
        if (!steps[index] || !steps[index].isRunning) { clearInterval(timerIntervals[index]); delete timerIntervals[index]; return; }
        const currentTime = steps[index].elapsedTime + (Date.now() - steps[index].startTime);
        const timeDisplay = document.getElementById(`time-${index}`);
        if (timeDisplay) { timeDisplay.innerHTML = formatTime(currentTime); }
        else { console.warn(`Timer display ${index} not found`); clearInterval(timerIntervals[index]); delete timerIntervals[index]; }
    }, 50);
     console.log(`Timer started step ${index}: ${step.name}`);
}

function stopTimer(index) {
    if (index < 0 || index >= steps.length || !steps[index]?.isRunning) return; // Añadido check steps[index]
    const step = steps[index];
    step.elapsedTime += (Date.now() - step.startTime);
    step.isRunning = false; step.startTime = 0;
    if (timerIntervals[index]) { clearInterval(timerIntervals[index]); delete timerIntervals[index]; }
    const timeDisplay = document.getElementById(`time-${index}`);
    if(timeDisplay) timeDisplay.innerHTML = formatTime(step.elapsedTime);
    document.getElementById(`start-${index}`).disabled = false;
    document.getElementById(`stop-${index}`).disabled = true;
    document.getElementById(`reset-${index}`).disabled = false; // Habilitar reset al parar
    console.log(`Timer stopped step ${index}: ${step.name}. Accumulated: ${step.elapsedTime}ms`);
}

function resetStepTimer(index) {
    if (index < 0 || index >= steps.length) { console.error("Invalid index for reset:", index); return; }
    const step = steps[index];
    if (!confirm(`Reset timer for step "${step.name}"? Current: ${formatTime(step.elapsedTime)}`)) return;
    console.log(`Resetting timer step ${index}: ${step.name}`);
    if (step.isRunning) { if (timerIntervals[index]) { clearInterval(timerIntervals[index]); delete timerIntervals[index]; } step.isRunning = false; }
    step.elapsedTime = 0; step.startTime = 0;
    const timeDisplay = document.getElementById(`time-${index}`);
    if (timeDisplay) timeDisplay.innerHTML = formatTime(0);
    document.getElementById(`start-${index}`).disabled = false;
    document.getElementById(`stop-${index}`).disabled = true;
    document.getElementById(`reset-${index}`).disabled = false; // O true si quieres deshabilitar si es 0
}
// --- FIN Funciones Cronómetro ---


// --- Función de Exportación (Formato Largo) ---
function exportSubmittedDataToCSV() {
    console.log("Exporting submitted data to CSV (long format)...");
    const allSubmittedAudits = getSubmittedAudits();
    if (allSubmittedAudits.length === 0) { alert("No submitted data to export."); return; }
    const headers = ["Interaction ID", "Submitted At", "Evaluator Name", "Agent Name", "ADP", "Interaction Date", "Agent Performance", "Account", "Interaction Type", "Behavior Identified", "Step Category", "Step Name", "Step Time (ms)", "Step Time (Formatted)", "Step Sentiment"];
    const csvRows = [headers.map(escapeCSV).join(',')];
    allSubmittedAudits.forEach(audit => {
        const common = [audit.interactionId, audit.submittedAt?new Date(audit.submittedAt).toISOString():'', audit.evaluatorName, audit.agentName, audit.adp, audit.date, audit.agentType, audit.account, audit.interactionType, audit.behaviorIdentified];
        if (Array.isArray(audit.steps) && audit.steps.length > 0) {
            audit.steps.forEach(step => {
                const row = [...common, step.category, step.name, step.rawTime??'', step.time, step.sentiment||''];
                csvRows.push(row.map(escapeCSV).join(','));
            });
        } else { console.log(`Audit ${audit.interactionId} has no steps, skipping.`); }
    });
    const csvString = csvRows.join('\n');
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    if (link.download !== undefined) {
        const url = URL.createObjectURL(blob); const ts = new Date().toISOString().replace(/[:.]/g, '-');
        link.setAttribute('href', url); link.setAttribute('download', `submitted_audits_steps_${ts}.csv`);
        link.style.visibility = 'hidden'; document.body.appendChild(link); link.click(); document.body.removeChild(link); URL.revokeObjectURL(url);
        console.log("CSV export initiated (long format).");
    } else { alert("CSV export not supported in your browser."); }
}
// --- FIN Exportación ---


// --- Función de Importación para User Page ---
function handleConfigurationImport_User(event) {
    console.log("Handling configuration import on user page...");
    const file = event.target.files[0];
    if (!file) { console.log("No file selected."); return; }
    if (!file.name.toLowerCase().endsWith('.json') || file.type !== 'application/json') { alert("Please select a valid JSON file (.json)."); event.target.value = null; return; }
    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const importedConfig = JSON.parse(e.target.result);
            if (typeof importedConfig !== 'object' || importedConfig === null || typeof importedConfig.templates !== 'object' || importedConfig.templates === null || Array.isArray(importedConfig.templates) || !Array.isArray(importedConfig.behaviors)) {
                throw new Error("Invalid file structure. Expected 'templates' (object) and 'behaviors' (array).");
            }
            if (!confirm("Importing this file will OVERWRITE current templates and behaviors. Proceed?")) { console.log("Import cancelled."); event.target.value = null; return; }
            const tSaved = saveEvaluationTemplates(importedConfig.templates);
            const bSaved = saveBehaviors(importedConfig.behaviors);
            if (tSaved && bSaved) {
                console.log("Config imported successfully."); alert("Configuration imported successfully! Dropdowns updated.");
                populateAccountDropdown(); // Repopular todo
                populateBehaviorDropdown();
                steps = []; // Limpiar pasos actuales
                Object.values(timerIntervals).forEach(clearInterval); timerIntervals = {};
                displaySteps(); // Mostrar mensaje inicial de pasos
            } else { throw new Error("Failed to save imported config."); }
        } catch (error) { console.error("Error importing file:", error); alert(`Error importing: ${error.message}`);
        } finally { event.target.value = null; } // Reset input
    };
    reader.onerror = (e) => { console.error("Error reading file:", e); alert("Error reading file."); event.target.value = null; };
    reader.readAsText(file);
}
// --- FIN Importación User ---

// --- FIN script.js ---