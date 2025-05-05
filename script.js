// script.js - v11 Submit Resetea Manteniendo Pasos

// --- Variables Globales ---
let steps = [];
let timerIntervals = {};

// --- Claves de localStorage ---
const TEMPLATE_STORAGE_KEY = 'evaluationTemplates';
const SUBMITTED_DATA_KEY = 'submittedAudits';
const EVALUATOR_NAME_KEY = 'evaluatorName';

// --- Funciones Auxiliares localStorage ---
function getEvaluationTemplates() { try { const d=localStorage.getItem(TEMPLATE_STORAGE_KEY)||'{}'; const t=JSON.parse(d); return (typeof t==='object'&&t!==null&&!Array.isArray(t))?t:{}; } catch(e) { console.error("Error reading templates:", e); return {}; } }
function getSubmittedAudits() { try { const d=localStorage.getItem(SUBMITTED_DATA_KEY)||'[]'; const a=JSON.parse(d); return Array.isArray(a)?a:[]; } catch(e) { console.error("Error reading submitted audits:", e); return []; } }
function saveSubmittedAudits(audits) { if (!Array.isArray(audits)) { console.error("Invalid data type for audits"); return; } try { localStorage.setItem(SUBMITTED_DATA_KEY, JSON.stringify(audits)); } catch(e) { console.error("Error saving audit data:", e); alert("Error saving audit data.");}}
const escapeCSV = (field) => { const str = String(field === null || field === undefined ? '' : field); if (str.includes('"') || str.includes(',') || str.includes('\n') || str.includes('\r') || /^\s|\s$/.test(str)) { return `"${str.replace(/"/g, '""')}"`; } return str; };
function formatTime(elapsedTime) { const totalMilliseconds = Math.max(0, Math.floor(elapsedTime)); const totalSeconds = Math.floor(totalMilliseconds / 1000); const minutes = Math.floor(totalSeconds / 60); const seconds = totalSeconds % 60; const hundredths = Math.floor((totalMilliseconds % 1000) / 10); return `${padZero(minutes)}:${padZero(seconds)}.${padZero(hundredths)}`; }
function padZero(num) { return num.toString().padStart(2, '0'); }


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
    // const resetButton = document.getElementById("resetFormButton"); // Referencia eliminada
    const submittedAuditsTableContainer = document.getElementById("submittedAuditsTableContainer");
    const exportSubmittedButton = document.getElementById("exportSubmittedButton");
    const clearSubmittedLogButton = document.getElementById("clearSubmittedLogButton");

    // --- Inicialización ---
    if (dateInput) { try { dateInput.value = new Date().toISOString().split('T')[0]; } catch(e) { console.error("Failed to set interaction date:", e);} }
    if (auditDateDisplay) { try { auditDateDisplay.textContent = new Date().toLocaleDateString(); } catch(e) { console.error("Failed to set audit date:", e); auditDateDisplay.textContent = 'Error'; } }
    if (evaluatorNameInput) { const savedEvaluatorName = localStorage.getItem(EVALUATOR_NAME_KEY); if (savedEvaluatorName) { evaluatorNameInput.value = savedEvaluatorName; } evaluatorNameInput.addEventListener('input', (e) => { localStorage.setItem(EVALUATOR_NAME_KEY, e.target.value); }); }
    if (accountSelect) populateAccountDropdown();
    if (submittedAuditsTableContainer) displaySubmittedAudits();

    // --- Listeners ---
    if (accountSelect) accountSelect.addEventListener('change', (e) => populateInteractionTypeDropdown(e.target.value));
    if (interactionTypeSelect) interactionTypeSelect.addEventListener('change', (e) => { if(loadButton) loadButton.disabled = !e.target.value; if (!e.target.value && stepListDiv) { stepListDiv.innerHTML = '<p>Please select Interaction Type...</p>'; steps = []; }});
    if (loadButton) loadButton.addEventListener("click", loadTemplateSteps);
    if (submitButton) submitButton.addEventListener("click", submitInteraction);
    // Listener para resetButton ELIMINADO
    if (exportSubmittedButton) exportSubmittedButton.addEventListener("click", exportSubmittedDataToCSV);
    if (clearSubmittedLogButton) clearSubmittedLogButton.addEventListener("click", clearSubmittedAudits);

}); // --- Fin de DOMContentLoaded ---


