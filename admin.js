// admin.js - v2.4 Behavior Table & Edit-in-Place

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

    // Elementos para Behavior Management
    const newBehaviorInput = document.getElementById('newBehaviorInput');
    const addBehaviorButton = document.getElementById('addBehaviorButton');
    const currentBehaviorsListDiv = document.getElementById('currentBehaviorsList');

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
    ].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' })); // Mantenerlos ordenados

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
            // localStorage.removeItem(BEHAVIOR_STORAGE_KEY); // Opcional: limpiar clave corrupta
        }

        if (behaviors.length === 0) {
            console.log("No existing behaviors found or list was empty/invalid. Applying and saving defaults.");
            behaviors = [...defaultBehaviors];
            saveBehaviors(behaviors);
        }
        return behaviors;
    }

    function saveBehaviors(behaviors) {
        if (!Array.isArray(behaviors)) {
            console.error("Invalid data type for behaviors"); return;
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

    loadOrStartButton.addEventListener('click', () => {
        const account = accountInput.value.trim();
        const interactionType = interactionTypeInput.value.trim();
        if (!account || !interactionType) { alert('Please enter Account and Interaction Type.'); return; }
        currentEditingKey = `${account}::${interactionType}`;
        const allTemplates = getEvaluationTemplates();
        currentTemplateSteps = allTemplates[currentEditingKey] ? [...allTemplates[currentEditingKey]] : [];
        currentTemplateKeyDisplay.textContent = `${account} - ${interactionType}`;
        templateStepsDiv.style.display = 'block';
        renderCurrentStepsTable();
        clearStepInputs();
        stepCategoryInput.focus();
        // Cancelar edición de behavior si estaba activa al cargar plantilla
        if (editingBehaviorIndex !== -1) cancelEditBehavior();
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
             if (!confirm("The current template has no steps. Save empty template?")) {
                 return;
             }
        }
        const allTemplates = getEvaluationTemplates();
        allTemplates[currentEditingKey] = [...currentTemplateSteps];
        saveEvaluationTemplates(allTemplates);
        alert(`Template "${currentEditingKey}" saved.`);
        cancelEditing(); // Esto ya resetea la interfaz de plantillas
        loadAndDisplaySavedTemplates();
    });

    cancelEditButton.addEventListener('click', () => {
        let hasUnsavedChanges = false;
        if (currentEditingKey) {
             const originalSteps = getEvaluationTemplates()[currentEditingKey] || [];
             // Comparación simple (puede mejorarse para orden)
             if (JSON.stringify(currentTemplateSteps.sort()) !== JSON.stringify(originalSteps.sort())) {
                 hasUnsavedChanges = true;
             }
        } else if (currentTemplateSteps.length > 0) {
            // Si es una plantilla nueva y tiene pasos
            hasUnsavedChanges = true;
        }

         if (hasUnsavedChanges) {
            if (!confirm("Discard current changes to this template?")) {
                return;
            }
         }
        cancelEditing(); // Llama a la función que resetea todo
    });

    addBehaviorButton.addEventListener('click', () => {
        const newBehavior = newBehaviorInput.value.trim();
        if (newBehavior) {
            addBehavior(newBehavior);
            newBehaviorInput.value = '';
            newBehaviorInput.focus();
        } else {
            alert("Please enter a behavior name.");
        }
    });

    newBehaviorInput.addEventListener('keypress', function (e) {
        if (e.key === 'Enter') { addBehaviorButton.click(); }
    });


    // --- Funciones de Renderizado y Limpieza ---

    function renderCurrentStepsTable() {
        currentStepsTableContainer.innerHTML = '';

        if (currentTemplateSteps.length === 0) {
            currentStepsTableContainer.innerHTML = '<p>No steps added yet.</p>';
            saveTemplateButton.disabled = false;
            return;
        }
        saveTemplateButton.disabled = false;

        const table = document.createElement('table');
        const thead = table.createTHead();
        const headerRow = thead.insertRow();
        const headers = ["Step Category", "Step Name", "Action"];
        headers.forEach(text => { const th = document.createElement('th'); th.textContent = text; headerRow.appendChild(th); });

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
        // Asegurarse de cancelar edición de behavior si estaba activa
        if (editingBehaviorIndex !== -1) {
             cancelEditBehavior(); // Cancela visualmente la edición del behavior
        }
         // Restablecer estado de edición de plantilla
         currentEditingKey = null;
         currentTemplateSteps = [];
         templateStepsDiv.style.display = 'none';
         currentStepsTableContainer.innerHTML = '';
         accountInput.value = '';
         interactionTypeInput.value = '';
         clearStepInputs();
         saveTemplateButton.disabled = true;
    }


    // *** SECCIÓN MODIFICADA/NUEVA para renderizar y manejar Behaviors ***

    function loadAndDisplayBehaviors() {
        const behaviors = getBehaviors();
        renderBehaviorsList(behaviors);
    }

    function renderBehaviorsList(behaviors) {
        currentBehaviorsListDiv.innerHTML = '';
        editingBehaviorIndex = -1; // Resetear índice de edición al redibujar

        if (!Array.isArray(behaviors) || behaviors.length === 0) {
            currentBehaviorsListDiv.innerHTML = '<p>No behaviors defined.</p>';
            return;
        }

        const table = document.createElement('table');
        const thead = table.createTHead();
        const headerRow = thead.insertRow();
        ['Behavior Name', 'Actions'].forEach(text => {
            const th = document.createElement('th');
            th.textContent = text;
            headerRow.appendChild(th);
        });

        const tbody = table.createTBody();
        behaviors.forEach((behavior, index) => {
            const row = tbody.insertRow();
            row.id = `behavior-row-${index}`; // ID para la fila

            // --- Celda para Nombre del Behavior ---
            const nameCell = row.insertCell();
            nameCell.id = `behavior-name-cell-${index}`;
            // Contenido por defecto (span clickeable)
            const behaviorSpan = document.createElement('span');
            behaviorSpan.textContent = behavior;
            behaviorSpan.classList.add('behavior-text');
            behaviorSpan.title = 'Click to edit';
            behaviorSpan.onclick = () => startEditBehavior(index);
            nameCell.appendChild(behaviorSpan);

            // --- Celda para Acciones ---
            const actionsCell = row.insertCell();
            actionsCell.id = `behavior-actions-cell-${index}`;
            actionsCell.classList.add('actions-cell');
            // Contenido por defecto (botón Delete)
            const deleteButton = document.createElement('button');
            deleteButton.textContent = 'Delete';
            deleteButton.onclick = () => deleteBehavior(index);
            actionsCell.appendChild(deleteButton);

        });

        currentBehaviorsListDiv.appendChild(table);
    }


    function startEditBehavior(index) {
        if (editingBehaviorIndex !== -1 && editingBehaviorIndex !== index) {
             cancelEditBehavior();
        }
        if (editingBehaviorIndex === index) return; // Ya está en modo edición

        editingBehaviorIndex = index;

        const nameCell = document.getElementById(`behavior-name-cell-${index}`);
        const actionsCell = document.getElementById(`behavior-actions-cell-${index}`);
        const currentBehaviorText = getBehaviors()[index];

        if (!nameCell || !actionsCell) return;

        // Limpiar celda del nombre y acciones
        nameCell.innerHTML = '';
        actionsCell.innerHTML = ''; // Limpiar botón Delete

        // Crear Input
        const input = document.createElement('input');
        input.type = 'text';
        input.value = currentBehaviorText;
        input.classList.add('edit-behavior-input');
        input.id = `edit-input-${index}`;
        input.onkeydown = (event) => {
            if (event.key === 'Enter') {
                saveEditedBehavior();
            } else if (event.key === 'Escape') {
                cancelEditBehavior();
            }
        };
        nameCell.appendChild(input);

        // Crear botones Save y Cancel
        const saveBtn = document.createElement('button');
        saveBtn.textContent = 'Save';
        saveBtn.onclick = saveEditedBehavior;

        const cancelBtn = document.createElement('button');
        cancelBtn.textContent = 'Cancel';
        cancelBtn.onclick = cancelEditBehavior;

        // Añadir botones a la celda de acciones
        actionsCell.appendChild(saveBtn);
        actionsCell.appendChild(cancelBtn);

        input.focus();
        input.select();
    }


    function saveEditedBehavior() {
        if (editingBehaviorIndex === -1) return;

        const input = document.getElementById(`edit-input-${editingBehaviorIndex}`);
        if (!input) { // Si el input no existe (raro), cancelar
             cancelEditBehavior();
             return;
        }

        const newBehaviorName = input.value.trim();
        const behaviors = getBehaviors();
        const originalBehaviorName = behaviors[editingBehaviorIndex];

        if (!newBehaviorName) {
            alert("Behavior name cannot be empty.");
            input.focus(); // Devolver foco al input vacío
            return;
        }

        const lowerCaseNewName = newBehaviorName.toLowerCase();
        const duplicateExists = behaviors.some((b, i) =>
            i !== editingBehaviorIndex && b.toLowerCase() === lowerCaseNewName
        );

        if (duplicateExists) {
            alert(`Behavior "${newBehaviorName}" already exists (case-insensitive).`);
            input.focus(); // Devolver foco al input
            input.select();
            return;
        }

        let needsSave = false;
        // Solo actualizar si el nombre realmente cambió (incluyendo cambio de mayúsculas/minúsculas)
        if (newBehaviorName !== originalBehaviorName) {
             /* // Opcional: Confirmar el cambio
             if (!confirm(`Change "${originalBehaviorName}" to "${newBehaviorName}"?`)) {
                 cancelEditBehavior();
                 return;
             }
            */
            behaviors[editingBehaviorIndex] = newBehaviorName;
            needsSave = true; // Marcar que se necesita guardar y reordenar
        }

        if (needsSave) {
            behaviors.sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
            saveBehaviors(behaviors);
        }

        // Salir del modo edición y redibujar toda la lista
        editingBehaviorIndex = -1; // Marcar que ya no se edita
        renderBehaviorsList(getBehaviors()); // Redibujar completo
    }


    function cancelEditBehavior() {
         if (editingBehaviorIndex === -1) return;
         const indexToCancel = editingBehaviorIndex; // Guardar índice antes de resetear
         editingBehaviorIndex = -1; // Marcar que ya no se edita
         // Simplemente redibujar la fila o toda la tabla para restaurar
         renderBehaviorsList(getBehaviors()); // Redibujar la tabla completa es lo más simple
    }


     function addBehavior(behaviorToAdd) {
        // Cancelar edición si está activa
        if (editingBehaviorIndex !== -1) cancelEditBehavior();

        const behaviors = getBehaviors();
        const lowerCaseBehaviorToAdd = behaviorToAdd.toLowerCase();
        const exists = behaviors.some(b => b.toLowerCase() === lowerCaseBehaviorToAdd);

        if (!exists) {
            behaviors.push(behaviorToAdd);
            behaviors.sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
            saveBehaviors(behaviors);
            renderBehaviorsList(behaviors); // Redibujar la lista actualizada
        } else {
            alert(`Behavior "${behaviorToAdd}" already exists (case-insensitive).`);
        }
    }


    function deleteBehavior(indexToDelete) {
        // Cancelar edición si está activa antes de borrar
        if (editingBehaviorIndex !== -1) cancelEditBehavior();

        const behaviors = getBehaviors();
        if (indexToDelete >= 0 && indexToDelete < behaviors.length) {
            const deletedBehavior = behaviors[indexToDelete];
            if (confirm(`Are you sure you want to delete the behavior: "${deletedBehavior}"?`)) {
                behaviors.splice(indexToDelete, 1);
                saveBehaviors(behaviors);
                // getBehaviors se llamará en renderBehaviorsList y manejará los defaults si queda vacío
                renderBehaviorsList(getBehaviors());
            }
        }
    }
    // *** FIN SECCIÓN Behaviors ***


    // --- Funciones para Plantillas ---
    function loadAndDisplaySavedTemplates() {
        const allTemplates = getEvaluationTemplates();
        templatesDisplayArea.innerHTML = '';
        const keys = Object.keys(allTemplates).sort();

        if (keys.length === 0) {
            templatesDisplayArea.innerHTML = '<p>No templates saved yet.</p>';
            return;
        }

        keys.forEach(key => {
            const templateSteps = allTemplates[key];
            const [account, interactionType] = key.split('::');

            const templateContainer = document.createElement('div');
            templateContainer.classList.add('saved-template');

            const title = document.createElement('h4');
            title.textContent = `Template: ${account || '?'} - ${interactionType || '?'} `;

            const editTemplateButton = document.createElement('button');
            editTemplateButton.textContent = 'Edit';
            editTemplateButton.style.marginLeft = '10px';
            editTemplateButton.onclick = () => {
                accountInput.value = account || '';
                interactionTypeInput.value = interactionType || '';
                loadOrStartButton.click();
            };
            title.appendChild(editTemplateButton);

            const deleteTemplateButton = document.createElement('button');
            deleteTemplateButton.textContent = 'Delete';
            deleteTemplateButton.style.marginLeft = '5px';
            deleteTemplateButton.onclick = () => {
                if (confirm(`Are you sure you want to delete the template "${key}"? This cannot be undone.`)) {
                    deleteTemplate(key);
                }
            };
            title.appendChild(deleteTemplateButton);

            templateContainer.appendChild(title);

            const stepsList = document.createElement('ul');
            if (Array.isArray(templateSteps) && templateSteps.length > 0) {
                // Ordenar pasos por categoría y luego nombre para consistencia visual
                const sortedSteps = [...templateSteps].sort((a,b) => {
                    const catComp = (a.category || '').localeCompare(b.category || '');
                    if (catComp !== 0) return catComp;
                    return (a.name || '').localeCompare(b.name || '');
                });
                sortedSteps.forEach((step, i) => {
                    const li = document.createElement('li');
                    li.textContent = `${i + 1}. ${step.category || 'No Category'} - ${step.name || 'No Name'}`;
                    stepsList.appendChild(li);
                });
            } else {
                const li = document.createElement('li');
                li.textContent = 'No steps defined in this template.';
                li.style.fontStyle = 'italic';
                stepsList.appendChild(li);
            }
            templateContainer.appendChild(stepsList);
            templatesDisplayArea.appendChild(templateContainer);
        });
    }

     function deleteTemplate(keyToDelete) {
        // Cancelar edición si se está editando la plantilla a borrar
        if (currentEditingKey === keyToDelete) {
             cancelEditing(); // Llama a la función completa de cancelación
        }

        const allTemplates = getEvaluationTemplates();
        if (allTemplates[keyToDelete]) {
            delete allTemplates[keyToDelete];
            saveEvaluationTemplates(allTemplates);
            loadAndDisplaySavedTemplates(); // Actualizar lista visual
            alert(`Template "${keyToDelete}" deleted.`);
        } else {
            console.warn(`Attempted to delete non-existent template key: ${keyToDelete}`);
            alert(`Template "${keyToDelete}" not found.`);
        }
    }

}); // Fin de DOMContentLoaded