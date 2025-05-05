// admin.js - v2.1 Tabla para Pasos Actuales

document.addEventListener('DOMContentLoaded', () => {
    // --- Elementos del DOM ---
    const accountInput = document.getElementById('templateAccount');
    const interactionTypeInput = document.getElementById('templateInteractionType');
    const loadOrStartButton = document.getElementById('loadOrStartTemplateButton');

    const templateStepsDiv = document.getElementById('templateSteps');
    const currentTemplateKeyDisplay = document.getElementById('currentTemplateKeyDisplay');
    const stepNameInput = document.getElementById('stepName'); // ID no cambia
    const stepCategoryInput = document.getElementById('stepCategory'); // ID no cambia
    const addStepButton = document.getElementById('addStepToTemplateButton');
    const currentStepsTableContainer = document.getElementById('currentStepsTableContainer'); // <<< Cambiado de Ul a Div contenedor
    const saveTemplateButton = document.getElementById('saveTemplateButton');
    const cancelEditButton = document.getElementById('cancelEditButton');

    const templatesDisplayArea = document.getElementById('templatesDisplayArea');

    // --- Estado de la Edición Actual ---
    let currentEditingKey = null;
    let currentTemplateSteps = [];

    // --- Constante para localStorage ---
    const STORAGE_KEY = 'evaluationTemplates';

    // --- Funciones Auxiliares para localStorage ---
    function getEvaluationTemplates() {
        try {
            const templates = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
            return (typeof templates === 'object' && templates !== null && !Array.isArray(templates)) ? templates : {};
        } catch (e) {
            console.error("Error reading templates:", e); return {};
        }
    }

    function saveEvaluationTemplates(templates) {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(templates));
        } catch (e) {
             console.error("Error saving templates:", e); alert("Error saving templates.");
        }
    }

    // --- Lógica de la Interfaz ---
    loadAndDisplaySavedTemplates();

    loadOrStartButton.addEventListener('click', () => {
        const account = accountInput.value.trim();
        const interactionType = interactionTypeInput.value.trim();
        if (!account || !interactionType) { alert('Please enter Account and Interaction Type.'); return; }
        currentEditingKey = `${account}::${interactionType}`;
        const allTemplates = getEvaluationTemplates();
        currentTemplateSteps = allTemplates[currentEditingKey] ? [...allTemplates[currentEditingKey]] : [];
        currentTemplateKeyDisplay.textContent = `${account} - ${interactionType}`;
        templateStepsDiv.style.display = 'block';
        renderCurrentStepsTable(); // <<< Llamar a la función de tabla
        clearStepInputs();
    });

    addStepButton.addEventListener('click', () => {
        if (!currentEditingKey) { alert("Please load or start a template first."); return; }
        // Leer valores (el orden de lectura no afecta al objeto)
        const name = stepNameInput.value.trim();
        const category = stepCategoryInput.value.trim();

        if (name && category) {
            currentTemplateSteps.push({ name, category });
            renderCurrentStepsTable(); // <<< Actualizar tabla
            clearStepInputs();
        } else {
            // Mensaje acorde al nuevo orden visual
            alert('Please enter both Step Category and Step Name.');
        }
    });

    saveTemplateButton.addEventListener('click', () => {
        if (!currentEditingKey) { alert("No template being edited."); return; }
        const allTemplates = getEvaluationTemplates();
        allTemplates[currentEditingKey] = [...currentTemplateSteps];
        saveEvaluationTemplates(allTemplates);
        alert(`Template "${currentEditingKey}" saved.`);
        cancelEditing();
        loadAndDisplaySavedTemplates();
    });

    cancelEditButton.addEventListener('click', () => { cancelEditing(); });


    // --- Funciones de Renderizado y Limpieza ---

    // *** RENOMBRADA Y MODIFICADA para generar TABLA ***
    function renderCurrentStepsTable() {
        currentStepsTableContainer.innerHTML = ''; // Limpiar contenedor

        if (currentTemplateSteps.length === 0) {
            currentStepsTableContainer.innerHTML = '<p>No steps added yet.</p>';
            return;
        }

        // Crear tabla y encabezados
        const table = document.createElement('table');
        const thead = table.createTHead();
        const headerRow = thead.insertRow();
        const headers = ["Step Category", "Step Name", "Action"];
        headers.forEach(text => { const th = document.createElement('th'); th.textContent = text; headerRow.appendChild(th); });

        // Crear cuerpo y filas
        const tbody = table.createTBody();
        currentTemplateSteps.forEach((step, index) => {
            const row = tbody.insertRow();
            row.insertCell().textContent = step.category || '';
            row.insertCell().textContent = step.name || '';

            // Celda de acción con botón Remove
            const actionCell = row.insertCell();
            const removeButton = document.createElement('button');
            removeButton.textContent = 'Remove';
            removeButton.onclick = () => removeStepFromCurrentTemplate(index); // Llama a helper
            actionCell.appendChild(removeButton);
        });

        currentStepsTableContainer.appendChild(table); // Añadir tabla al div
    }

     // *** NUEVA FUNCIÓN para eliminar un paso de la lista temporal ***
     function removeStepFromCurrentTemplate(index) {
        if (index >= 0 && index < currentTemplateSteps.length) {
            currentTemplateSteps.splice(index, 1); // Elimina del array en memoria
            renderCurrentStepsTable(); // Vuelve a dibujar la tabla actualizada
        }
    }

    function clearStepInputs() {
        stepNameInput.value = '';
        stepCategoryInput.value = '';
    }

    function cancelEditing() {
         currentEditingKey = null;
         currentTemplateSteps = [];
         templateStepsDiv.style.display = 'none';
         currentStepsTableContainer.innerHTML = ''; // <<< Limpiar contenedor de tabla
         accountInput.value = '';
         interactionTypeInput.value = '';
         clearStepInputs();
    }

    // Carga y muestra TODAS las plantillas guardadas (sin cambios en esta parte)
    function loadAndDisplaySavedTemplates() {
        const allTemplates = getEvaluationTemplates();
        templatesDisplayArea.innerHTML = '';
        const keys = Object.keys(allTemplates);
        if (keys.length === 0) { templatesDisplayArea.innerHTML = '<p>No templates saved yet.</p>'; return; }
        keys.forEach(key => {
            const templateSteps = allTemplates[key];
            const [account, interactionType] = key.split('::');
            const templateContainer = document.createElement('div');
            templateContainer.classList.add('saved-template');
            const title = document.createElement('h4');
            title.textContent = `Template: ${account || '?'} - ${interactionType || '?'} (Key: ${key})`;
            const deleteTemplateButton = document.createElement('button'); deleteTemplateButton.textContent = 'Delete Template'; deleteTemplateButton.onclick = () => { if (confirm(`Delete "${key}"?`)) deleteTemplate(key); }; title.appendChild(deleteTemplateButton);
             const editTemplateButton = document.createElement('button'); editTemplateButton.textContent = 'Edit Template'; editTemplateButton.onclick = () => { accountInput.value = account || ''; interactionTypeInput.value = interactionType || ''; loadOrStartButton.click(); }; title.appendChild(editTemplateButton);
            templateContainer.appendChild(title);
            const stepsList = document.createElement('ul'); // Sigue usando UL para mostrar las guardadas
            if (Array.isArray(templateSteps) && templateSteps.length > 0) { templateSteps.forEach((step, i) => { const li = document.createElement('li'); li.textContent = `${i + 1}. ${step.name} (${step.category})`; stepsList.appendChild(li); }); } else { stepsList.innerHTML = '<li>No steps.</li>'; }
            templateContainer.appendChild(stepsList);
            templatesDisplayArea.appendChild(templateContainer);
        });
    }

     // Función para eliminar una plantilla completa (sin cambios)
     function deleteTemplate(keyToDelete) {
        const allTemplates = getEvaluationTemplates();
        if (allTemplates[keyToDelete]) {
            delete allTemplates[keyToDelete];
            saveEvaluationTemplates(allTemplates);
            loadAndDisplaySavedTemplates();
            if (currentEditingKey === keyToDelete) cancelEditing();
            alert(`Template "${keyToDelete}" deleted.`);
        } else { alert(`Template "${keyToDelete}" not found.`); }
    }

}); // Fin de DOMContentLoaded