// --- Función para Mostrar Tabla de Enviados ---
function displaySubmittedAudits() { /* ... (código anterior sin cambios) ... */
    console.log("Updating submitted audits display..."); const container = document.getElementById("submittedAuditsTableContainer"); const exportBtn = document.getElementById("exportSubmittedButton"); const clearBtn = document.getElementById("clearSubmittedLogButton"); if (!container) { console.error("Submitted audits container not found!"); return; } const allSubmittedAudits = getSubmittedAudits(); const hasData = allSubmittedAudits.length > 0; if (exportBtn) exportBtn.disabled = !hasData; if (clearBtn) clearBtn.disabled = !hasData; if (!hasData) { container.innerHTML = '<p>No audits submitted yet.</p>'; return; } let tableHTML = `<table border="1"><thead><tr><th>Submitted At</th><th>Evaluator</th><th>Int. ID</th><th>Agent</th><th>ADP</th><th>Int. Date</th><th>Agent Perf.</th><th>Account</th><th>Int. Type</th><th>Steps</th><th>Actions</th></tr></thead><tbody>`; allSubmittedAudits.forEach((interaction, index) => { const stepsSummary = Array.isArray(interaction.steps) ? `${interaction.steps.length} steps` : 'N/A'; tableHTML += `<tr><td>${interaction.submittedAt ? new Date(interaction.submittedAt).toLocaleString() : ''}</td><td>${interaction.evaluatorName || ''}</td><td>${interaction.interactionId || ''}</td><td>${interaction.agentName || ''}</td><td>${interaction.adp || ''}</td><td>${interaction.date || ''}</td><td>${interaction.agentType || ''}</td><td>${interaction.account || ''}</td><td>${interaction.interactionType || ''}</td><td>${stepsSummary}</td><td class="action-cell"><button onclick="deleteSingleInteraction(${index})">Delete Entry</button></td></tr>`; }); tableHTML += `</tbody></table>`; container.innerHTML = tableHTML;
}

// --- Lógica de Carga de Plantilla ---
function loadTemplateSteps() { /* ... (código anterior sin cambios) ... */
    const accountSelect = document.getElementById("accountSelect"); const interactionTypeSelect = document.getElementById("interactionTypeSelect"); if (!accountSelect || !interactionTypeSelect) { console.error("Dropdowns not found"); return;} const sessionAccount = accountSelect.value; const sessionInteractionType = interactionTypeSelect.value; if (!sessionAccount || !sessionInteractionType) { alert("Please select both an Account and an Interaction Type."); return; } console.log(`Loading template for: ${sessionAccount} - ${sessionInteractionType}`); const templateKey = `${sessionAccount}::${sessionInteractionType}`; const allTemplates = getEvaluationTemplates(); const specificTemplateSteps = allTemplates[templateKey]; steps = []; Object.values(timerIntervals).forEach(clearInterval); timerIntervals = {}; if (Array.isArray(specificTemplateSteps) && specificTemplateSteps.length > 0) { specificTemplateSteps.forEach(masterStep => { if (masterStep && typeof masterStep.name === 'string' && typeof masterStep.category === 'string') { steps.push({ name: masterStep.name, category: masterStep.category, account: sessionAccount, interactionType: sessionInteractionType, elapsedTime: 0, startTime: 0, isRunning: false }); } else { console.warn("Skipping invalid step data in template:", masterStep); }}); console.log("Steps populated for session:", steps); } else { console.log(`No steps found or template is empty for key ${templateKey}`); alert(`No evaluation template found for Account="${sessionAccount}", Interaction Type="${sessionInteractionType}".`); } displaySteps();
}


