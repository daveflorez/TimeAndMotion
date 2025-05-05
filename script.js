// script.js - v13 Added Optional Sentiment per Step

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

// --- Funciones de Inicialización ---
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
        behaviorList.forEach(behavior => {
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
    const accounts = [...new Set(Object.keys(templates).map(key => key.split('::')[0]))].filter(Boolean); // Evita nulos/undefined
    accountSelect.innerHTML = '<option value="">-- Select Account --</option>'; // Reset
    accounts.sort().forEach(acc => {
        const option = document.createElement('option');
        option.value = acc;
        option.textContent = acc;
        accountSelect.appendChild(option);
    });
}

function populateInteractionTypeDropdown(selectedAccount) {
    const interactionTypeSelect = document.getElementById('interactionTypeSelect');
    const loadButton = document.getElementById('loadStepsButton');
    if (!interactionTypeSelect || !loadButton) return;

    interactionTypeSelect.innerHTML = '<option value="">-- Select Interaction Type --</option>'; // Reset
    interactionTypeSelect.disabled = true;
    loadButton.disabled = true;

    if (!selectedAccount) return;

    const templates = getEvaluationTemplates();
    const interactionTypes = Object.keys(templates)
        .filter(key => key.startsWith(selectedAccount + '::'))
        .map(key => key.split('::')[1])
        .filter(Boolean); // Filtrar tipos vacíos o undefined

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

    // --- Inicialización ---
    if (dateInput) { try { dateInput.value = new Date().toISOString().split('T')[0]; } catch(e) { console.error("Failed to set interaction date:", e);} }
    if (auditDateDisplay) { try { auditDateDisplay.textContent = new Date().toLocaleDateString(); } catch(e) { console.error("Failed to set audit date:", e); auditDateDisplay.textContent = 'Error'; } }
    if (evaluatorNameInput) { const savedEvaluatorName = localStorage.getItem(EVALUATOR_NAME_KEY); if (savedEvaluatorName) { evaluatorNameInput.value = savedEvaluatorName; } evaluatorNameInput.addEventListener('input', (e) => { localStorage.setItem(EVALUATOR_NAME_KEY, e.target.value); }); }
    if (accountSelect) populateAccountDropdown();
    if (submittedAuditsTableContainer) displaySubmittedAudits();
    populateBehaviorDropdown(); // Poblar dropdown de behaviors

    // --- Listeners ---
    if (accountSelect) accountSelect.addEventListener('change', (e) => populateInteractionTypeDropdown(e.target.value));
    if (interactionTypeSelect) interactionTypeSelect.addEventListener('change', (e) => { if(loadButton) loadButton.disabled = !e.target.value; if (!e.target.value && stepListDiv) { stepListDiv.innerHTML = '<p>Please select Interaction Type...</p>'; steps = []; }});
    if (loadButton) loadButton.addEventListener("click", loadTemplateSteps);
    if (submitButton) submitButton.addEventListener("click", submitInteraction);
    if (exportSubmittedButton) exportSubmittedButton.addEventListener("click", exportSubmittedDataToCSV);
    if (clearSubmittedLogButton) clearSubmittedLogButton.addEventListener("click", clearSubmittedAudits);

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
    // Cabeceras (Sentiment por paso se verá en la exportación, no en este resumen)
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

    // Limpiar estado anterior
    steps = [];
    Object.values(timerIntervals).forEach(clearInterval);
    timerIntervals = {};

    if (Array.isArray(specificTemplateSteps) && specificTemplateSteps.length > 0) {
        specificTemplateSteps.forEach(masterStep => {
            if (masterStep && typeof masterStep.name === 'string' && typeof masterStep.category === 'string') {
                steps.push({
                    name: masterStep.name,
                    category: masterStep.category,
                    account: sessionAccount,
                    interactionType: sessionInteractionType,
                    elapsedTime: 0,
                    startTime: 0,
                    isRunning: false,
                    sentiment: "" // Inicializar sentiment vacío
                });
            } else {
                console.warn("Skipping invalid step data in template:", masterStep);
            }
        });
        console.log("Steps populated for session:", steps);
    } else {
        console.log(`No steps found or template is empty for key ${templateKey}`);
        alert(`No evaluation template found for Account="${sessionAccount}", Interaction Type="${sessionInteractionType}".`);
    }
    displaySteps(); // Mostrar los pasos cargados
}

// --- Actualizar Sentiment en el Array ---
function updateSentiment(index, value) {
    if (index >= 0 && index < steps.length) {
        steps[index].sentiment = value;
        console.log(`Sentiment for step ${index} (${steps[index].name}) updated to: ${value}`);
    } else {
        console.warn(`Attempted to update sentiment for invalid index: ${index}`);
    }
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

    // Validaciones Obligatorias
    if (!evaluatorName) { alert("Please enter Evaluator Name."); return; }
    if (!interactionId) { alert("Please enter Interaction ID."); return; }
    if (!agentName) { alert("Please enter Agent Name."); return; }
    if (!adp) { alert("Please enter ADP."); return; }
    if (!date) { alert("Please select Interaction Date."); return; }
    if (!agentType) { alert("Please select Agent Performance."); return; }
    // La validación de behaviorIdentified fue eliminada/comentada

    // 2. Validar Contexto y Pasos
    const accountSelect = document.getElementById("accountSelect");
    const interactionTypeSelect = document.getElementById("interactionTypeSelect");
    const account = accountSelect?.value;
    const interactionType = interactionTypeSelect?.value;
    if (!account || !interactionType) { alert("Account/Interaction Type context missing. Please load steps again."); return; }
    if (steps.length === 0) { alert("No steps loaded or timed for this session."); return; }

    // 3. Construir resultados de pasos (incluye sentiment)
    const stepResults = [];
    Object.values(timerIntervals).forEach(clearInterval);
    timerIntervals = {};

    steps.forEach((step) => {
        let finalTime = step.elapsedTime;
        if (step.isRunning && step.startTime > 0) {
            finalTime += (Date.now() - step.startTime);
        }
        step.isRunning = false;
        step.startTime = 0;
        finalTime = Math.max(0, finalTime);

        stepResults.push({
            name: step.name,
            category: step.category,
            time: formatTime(finalTime),
            rawTime: Math.floor(finalTime),
            sentiment: step.sentiment || "" // Guardar sentiment
        });
    });

    // 4. Crear OBJETO de interacción completo
    const interactionData = {
        interactionId: interactionId, submittedAt: new Date().toISOString(), evaluatorName: evaluatorName,
        agentName: agentName, adp: adp, date: date, agentType: agentType, account: account, interactionType: interactionType,
        behaviorIdentified: behaviorIdentified,
        steps: stepResults
    };

    // 5. Guardar en localStorage
    const allSubmittedAudits = getSubmittedAudits();
    allSubmittedAudits.push(interactionData);
    saveSubmittedAudits(allSubmittedAudits);
    console.log("Interaction submitted:", interactionData);

    // 6. Actualizar tabla de logs
    displaySubmittedAudits();

    // 7. RESETEAR FORMULARIO (manteniendo pasos y contexto)
    console.log("Resetting form after submit (keeping steps)...");
    if(interactionIdInput) interactionIdInput.value = '';
    if(agentNameInput) agentNameInput.value = '';
    if(adpInput) adpInput.value = '';
    if(dateInput) dateInput.value = new Date().toISOString().split('T')[0];
    if(agentTypeSelect) agentTypeSelect.selectedIndex = 0;
    if(behaviorIdentifiedSelect) behaviorIdentifiedSelect.selectedIndex = 0;

    // Resetear tiempos Y SENTIMENT en el array de pasos ACTUAL
    steps.forEach(step => {
        step.elapsedTime = 0;
        step.startTime = 0;
        step.isRunning = false;
        step.sentiment = ""; // Resetear sentiment
    });
    timerIntervals = {};

    // Redibujar la tabla de pasos con los tiempos y selects reseteados
    displaySteps();

    console.log("Form reset after submit complete (steps kept).");
}


// --- Lógica para Borrar UNA Entrada del Log ---
function deleteSingleInteraction(indexToDelete) {
      console.log(`Attempting to delete interaction at index: ${indexToDelete}`);
    const allSubmittedAudits = getSubmittedAudits();
    if (indexToDelete < 0 || indexToDelete >= allSubmittedAudits.length) {
        console.error("Invalid index for deletion:", indexToDelete);
        alert("Error: Could not find the entry to delete.");
        return;
    }
    const entryToDelete = allSubmittedAudits[indexToDelete];
    const confirmMsg = `Are you sure you want to delete the submitted entry?
                      Interaction ID: ${entryToDelete.interactionId || 'N/A'}
                      Agent: ${entryToDelete.agentName || 'N/A'}
                      Date: ${entryToDelete.date || 'N/A'}
                      This cannot be undone.`;
    if (confirm(confirmMsg)) {
        allSubmittedAudits.splice(indexToDelete, 1);
        saveSubmittedAudits(allSubmittedAudits);
        displaySubmittedAudits();
        alert("Entry deleted successfully.");
        console.log(`Deleted interaction at index: ${indexToDelete}`);
    } else {
        console.log("Deletion cancelled by user.");
    }
}


// --- Lógica de Clear Log ---
function clearSubmittedAudits() {
     const allSubmittedAudits = getSubmittedAudits();
    if (allSubmittedAudits.length === 0) {
        alert("There are no submitted audits to clear.");
        return;
    }
    if (confirm(`WARNING: This will permanently delete ALL (${allSubmittedAudits.length}) submitted audit data stored in this browser. This cannot be undone. Are you sure?`)) {
        try {
            localStorage.removeItem(SUBMITTED_DATA_KEY);
            console.log("Submitted audits log cleared.");
            displaySubmittedAudits();
            alert("Submitted audits log has been cleared.");
        } catch (e) {
            console.error("Error clearing submitted audits:", e);
            alert("An error occurred while clearing the log.");
        }
    } else {
        console.log("Clear log cancelled by user.");
    }
}


// --- Funciones del Cronómetro y Visualización de Pasos ---
function displaySteps() {
    const stepListContainer = document.getElementById("stepList");
    if (!stepListContainer) { console.error("Step list container not found!"); return; }
    stepListContainer.innerHTML = ''; // Limpiar

    if (steps.length === 0) {
        stepListContainer.innerHTML = '<p>No steps loaded. Select Account/Interaction Type and click "Load Predefined Steps".</p>';
        return;
    }

    const table = document.createElement('table');
    table.id = 'stepListTable';
    const thead = table.createTHead();
    const headerRow = thead.insertRow();
    // Añadir cabecera "Sentiment"
    ['Category', 'Step Name', 'Time', 'Actions', 'Sentiment'].forEach(headerText => {
        const th = document.createElement('th');
        th.textContent = headerText;
        headerRow.appendChild(th);
    });

    const tbody = table.createTBody();
    steps.forEach((step, index) => {
        const row = tbody.insertRow();
        row.insertCell().textContent = step.category;
        row.insertCell().textContent = step.name;

        // Celda del tiempo
        const timeCell = row.insertCell();
        timeCell.classList.add('time-display');
        const timeSpan = document.createElement('span');
        timeSpan.id = `time-${index}`;
        timeSpan.innerHTML = formatTime(step.elapsedTime);
        timeCell.appendChild(timeSpan);

        // Celda de acciones
        const actionsCell = row.insertCell();
        actionsCell.classList.add('actions-cell');
        const startButton = document.createElement('button');
        startButton.textContent = 'Start';
        startButton.id = `start-${index}`;
        startButton.disabled = step.isRunning;
        startButton.onclick = () => startTimer(index);
        actionsCell.appendChild(startButton);
        const stopButton = document.createElement('button');
        stopButton.textContent = 'Stop';
        stopButton.id = `stop-${index}`;
        stopButton.disabled = !step.isRunning;
        stopButton.onclick = () => stopTimer(index);
        actionsCell.appendChild(stopButton);

        // Celda para Sentiment
        const sentimentCell = row.insertCell();
        const selectSentiment = document.createElement('select');
        selectSentiment.id = `sentiment-${index}`;
        selectSentiment.title = `Select sentiment for step: ${step.name}`;
        selectSentiment.onchange = () => updateSentiment(index, selectSentiment.value);

        const options = [
            { value: "", text: "-- Select --" },
            { value: "Positive", text: "Positive Sentiment" },
            { value: "Neutral", text: "Neutral Sentiment" },
            { value: "Negative", text: "Negative Sentiment" }
        ];
        options.forEach(optData => {
            const option = document.createElement('option');
            option.value = optData.value;
            option.textContent = optData.text;
            selectSentiment.appendChild(option);
        });
        selectSentiment.value = step.sentiment || ""; // Establecer valor actual
        sentimentCell.appendChild(selectSentiment);
    });
    stepListContainer.appendChild(table);
}

function startTimer(index) {
    if (index < 0 || index >= steps.length || steps[index].isRunning) return;

    const step = steps[index];
    step.isRunning = true;
    step.startTime = Date.now();

    document.getElementById(`start-${index}`).disabled = true;
    document.getElementById(`stop-${index}`).disabled = false;

    if (timerIntervals[index]) clearInterval(timerIntervals[index]);

    timerIntervals[index] = setInterval(() => {
        if (!steps[index] || !steps[index].isRunning) { // Seguridad: si el paso desaparece o se detiene inesperadamente
             clearInterval(timerIntervals[index]);
             delete timerIntervals[index];
             return;
        }
        const currentTime = steps[index].elapsedTime + (Date.now() - steps[index].startTime);
        const timeDisplay = document.getElementById(`time-${index}`);
        if (timeDisplay) {
            timeDisplay.innerHTML = formatTime(currentTime);
        } else {
            console.warn(`Timer display for index ${index} not found. Stopping interval.`);
            clearInterval(timerIntervals[index]);
            delete timerIntervals[index];
        }
    }, 50); // Actualizar cada 50ms
     console.log(`Timer started for step ${index}: ${step.name}`);
}

function stopTimer(index) {
    if (index < 0 || index >= steps.length || !steps[index].isRunning) return;

    const step = steps[index];
    const endTime = Date.now();
    const duration = endTime - step.startTime;

    step.elapsedTime += duration;
    step.isRunning = false;
    step.startTime = 0;

    if (timerIntervals[index]) {
        clearInterval(timerIntervals[index]);
        delete timerIntervals[index];
    }

    const timeDisplay = document.getElementById(`time-${index}`);
    if(timeDisplay) timeDisplay.innerHTML = formatTime(step.elapsedTime);
    document.getElementById(`start-${index}`).disabled = false;
    document.getElementById(`stop-${index}`).disabled = true;
    console.log(`Timer stopped for step ${index}: ${step.name}. Accumulated: ${step.elapsedTime}ms`);
}


// --- Función de Exportación ---
function exportSubmittedDataToCSV() {
    console.log("Exporting submitted data to CSV (long format)...");
    const allSubmittedAudits = getSubmittedAudits();
    if (allSubmittedAudits.length === 0) {
        alert("No submitted data to export.");
        return;
    }

    // 1. Definir las cabeceras para el formato largo
    const headers = [
        "Interaction ID",
        "Submitted At",
        "Evaluator Name",
        "Agent Name",
        "ADP",
        "Interaction Date",
        "Agent Performance",
        "Account",
        "Interaction Type",
        "Behavior Identified", // Opcional
        "Step Category",
        "Step Name",
        "Step Time (ms)",
        "Step Time (Formatted)",
        "Step Sentiment" // Opcional
    ];

    // 2. Inicializar las filas CSV con la cabecera
    const csvRows = [headers.map(escapeCSV).join(',')];

    // 3. Iterar sobre cada auditoría y luego sobre cada paso dentro de ella
    allSubmittedAudits.forEach(audit => {
        // Extraer la información común de la auditoría
        const commonData = [
            audit.interactionId || '',
            audit.submittedAt ? new Date(audit.submittedAt).toISOString() : '', // Usar ISO para consistencia o toLocaleString() si se prefiere
            audit.evaluatorName || '',
            audit.agentName || '',
            audit.adp || '',
            audit.date || '',
            audit.agentType || '',
            audit.account || '',
            audit.interactionType || '',
            audit.behaviorIdentified || '' // Behavior general opcional
        ];

        // Verificar si hay pasos en esta auditoría
        if (Array.isArray(audit.steps) && audit.steps.length > 0) {
            // Iterar sobre cada paso y crear una fila para él
            audit.steps.forEach(step => {
                // Crear la fila combinando datos comunes y del paso específico
                const stepRow = [
                    ...commonData, // Añadir todos los datos comunes primero
                    step.category || '',
                    step.name || '',
                    step.rawTime !== undefined ? step.rawTime : '', // Tiempo en ms
                    step.time || '', // Tiempo formateado
                    step.sentiment || '' // Sentiment específico del paso opcional
                ];

                // Escapar y unir la fila, luego añadirla a las filas CSV
                csvRows.push(stepRow.map(escapeCSV).join(','));
            });
        } else {
            // Opcional: ¿Qué hacer si una auditoría no tiene pasos?
            // Opción A (Actual): No añadir ninguna fila para esta auditoría (ya que no hay pasos)
            // Opción B: Añadir una fila con datos comunes y campos de paso vacíos
            /*
            const noStepRow = [
                ...commonData,
                '', // Step Category
                '', // Step Name
                '', // Step Time (ms)
                '', // Step Time (Formatted)
                ''  // Step Sentiment
            ];
            csvRows.push(noStepRow.map(escapeCSV).join(','));
            */
            console.log(`Audit ${audit.interactionId} has no steps, skipping row generation.`);
        }
    }); // Fin del forEach para auditorías

    // 4. Crear y descargar el archivo CSV (esta parte no cambia)
    const csvString = csvRows.join('\n');
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        link.setAttribute('href', url);
        link.setAttribute('download', `submitted_audits_steps_${timestamp}.csv`); // Nombre de archivo diferente
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        console.log("CSV export initiated (long format).");
    } else {
        alert("CSV export is not supported in your browser.");
    }
}
// --- FIN DE FUNCIONES ---