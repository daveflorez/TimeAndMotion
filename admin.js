// admin.js - v2.5 JSON Import/Export Added

document.addEventListener('DOMContentLoaded', () => {
    // --- Elementos del DOM ---
    const accountInput = document.getElementById('templateAccount');
    const interactionTypeInput = document.getElementById('templateInteractionType');
    const loadOrStartButton = document.getElementById('loadOrStartTemplateButton');
    const templateStepsDiv = document.getElementById('templateSteps');
    const currentTemplateKeyDisplay = document.getElementById('currentTemplateKeyDisplay');
    const stepNameInput = document.getElementById('stepName');
    const stepCategoryInput = document.getElementById('stepCategory');
    const addStepButton = document.getElementById('addStepToTemplateButton');
    const currentStepsTableContainer = document.getElementById('currentStepsTableContainer');
    const saveTemplateButton = document.getElementById('saveTemplateButton');
    const cancelEditButton = document.getElementById('cancelEditButton');
    const templatesDisplayArea = document.getElementById('templatesDisplayArea');
    const newBehaviorInput = document.getElementById('newBehaviorInput');
    const addBehaviorButton = document.getElementById('addBehaviorButton');
    const currentBehaviorsListDiv = document.getElementById('currentBehaviorsList');
    // Referencias DOM para Import/Export
    const exportConfigButton = document.getElementById('exportConfigButton');
    const importConfigButton = document.getElementById('importConfigButton');
    const importConfigFileInput = document.getElementById('importConfigFile');

    // --- Estado de la Edición Actual ---
    let currentEditingKey = null;
    let currentTemplateSteps = [];
    let editingBehaviorIndex = -1; // Índice del behavior en edición (-1 = ninguno)

    // --- Constantes para localStorage ---
    const TEMPLATE_STORAGE_KEY = 'evaluationTemplates';
    const BEHAVIOR_STORAGE_KEY = 'behaviorList';

    // --- Lista de Comportamientos por Defecto ---
    const defaultBehaviors = [
        "Active Listening", "Active Reading", "Dead Air Abuse", "Inefficient KA Usage",
        "Issue Identification Struggle", "Knowledge Gaps", "Tool Gaps",
        "Lack of Process Adherence", "Work Avoidance"
    ].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));

    // --- Funciones Auxiliares para localStorage ---
    function getEvaluationTemplates() {
        try {
            const templates = JSON.parse(localStorage.getItem(TEMPLATE_STORAGE_KEY) || '{}');
            return (typeof templates === 'object' && templates !== null && !Array.isArray(templates)) ? templates : {};
        } catch (e) {
            console.error("Error reading templates:", e); return {};
        }
    }

    function saveEvaluationTemplates(templates) {
         // Añadir validación básica del objeto de plantillas antes de guardar
         if (typeof templates !== 'object' || templates === null || Array.isArray(templates)) {
            console.error("Attempted to save invalid data type as templates:", templates);
            alert("Error: Invalid data format for templates. Cannot save.");
            return;
         }
        try {
            localStorage.setItem(TEMPLATE_STORAGE_KEY, JSON.stringify(templates));
        } catch (e) {
             console.error("Error saving templates:", e); alert("Error saving templates.");
        }
    }

    function getBehaviors() {
        let behaviors = [];
        try {
            const storedData = localStorage.getItem(BEHAVIOR_STORAGE_KEY);
            if (storedData) {
                const parsedData = JSON.parse(storedData);
                if (Array.isArray(parsedData)) {
                    behaviors = parsedData;
                } else {
                     console.warn("Stored behavior data is not an array. Ignoring.");
                }
            }
        } catch (e) {
            console.error("Error reading or parsing behaviors from localStorage:", e);
        }
        if (behaviors.length === 0) {
            console.log("No existing behaviors found or list was empty/invalid. Applying and saving defaults.");
            behaviors = [...defaultBehaviors];
            saveBehaviors(behaviors); // Guardar defaults si no había nada
        }
        return behaviors;
    }

    function saveBehaviors(behaviors) {
        if (!Array.isArray(behaviors)) {
            console.error("Invalid data type for behaviors", behaviors);
            alert("Error: Invalid data format for behaviors. Cannot save.");
             return;
        }
        try {
            localStorage.setItem(BEHAVIOR_STORAGE_KEY, JSON.stringify(behaviors));
        } catch (e) {
            console.error("Error saving behaviors:", e); alert("Error saving behaviors.");
        }
    }


    // --- Lógica de la Interfaz ---
    loadAndDisplaySavedTemplates();
    loadAndDisplayBehaviors();

    // Listeners Plantillas
    loadOrStartButton.addEventListener('click', () => {
        const account = accountInput.value.trim();
        const interactionType = interactionTypeInput.value.trim();
        if (!account || !interactionType) { alert('Please enter Account and Interaction Type.'); return; }
        if (editingBehaviorIndex !== -1) cancelEditBehavior(); // Cancelar edit behavior al cargar plantilla
        currentEditingKey = `${account}::${interactionType}`;
        const allTemplates = getEvaluationTemplates();
        currentTemplateSteps = allTemplates[currentEditingKey] ? [...allTemplates[currentEditingKey]] : [];
        currentTemplateKeyDisplay.textContent = `${account} - ${interactionType}`;
        templateStepsDiv.style.display = 'block';
        renderCurrentStepsTable();
        clearStepInputs();
        stepCategoryInput.focus();
    });

    addStepButton.addEventListener('click', () => {
        if (!currentEditingKey) { alert("Please load or start a template first."); return; }
        const category = stepCategoryInput.value.trim();
        const name = stepNameInput.value.trim();
        if (category && name) {
            currentTemplateSteps.push({ category, name });
            renderCurrentStepsTable();
            clearStepInputs();
            stepCategoryInput.focus();
        } else {
            alert('Please enter both Step Category and Step Name.');
        }
    });

    saveTemplateButton.addEventListener('click', () => {
        if (!currentEditingKey) { alert("No template being edited."); return; }
        if (currentTemplateSteps.length === 0) {
             if (!confirm("The current template has no steps. Save empty template?")) return;
        }
        const allTemplates = getEvaluationTemplates();
        allTemplates[currentEditingKey] = [...currentTemplateSteps];
        saveEvaluationTemplates(allTemplates);
        alert(`Template "${currentEditingKey}" saved.`);
        cancelEditing();
        loadAndDisplaySavedTemplates();
    });

    cancelEditButton.addEventListener('click', () => {
        let hasUnsavedChanges = false;
        if (currentEditingKey) {
             const originalSteps = getEvaluationTemplates()[currentEditingKey] || [];
             if (JSON.stringify(currentTemplateSteps.sort()) !== JSON.stringify(originalSteps.sort())) { // Simple sort comparison
                 hasUnsavedChanges = true;
             }
        } else if (currentTemplateSteps.length > 0) { hasUnsavedChanges = true; }
         if (hasUnsavedChanges) {
            if (!confirm("Discard current changes to this template?")) return;
         }
        cancelEditing();
    });

    // Listeners Behaviors
    addBehaviorButton.addEventListener('click', () => {
        const newBehavior = newBehaviorInput.value.trim();
        if (newBehavior) { addBehavior(newBehavior); newBehaviorInput.value = ''; newBehaviorInput.focus(); }
        else { alert("Please enter a behavior name."); }
    });
    newBehaviorInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') addBehaviorButton.click(); });

    // Listeners Import/Export
    if (exportConfigButton) { exportConfigButton.addEventListener('click', exportConfiguration); }
    if (importConfigButton) { importConfigButton.addEventListener('click', () => importConfigFileInput.click()); }
    if (importConfigFileInput) { importConfigFileInput.addEventListener('change', handleConfigurationImport); }


    // --- Funciones de Renderizado y Limpieza ---

    function renderCurrentStepsTable() {
        currentStepsTableContainer.innerHTML = '';
        const stepsExist = currentTemplateSteps.length > 0;
        saveTemplateButton.disabled = false; // Permitir guardar (con confirmación si está vacío)

        if (!stepsExist) {
            currentStepsTableContainer.innerHTML = '<p>No steps added yet.</p>';
            return;
        }

        const table = document.createElement('table');
        const thead = table.createTHead();
        const headerRow = thead.insertRow();
        ['Step Category', 'Step Name', 'Action'].forEach(text => { const th = document.createElement('th'); th.textContent = text; headerRow.appendChild(th); });

        const tbody = table.createTBody();
        currentTemplateSteps.forEach((step, index) => {
            const row = tbody.insertRow();
            row.insertCell().textContent = step.category || '';
            row.insertCell().textContent = step.name || '';
            const actionCell = row.insertCell();
            const removeButton = document.createElement('button');
            removeButton.textContent = 'Remove';
            removeButton.onclick = () => removeStepFromCurrentTemplate(index);
            actionCell.appendChild(removeButton);
        });
        currentStepsTableContainer.appendChild(table);
    }

     function removeStepFromCurrentTemplate(index) {
        if (index >= 0 && index < currentTemplateSteps.length) {
             const stepToRemove = currentTemplateSteps[index];
             if (confirm(`Remove step: "${stepToRemove.name}" (${stepToRemove.category})?`)) {
                currentTemplateSteps.splice(index, 1);
                renderCurrentStepsTable();
             }
        }
    }

    function clearStepInputs() {
        stepCategoryInput.value = '';
        stepNameInput.value = '';
    }

    function cancelEditing() {
        if (editingBehaviorIndex !== -1) cancelEditBehavior();
        currentEditingKey = null;
        currentTemplateSteps = [];
        templateStepsDiv.style.display = 'none';
        currentStepsTableContainer.innerHTML = '';
        accountInput.value = '';
        interactionTypeInput.value = '';
        clearStepInputs();
        saveTemplateButton.disabled = true;
    }

    function loadAndDisplayBehaviors() {
        const behaviors = getBehaviors();
        renderBehaviorsList(behaviors);
    }

    function renderBehaviorsList(behaviors) {
        currentBehaviorsListDiv.innerHTML = '';
        editingBehaviorIndex = -1;

        if (!Array.isArray(behaviors) || behaviors.length === 0) {
            currentBehaviorsListDiv.innerHTML = '<p>No behaviors defined.</p>';
            return;
        }

        const table = document.createElement('table');
        const thead = table.createTHead();
        const headerRow = thead.insertRow();
        ['Behavior Name', 'Actions'].forEach(text => { const th = document.createElement('th'); th.textContent = text; headerRow.appendChild(th); });

        const tbody = table.createTBody();
        behaviors.forEach((behavior, index) => {
            const row = tbody.insertRow(); row.id = `behavior-row-${index}`;
            const nameCell = row.insertCell(); nameCell.id = `behavior-name-cell-${index}`;
            const behaviorSpan = document.createElement('span');
            behaviorSpan.textContent = behavior; behaviorSpan.classList.add('behavior-text');
            behaviorSpan.title = 'Click to edit'; behaviorSpan.onclick = () => startEditBehavior(index);
            nameCell.appendChild(behaviorSpan);
            const actionsCell = row.insertCell(); actionsCell.id = `behavior-actions-cell-${index}`; actionsCell.classList.add('actions-cell');
            const deleteButton = document.createElement('button');
            deleteButton.textContent = 'Delete'; deleteButton.onclick = () => deleteBehavior(index);
            actionsCell.appendChild(deleteButton);
        });
        currentBehaviorsListDiv.appendChild(table);
    }

    function startEditBehavior(index) {
        if (editingBehaviorIndex !== -1 && editingBehaviorIndex !== index) cancelEditBehavior();
        if (editingBehaviorIndex === index) return;
        editingBehaviorIndex = index;
        const nameCell = document.getElementById(`behavior-name-cell-${index}`);
        const actionsCell = document.getElementById(`behavior-actions-cell-${index}`);
        const currentBehaviorText = getBehaviors()[index];
        if (!nameCell || !actionsCell) return;
        nameCell.innerHTML = ''; actionsCell.innerHTML = '';
        const input = document.createElement('input');
        input.type = 'text'; input.value = currentBehaviorText; input.classList.add('edit-behavior-input'); input.id = `edit-input-${index}`;
        input.onkeydown = (event) => { if (event.key === 'Enter') saveEditedBehavior(); else if (event.key === 'Escape') cancelEditBehavior(); };
        nameCell.appendChild(input);
        const saveBtn = document.createElement('button'); saveBtn.textContent = 'Save'; saveBtn.onclick = saveEditedBehavior;
        const cancelBtn = document.createElement('button'); cancelBtn.textContent = 'Cancel'; cancelBtn.onclick = cancelEditBehavior;
        actionsCell.appendChild(saveBtn); actionsCell.appendChild(cancelBtn);
        input.focus(); input.select();
    }

    function saveEditedBehavior() {
        if (editingBehaviorIndex === -1) return;
        const input = document.getElementById(`edit-input-${editingBehaviorIndex}`);
        if (!input) { cancelEditBehavior(); return; }
        const newBehaviorName = input.value.trim();
        const behaviors = getBehaviors();
        const originalBehaviorName = behaviors[editingBehaviorIndex];
        if (!newBehaviorName) { alert("Behavior name cannot be empty."); input.focus(); return; }
        const lowerCaseNewName = newBehaviorName.toLowerCase();
        const duplicateExists = behaviors.some((b, i) => i !== editingBehaviorIndex && b.toLowerCase() === lowerCaseNewName);
        if (duplicateExists) { alert(`Behavior "${newBehaviorName}" already exists (case-insensitive).`); input.focus(); input.select(); return; }
        let needsSave = false;
        if (newBehaviorName !== originalBehaviorName) {
            behaviors[editingBehaviorIndex] = newBehaviorName;
            needsSave = true;
        }
        const tempIndex = editingBehaviorIndex; // Guardar índice antes de resetear
        editingBehaviorIndex = -1; // Resetear estado antes de redibujar/guardar
        if (needsSave) {
            behaviors.sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
            saveBehaviors(behaviors);
        }
        renderBehaviorsList(getBehaviors()); // Redibujar siempre para salir del modo edición
    }

    function cancelEditBehavior() {
         if (editingBehaviorIndex === -1) return;
         const indexToCancel = editingBehaviorIndex;
         editingBehaviorIndex = -1;
         renderBehaviorsList(getBehaviors()); // Redibujar es lo más simple
    }

    function addBehavior(behaviorToAdd) {
        if (editingBehaviorIndex !== -1) cancelEditBehavior();
        const behaviors = getBehaviors();
        const lowerCaseBehaviorToAdd = behaviorToAdd.toLowerCase();
        const exists = behaviors.some(b => b.toLowerCase() === lowerCaseBehaviorToAdd);
        if (!exists) {
            behaviors.push(behaviorToAdd);
            behaviors.sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
            saveBehaviors(behaviors);
            renderBehaviorsList(behaviors);
        } else { alert(`Behavior "${behaviorToAdd}" already exists (case-insensitive).`); }
    }

    function deleteBehavior(indexToDelete) {
        if (editingBehaviorIndex !== -1) cancelEditBehavior(); // Cancelar edición antes de borrar
        const behaviors = getBehaviors();
        if (indexToDelete >= 0 && indexToDelete < behaviors.length) {
            const deletedBehavior = behaviors[indexToDelete];
            if (confirm(`Are you sure you want to delete the behavior: "${deletedBehavior}"?`)) {
                behaviors.splice(indexToDelete, 1);
                saveBehaviors(behaviors);
                renderBehaviorsList(getBehaviors());
            }
        }
    }

    function loadAndDisplaySavedTemplates() {
        const allTemplates = getEvaluationTemplates();
        templatesDisplayArea.innerHTML = '';
        const keys = Object.keys(allTemplates).sort();
        if (keys.length === 0) { templatesDisplayArea.innerHTML = '<p>No templates saved yet.</p>'; return; }
        keys.forEach(key => {
            const templateSteps = allTemplates[key];
            const [account, interactionType] = key.split('::');
            const templateContainer = document.createElement('div'); templateContainer.classList.add('saved-template');
            const title = document.createElement('h4'); title.textContent = `Template: ${account || '?'} - ${interactionType || '?'} `;
            const editTemplateButton = document.createElement('button'); editTemplateButton.textContent = 'Edit'; editTemplateButton.style.marginLeft = '10px';
            editTemplateButton.onclick = () => { accountInput.value = account || ''; interactionTypeInput.value = interactionType || ''; loadOrStartButton.click(); };
            title.appendChild(editTemplateButton);
            const deleteTemplateButton = document.createElement('button'); deleteTemplateButton.textContent = 'Delete'; deleteTemplateButton.style.marginLeft = '5px';
            deleteTemplateButton.onclick = () => { if (confirm(`Are you sure you want to delete the template "${key}"? This cannot be undone.`)) deleteTemplate(key); };
            title.appendChild(deleteTemplateButton);
            templateContainer.appendChild(title);
            const stepsList = document.createElement('ul');
            if (Array.isArray(templateSteps) && templateSteps.length > 0) {
                const sortedSteps = [...templateSteps].sort((a,b) => { const c = (a.category || '').localeCompare(b.category || ''); return c !== 0 ? c : (a.name || '').localeCompare(b.name || ''); });
                sortedSteps.forEach((step, i) => { const li = document.createElement('li'); li.textContent = `${i + 1}. ${step.category || 'No Category'} - ${step.name || 'No Name'}`; stepsList.appendChild(li); });
            } else { const li = document.createElement('li'); li.textContent = 'No steps defined.'; li.style.fontStyle = 'italic'; stepsList.appendChild(li); }
            templateContainer.appendChild(stepsList);
            templatesDisplayArea.appendChild(templateContainer);
        });
    }

     function deleteTemplate(keyToDelete) {
        if (currentEditingKey === keyToDelete) cancelEditing();
        const allTemplates = getEvaluationTemplates();
        if (allTemplates[keyToDelete]) {
            delete allTemplates[keyToDelete];
            saveEvaluationTemplates(allTemplates);
            loadAndDisplaySavedTemplates();
            alert(`Template "${keyToDelete}" deleted.`);
        } else { console.warn(`Attempted to delete non-existent template key: ${keyToDelete}`); alert(`Template "${keyToDelete}" not found.`); }
    }

    // --- Funciones para Import/Export ---

    function exportConfiguration() {
        console.log("Exporting configuration...");
        try {
            const configData = {
                templates: getEvaluationTemplates(),
                behaviors: getBehaviors()
            };
            const jsonString = JSON.stringify(configData, null, 2);
            const blob = new Blob([jsonString], { type: "application/json" });
            const link = document.createElement('a');
            const url = URL.createObjectURL(blob);
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            link.setAttribute('href', url);
            link.setAttribute('download', `evaluation_config_${timestamp}.json`);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
            console.log("Configuration exported successfully.");
            alert("Configuration exported successfully!");
        } catch (error) {
            console.error("Error exporting configuration:", error);
            alert("An error occurred while exporting the configuration. Check console.");
        }
    }

    function handleConfigurationImport(event) {
        console.log("Handling configuration import...");
        const file = event.target.files[0];
        if (!file) { console.log("No file selected."); return; }
        if (!file.name.toLowerCase().endsWith('.json') || file.type !== 'application/json') {
             alert("Please select a valid JSON file (.json).");
             event.target.value = null; return;
        }
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const importedConfig = JSON.parse(e.target.result);
                if (typeof importedConfig !== 'object' || importedConfig === null ||
                    typeof importedConfig.templates !== 'object' || importedConfig.templates === null || Array.isArray(importedConfig.templates) ||
                    !Array.isArray(importedConfig.behaviors)) {
                    throw new Error("Invalid file structure. Expected 'templates' (object) and 'behaviors' (array).");
                }
                if (!confirm("Importing this file will OVERWRITE current templates and behaviors. Proceed?")) {
                    console.log("Import cancelled by user."); event.target.value = null; return;
                }
                // Guardar datos importados
                saveEvaluationTemplates(importedConfig.templates);
                saveBehaviors(importedConfig.behaviors);
                console.log("Configuration imported and saved successfully.");
                alert("Configuration imported successfully! The page will now reflect the changes.");
                // Actualizar UI
                cancelEditing(); // Asegura limpiar estado de edición
                loadAndDisplaySavedTemplates();
                loadAndDisplayBehaviors();
            } catch (error) {
                console.error("Error processing imported file:", error);
                alert(`Error importing configuration: ${error.message}`);
            } finally { event.target.value = null; } // Reset input
        };
        reader.onerror = (e) => { console.error("Error reading file:", e); alert("Error reading the selected file."); event.target.value = null; };
        reader.readAsText(file);
    }

}); // Fin de DOMContentLoaded