// --- Lógica de Submit (AHORA incluye la lógica de reseteo al final) ---
function submitInteraction() {
    console.log("Submit button clicked");
    // 1. Obtener y validar Info Básica + NUEVOS CAMPOS
    const evaluatorNameInput = document.getElementById("evaluatorName");
    const interactionIdInput = document.getElementById("interactionId");
    const agentNameInput = document.getElementById("agentName");
    const adpInput = document.getElementById("adp");
    const dateInput = document.getElementById("date"); // Interaction Date
    const agentTypeSelect = document.getElementById("agentType"); // Agent Performance

    const evaluatorName = evaluatorNameInput?.value.trim();
    const interactionId = interactionIdInput?.value.trim();
    const agentName = agentNameInput?.value.trim();
    const adp = adpInput?.value.trim();
    const date = dateInput?.value;
    const agentType = agentTypeSelect?.value;

    if (!evaluatorName) { alert("Please enter Evaluator Name."); return; }
    if (!interactionId) { alert("Please enter Interaction ID."); return; }
    if (!agentName || !adp || !date || !agentType) { alert("Please fill in all Agent/Interaction basic information fields."); return; }

    // 2. Validar Contexto y Pasos
    const accountSelect = document.getElementById("accountSelect"); const interactionTypeSelect = document.getElementById("interactionTypeSelect");
    const account = accountSelect?.value; const interactionType = interactionTypeSelect?.value;
     if (!account || !interactionType) { alert("Account/Interaction Type missing."); return; }
    if (steps.length === 0) { alert("No steps loaded/timed."); return; }

    // 3. Construir resultados de pasos
    const stepResults = [];
    Object.values(timerIntervals).forEach(clearInterval); // Detener todos los timers al enviar
    timerIntervals = {}; // Limpiar objeto de intervalos

    steps.forEach((step) => {
        let finalTime = step.elapsedTime;
        // Recalcular por última vez si estaba corriendo justo antes de detener timers
        if (step.isRunning && step.startTime > 0) {
             finalTime += (Date.now() - step.startTime); // Usar Date.now() una vez más
        }
        step.isRunning = false; // Asegurar que todos queden como 'no corriendo'
        step.startTime = 0; // Limpiar startTime
        finalTime = Math.max(0, finalTime);
        stepResults.push({ name: step.name, category: step.category, time: formatTime(finalTime), rawTime: Math.floor(finalTime) });
    });

     // 4. Crear OBJETO de interacción completo
     const interactionData = {
         interactionId: interactionId, submittedAt: new Date().toISOString(), evaluatorName: evaluatorName,
         agentName: agentName, adp: adp, date: date, agentType: agentType, account: account, interactionType: interactionType,
         steps: stepResults
     };

    // 5. Guardar en localStorage
    const allSubmittedAudits = getSubmittedAudits();
    allSubmittedAudits.push(interactionData);
    saveSubmittedAudits(allSubmittedAudits);

    console.log("Interaction submitted:", interactionData);
    // alert(`Interaction submitted successfully!`); // Mensaje eliminado

    // 6. Actualizar tabla de logs
    displaySubmittedAudits();

    // 7. *** RESETEAR FORMULARIO (manteniendo pasos y contexto) ***
    console.log("Resetting form after submit (keeping steps)...");
    // Limpiar campos EXCEPTO Evaluator Name, Account, Interaction Type
    if(interactionIdInput) interactionIdInput.value = '';
    if(agentNameInput) agentNameInput.value = '';
    if(adpInput) adpInput.value = '';
    if(agentTypeSelect) agentTypeSelect.selectedIndex = 0; // Reset dropdown performance

    // Resetear tiempos en el array de pasos ACTUAL
    steps.forEach(step => {
        step.elapsedTime = 0;
        // startTime y isRunning ya deberían estar reseteados por el cálculo final de tiempo arriba
        step.startTime = 0;
        step.isRunning = false;
    });
    timerIntervals = {}; // Asegurar que esté vacío

    // Redibujar la tabla de pasos con los tiempos reseteados
    displaySteps();

    console.log("Form reset after submit complete (steps kept).");
    // *** FIN DE LÓGICA DE RESETEO ***
}


// --- Lógica para Borrar UNA Entrada del Log ---
function deleteSingleInteraction(indexToDelete) { /* ... (código anterior sin cambios) ... */
      console.log(`Attempting to delete interaction at index: ${indexToDelete}`); const allSubmittedAudits = getSubmittedAudits(); if (indexToDelete < 0 || indexToDelete >= allSubmittedAudits.length) { console.error("Invalid index for deletion:", indexToDelete); alert("Error: Could not find the entry."); return; } const entryToDelete = allSubmittedAudits[indexToDelete]; const confirmMsg = `Are you sure you want to delete the submitted entry? \n\n  Interaction ID: ${entryToDelete.interactionId || 'N/A'} \n  Evaluator: ${entryToDelete.evaluatorName || 'N/A'} \n  Agent: ${entryToDelete.agentName || 'N/A'} \n  Date: ${entryToDelete.date || 'N/A'} \n\nThis cannot be undone.`; if (confirm(confirmMsg)) { allSubmittedAudits.splice(indexToDelete, 1); saveSubmittedAudits(allSubmittedAudits); displaySubmittedAudits(); alert("Entry deleted successfully."); console.log(`Deleted interaction at index: ${indexToDelete}`); } else { console.log("Deletion cancelled by user."); }
}

// --- Lógica de Clear Log ---
function clearSubmittedAudits() { /* ... (código anterior sin cambios) ... */
     const allSubmittedAudits = getSubmittedAudits(); if (allSubmittedAudits.length === 0) { alert("There are no submitted audits to clear."); return; } if (confirm("WARNING: This will permanently delete ALL ("+ allSubmittedAudits.length +") submitted audit data stored in this browser. This cannot be undone. Are you sure?")) { try { localStorage.removeItem(SUBMITTED_DATA_KEY); console.log("Submitted audits log cleared."); displaySubmittedAudits(); alert("Submitted audits log has been cleared."); } catch (e) { console.error("Error clearing submitted audits:", e); alert("An error occurred while clearing the log."); } } else { console.log("Clear log cancelled by user."); }
}


// --- Lógica de Reset Form (Función ahora eliminada) ---
// function resetAuditForm() { /* ... ELIMINADA ... */ }


// --- Funciones del Cronómetro y Visualización ---
function displaySteps() {
    const stepListContainer = document.getElementById("stepList");
    if (!stepListContainer) { console.error("Step list container not found!"); return; }
    stepListContainer.innerHTML = '';

    if (steps.length === 0) { stepListContainer.innerHTML = '<p>No steps loaded. Select Account/Interaction Type and click "Load Predefined Steps".</p>'; return; }

    const table = document.createElement('table'); table.id = 'stepListTable';
    const thead = table.createTHead(); const headerRow = thead.insertRow();
    const headers = ["Step Category", "Step Name", "Time Elapsed", "Actions"];
    headers.forEach(text => { const th = document.createElement('th'); th.textContent = text; headerRow.appendChild(th); });

    const tbody = table.createTBody();
    steps.forEach((step, index) => {
        const row = tbody.insertRow();
        row.insertCell().textContent = step.category || '';
        row.insertCell().textContent = step.name || '';
        const timeCell = row.insertCell(); const timeSpan = document.createElement('span'); timeSpan.classList.add('time-display'); timeSpan.id = `time-display-${index}`;
        let displayTime = step.elapsedTime; if (step.isRunning && step.startTime > 0) { displayTime += (Date.now() - step.startTime); } displayTime = Math.max(0, displayTime); timeSpan.textContent = formatTime(displayTime); timeCell.appendChild(timeSpan);
        const actionsCell = row.insertCell(); actionsCell.classList.add('actions-cell');
        const toggleBtn = document.createElement('button'); toggleBtn.id = `toggleButton${index}`; toggleBtn.textContent = step.isRunning ? "Pause" : "Start"; toggleBtn.onclick = () => toggleStep(index); actionsCell.appendChild(toggleBtn);
        const resetBtn = document.createElement('button'); resetBtn.textContent = "Reset"; resetBtn.onclick = () => resetTime(index); actionsCell.appendChild(resetBtn);
    });
    stepListContainer.appendChild(table);
}

function updateStepTimeDisplay(index, totalTime) {
    const timeSpan = document.getElementById(`time-display-${index}`);
    if (timeSpan) { timeSpan.textContent = formatTime(Math.max(0, totalTime)); }
    else { if (timerIntervals[index]) { console.warn(`Time display span ${index} not found. Clearing interval.`); clearInterval(timerIntervals[index]); delete timerIntervals[index]; } }
}

function toggleStep(index) {
    if (index < 0 || index >= steps.length || !steps[index]) { console.error(`Invalid index or step data for toggleStep: ${index}`); return; }
    const step = steps[index]; if (step.isRunning) { if (timerIntervals[index]) { clearInterval(timerIntervals[index]); delete timerIntervals[index]; } if (step.startTime > 0) step.elapsedTime += (Date.now() - step.startTime); step.isRunning = false; step.startTime = 0; } else { step.startTime = Date.now(); step.isRunning = true; if (timerIntervals[index]) clearInterval(timerIntervals[index]); timerIntervals[index] = setInterval(() => { if (index < steps.length && steps[index] && steps[index].isRunning && steps[index].startTime > 0) { const currentRunDuration = Date.now() - steps[index].startTime; const totalTimeToDisplay = steps[index].elapsedTime + currentRunDuration; updateStepTimeDisplay(index, totalTimeToDisplay); } else { if (timerIntervals[index]) { clearInterval(timerIntervals[index]); delete timerIntervals[index]; } } }, 100); }
    displaySteps();
}

function resetTime(index) { // Resetea SOLO el tiempo de UN paso
    if (index < 0 || index >= steps.length || !steps[index]) { console.error(`Invalid index or step data for resetTime: ${index}`); return; }
    if (timerIntervals[index]) { clearInterval(timerIntervals[index]); delete timerIntervals[index]; } steps[index].elapsedTime = 0; steps[index].isRunning = false; steps[index].startTime = 0;
    displaySteps(); // Redibuja la tabla con el tiempo de este paso reseteado
}

function formatTime(elapsedTime) {
    const totalMilliseconds = Math.max(0, Math.floor(elapsedTime)); const totalSeconds = Math.floor(totalMilliseconds / 1000); const minutes = Math.floor(totalSeconds / 60); const seconds = totalSeconds % 60; const hundredths = Math.floor((totalMilliseconds % 1000) / 10); return `${padZero(minutes)}:${padZero(seconds)}.${padZero(hundredths)}`;
}

function padZero(num) { return num.toString().padStart(2, '0'); }


// --- Funciones de Poblado de Dropdowns ---
function populateAccountDropdown() {
    const accountSelect = document.getElementById("accountSelect"); const interactionTypeSelect = document.getElementById("interactionTypeSelect"); const loadButton = document.getElementById("loadStepsButton"); const stepListDiv = document.getElementById("stepList"); if (!accountSelect || !interactionTypeSelect) return; const allTemplates = getEvaluationTemplates(); const accounts = new Set(); Object.keys(allTemplates).forEach(key => { const [account] = key.split('::'); if (account) accounts.add(account); }); const previousAccount = accountSelect.value; accountSelect.innerHTML = '<option value="">-- Select Account --</option>'; interactionTypeSelect.innerHTML = '<option value="">-- Select Interaction Type --</option>'; interactionTypeSelect.disabled = true; if(loadButton) loadButton.disabled = true; if(stepListDiv && !previousAccount) stepListDiv.innerHTML = '<p>Please select Account and Interaction Type...</p>'; accounts.forEach(account => { const option = document.createElement('option'); option.value = account; option.textContent = account; accountSelect.appendChild(option); }); if (previousAccount && accounts.has(previousAccount)) { accountSelect.value = previousAccount; populateInteractionTypeDropdown(previousAccount); }
}

function populateInteractionTypeDropdown(selectedAccount) {
    const interactionTypeSelect = document.getElementById("interactionTypeSelect"); const loadButton = document.getElementById("loadStepsButton"); const stepListDiv = document.getElementById("stepList"); if (!interactionTypeSelect) return; const previousInteractionType = interactionTypeSelect.value; interactionTypeSelect.innerHTML = '<option value="">-- Select Interaction Type --</option>'; interactionTypeSelect.disabled = true; if(loadButton) loadButton.disabled = true; if(stepListDiv && !previousInteractionType) if(stepListDiv) stepListDiv.innerHTML = '<p>Please select Interaction Type...</p>'; if (!selectedAccount) return; const allTemplates = getEvaluationTemplates(); const interactionTypes = new Set(); Object.keys(allTemplates).forEach(key => { const [account, interactionType] = key.split('::'); if (account === selectedAccount && interactionType) interactionTypes.add(interactionType); }); interactionTypes.forEach(type => { const option = document.createElement('option'); option.value = type; option.textContent = type; interactionTypeSelect.appendChild(option); }); if (interactionTypes.size > 0) { interactionTypeSelect.disabled = false; if (previousInteractionType && interactionTypes.has(previousInteractionType)) { interactionTypeSelect.value = previousInteractionType; if(loadButton) loadButton.disabled = false; } } else { interactionTypeSelect.innerHTML = '<option value="">-- No Types found --</option>'; }
}


// --- Función de Exportación Log de Enviados ---
function exportSubmittedDataToCSV() {
    console.log("Exporting submitted data...");
    const allSubmittedAudits = getSubmittedAudits();
    if (allSubmittedAudits.length === 0) { alert("No submitted audit data to export."); return; }
    const csvRows = [];
    csvRows.push([ 'Interaction ID', 'Submitted At', 'Evaluator Name', 'Agent Name', 'ADP', 'Interaction Date', 'Agent Performance', 'Account', 'Interaction Type', 'Step Name', 'Step Category', 'Step Time' ].join(','));
    allSubmittedAudits.forEach(interaction => {
         if (Array.isArray(interaction.steps)) {
             interaction.steps.forEach(step => {
                 csvRows.push([ escapeCSV(interaction.interactionId), escapeCSV(interaction.submittedAt ? new Date(interaction.submittedAt).toLocaleString() : ''), escapeCSV(interaction.evaluatorName), escapeCSV(interaction.agentName), escapeCSV(interaction.adp), escapeCSV(interaction.date), escapeCSV(interaction.agentType), escapeCSV(interaction.account), escapeCSV(interaction.interactionType), escapeCSV(step.name), escapeCSV(step.category), escapeCSV(step.time) ].join(','));
             });
         } else { console.warn("Interaction found with no detailed steps:", interaction.interactionId); }
    });
    const csvString = csvRows.join('\n'); const BOM = "\uFEFF"; const blob = new Blob([BOM + csvString], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.style.display = 'none'; a.setAttribute('href', url);
    const dateStamp = new Date().toISOString().split('T')[0]; const filename = `submitted_audits_log_${dateStamp}.csv`.replace(/[^a-z0-9_.-]/gi, '_').replace(/__+/g, '_');
    a.setAttribute('download', filename); document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
    console.log("Submitted data exported to CSV:", filename);
}