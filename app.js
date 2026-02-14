class MultiTapeTuringMachine {
  constructor(definition, inputTapes, blankSymbol = "#", initialSymbol = ">") {
    this.states = definition.states;
    this.startState = definition.startState;
    this.acceptStates = definition.acceptStates;
    this.transitions = definition.transitions;
    this.tapeCount = definition.tapeCount;
    this.blankSymbol = blankSymbol;
    this.initialSymbol = initialSymbol;
    this.initialTapes = inputTapes.map((tape) => [...tape]);
    this.reset(inputTapes);
  }

  reset(inputTapes = this.initialTapes) {
    this.currentState = this.startState;
    this.stepCount = 0;
    this.halted = false;
    this.haltReason = "";
    this.lastTransitionKey = null;
    this.heads = Array(this.tapeCount).fill(0);
    this.tapes = Array.from({ length: this.tapeCount }, () => new Map());

    inputTapes.forEach((symbols, tapeIndex) => {
      symbols.forEach((symbol, pos) => {
        if (symbol !== this.blankSymbol) {
          this.tapes[tapeIndex].set(pos, symbol);
        }
      });
    });
  }

  read(tapeIndex) {
    const head = this.heads[tapeIndex];
    const tape = this.tapes[tapeIndex];
    return tape.has(head) ? tape.get(head) : this.blankSymbol;
  }

  write(tapeIndex, symbol) {
    const head = this.heads[tapeIndex];
    if (symbol === this.blankSymbol) {
      this.tapes[tapeIndex].delete(head);
      return;
    }
    this.tapes[tapeIndex].set(head, symbol);
  }

  step() {
    if (this.halted) {
      return { status: "halted", message: this.haltReason || "La máquina ya está detenida." };
    }

    if (this.acceptStates.has(this.currentState)) {
      this.halted = true;
      this.haltReason = "Aceptación.";
      return { status: "accept", message: "La máquina llegó a un estado de aceptación." };
    }

    const readSymbols = this.heads.map((_, i) => this.read(i));
    const key = `${this.currentState}|${readSymbols.join("\u0001")}`;
    const transition = this.transitions.get(key);

    if (!transition) {
      this.halted = true;
      this.haltReason = "Sin transición aplicable.";
      this.lastTransitionKey = null;
      return {
        status: "halted",
        message: `No existe transición para ${this.currentState} (${readSymbols.join(", ")}).`,
      };
    }

    this.lastTransitionKey = key;
    transition.actions.forEach((action, tapeIndex) => {
      if (action.writeSymbol !== null && action.writeSymbol !== "") {
        this.write(tapeIndex, action.writeSymbol);
      }

      if (action.move === "R") {
        this.heads[tapeIndex] += 1;
      } else if (action.move === "L") {
        this.heads[tapeIndex] -= 1;
      }
    });

    this.currentState = transition.nextState;
    this.stepCount += 1;

    if (this.acceptStates.has(this.currentState)) {
      this.halted = true;
      this.haltReason = "Aceptación.";
      return { status: "accept", message: "La máquina aceptó la entrada." };
    }

    return { status: "running", message: "Paso ejecutado." };
  }
}

const SVG_NS = "http://www.w3.org/2000/svg";
const GRAPH_WIDTH = 1100;
const GRAPH_HEIGHT = 460;
const NODE_RADIUS = 30;

const ui = {
  addState: document.getElementById("addState"),
  setStart: document.getElementById("setStart"),
  toggleAccept: document.getElementById("toggleAccept"),
  deleteState: document.getElementById("deleteState"),
  selectedState: document.getElementById("selectedState"),
  stateGraph: document.getElementById("stateGraph"),
  selectedTransition: document.getElementById("selectedTransition"),
  transitionInput: document.getElementById("transitionInput"),
  saveTransition: document.getElementById("saveTransition"),
  deleteTransition: document.getElementById("deleteTransition"),
  clearTransition: document.getElementById("clearTransition"),
  tapesInput: document.getElementById("tapesInput"),
  transitionsPreview: document.getElementById("transitionsPreview"),
  transitionsTable: document.getElementById("transitionsTable"),
  transitionsTableHead: document.getElementById("transitionsTableHead"),
  transitionsTableBody: document.getElementById("transitionsTableBody"),
  addTransitionRow: document.getElementById("addTransitionRow"),
  deleteTransitionRow: document.getElementById("deleteTransitionRow"),
  applyTransitionTable: document.getElementById("applyTransitionTable"),
  initialize: document.getElementById("initialize"),
  reset: document.getElementById("reset"),
  step: document.getElementById("step"),
  run: document.getElementById("run"),
  pause: document.getElementById("pause"),
  speed: document.getElementById("speed"),
  speedValue: document.getElementById("speedValue"),
  currentState: document.getElementById("currentState"),
  stepCount: document.getElementById("stepCount"),
  message: document.getElementById("message"),
  tapeArea: document.getElementById("tapeArea"),
  loadExample: document.getElementById("loadExample"),
};

const editor = {
  nodes: new Map(),
  transitions: [],
  selectedState: null,
  selectedTransitionKey: null,
  selectedTableRow: null,
};

const interaction = {
  dragNode: null,
  dragPointerId: null,
  linkFrom: null,
  linkTo: null,
  inlineEditor: null,
};

let machine = null;
let runTimer = null;

function message(text, type = "warn") {
  ui.message.textContent = text;
  ui.message.className = "";
  ui.message.classList.add(`message-${type}`);
  ui.message.setAttribute("aria-live", type === "err" ? "assertive" : "polite");
}

function setRunButtons(enabled) {
  ui.step.disabled = !enabled;
  ui.run.disabled = !enabled;
  ui.pause.disabled = true;
}

function isEditableElement(target) {
  if (!(target instanceof HTMLElement)) {
    return false;
  }
  const tag = target.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || target.isContentEditable;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function splitByCommaPreserve(value) {
  return value.split(",").map((s) => s.trim());
}

function parseTapeDefinitions(raw) {
  const lines = raw
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#"));

  if (!lines.length) {
    throw new Error("Debes definir al menos una cinta.");
  }

  return lines.map((line, idx) => {
    const match = line.match(/^([a-zA-Z][\w-]*)\s*=\s*\[(.*)\]$/);
    if (!match) {
      throw new Error(`Formato inválido en cintas, línea ${idx + 1}. Usa: cinta1=[>,1,#]`);
    }
    const name = match[1];
    const symbols = splitByCommaPreserve(match[2]).map((s) => s.trim());

    if (!symbols.length || (symbols.length === 1 && symbols[0] === "")) {
      throw new Error(`La cinta ${name} no puede estar vacía.`);
    }

    const cleaned = symbols.map((s) => (s === "" ? "#" : s));
    return { name, symbols: cleaned };
  });
}

function parseActionToken(rawToken) {
  const token = rawToken.trim();

  if (token === "") {
    return { writeSymbol: null, move: "S" };
  }

  if (token.includes("|")) {
    const [writePart, movePart] = token.split("|").map((s) => s.trim());
    return {
      writeSymbol: writePart || null,
      move: normalizeMove(movePart || "S"),
    };
  }

  if (token.includes("&")) {
    const [writePart, movePart] = token.split("&").map((s) => s.trim());
    return {
      writeSymbol: writePart || null,
      move: normalizeMove(movePart || "S"),
    };
  }

  if (token === "->") {
    return { writeSymbol: null, move: "R" };
  }
  if (token === "<-") {
    return { writeSymbol: null, move: "L" };
  }
  if (token.endsWith("->")) {
    const writeSymbol = token.slice(0, -2).trim();
    return { writeSymbol: writeSymbol || null, move: "R" };
  }
  if (token.endsWith("<-")) {
    const writeSymbol = token.slice(0, -2).trim();
    return { writeSymbol: writeSymbol || null, move: "L" };
  }

  return { writeSymbol: token, move: "S" };
}

function normalizeMove(moveRaw) {
  const move = moveRaw.trim().toUpperCase();
  if (["R", "->", "DERECHA"].includes(move)) {
    return "R";
  }
  if (["L", "<-", "IZQUIERDA"].includes(move)) {
    return "L";
  }
  if (["S", "QUIETO", "STAY", ""].includes(move)) {
    return "S";
  }
  throw new Error(`Movimiento inválido: ${moveRaw}`);
}

function parseTransitionLine(line) {
  const cleaned = line.trim();
  const match = cleaned.match(/^([a-zA-Z][\w-]*)\s*\(([^)]*)\)\s*->\s*\(([^)]*)\)$/);

  if (!match) {
    throw new Error("Formato inválido. Usa: e0 (>,>) -> (->, 1->, e1)");
  }

  const fromState = match[1].trim();
  const readSymbols = splitByCommaPreserve(match[2]).map((s) => s.trim());
  const rhsParts = splitByCommaPreserve(match[3]);

  if (rhsParts.length < 2) {
    throw new Error("La parte derecha debe incluir acciones por cinta y el estado final.");
  }

  const nextState = rhsParts[rhsParts.length - 1].trim();
  if (!nextState) {
    throw new Error("Debes indicar el estado final al final de la transición.");
  }

  const actions = rhsParts.slice(0, -1).map(parseActionToken);

  return {
    fromState,
    readSymbols,
    actions,
    nextState,
  };
}

function transitionKey(fromState, readSymbols) {
  return `${fromState}|${readSymbols.join("\u0001")}`;
}

function edgeKey(fromState, toState) {
  return `${fromState}=>${toState}`;
}

function actionTokenFrom(action) {
  if (action.move === "R") {
    return action.writeSymbol ? `${action.writeSymbol}->` : "->";
  }
  if (action.move === "L") {
    return action.writeSymbol ? `${action.writeSymbol}<-` : "<-";
  }
  return action.writeSymbol || "";
}

function transitionToLine(transition) {
  const left = `${transition.fromState} (${transition.readSymbols.join(", ")})`;
  const rightActions = transition.actions.map(actionTokenFrom).join(", ");
  return `${left} -> (${rightActions}, ${transition.nextState})`;
}

function edgeKeyFromTransition(transition) {
  return edgeKey(transition.fromState, transition.nextState);
}

function findTransitionsByEdgeKey(key) {
  const [fromState, toState] = key.split("=>");
  return editor.transitions.filter(
    (transition) => transition.fromState === fromState && transition.nextState === toState,
  );
}

function hasEdgeKey(key) {
  return findTransitionsByEdgeKey(key).length > 0;
}

function transitionsToMultiline(transitions) {
  return transitions.map(transitionToLine).join("\n");
}

function groupTransitionsByEdge() {
  const groups = new Map();
  editor.transitions.forEach((transition) => {
    const key = edgeKeyFromTransition(transition);
    if (!groups.has(key)) {
      groups.set(key, {
        key,
        fromState: transition.fromState,
        toState: transition.nextState,
        transitions: [],
      });
    }
    groups.get(key).transitions.push(transition);
  });
  return [...groups.values()];
}

function updateGraphAriaLabel() {
  const edgeCount = groupTransitionsByEdge().length;
  const selectedState = editor.selectedState || "ninguno";
  const selectedEdge = editor.selectedTransitionKey || "ninguna";
  ui.stateGraph.setAttribute(
    "aria-label",
    `Editor de diagrama: ${editor.nodes.size} estados, ${edgeCount} flechas. Estado seleccionado: ${selectedState}. Flecha seleccionada: ${selectedEdge}.`,
  );
}

function refreshTransitionsPreview() {
  const lines = editor.transitions.map(transitionToLine).sort((a, b) => a.localeCompare(b));
  ui.transitionsPreview.value = lines.join("\n");
}

function refreshTransitionEditors() {
  refreshTransitionsPreview();
  renderTransitionsTable();
}

function refreshSelectedState() {
  ui.selectedState.textContent = editor.selectedState || "(ninguno)";
}

function refreshSelectedTransition() {
  if (!editor.selectedTransitionKey) {
    ui.selectedTransition.textContent = "(ninguna)";
    return;
  }
  const transitions = findTransitionsByEdgeKey(editor.selectedTransitionKey);
  if (!transitions.length) {
    ui.selectedTransition.textContent = "(ninguna)";
    return;
  }
  ui.selectedTransition.textContent = `${editor.selectedTransitionKey} (${transitions.length} transición(es))`;
}

function clearTransitionSelection() {
  editor.selectedTransitionKey = null;
  closeInlineTransitionEditor();
  refreshSelectedTransition();
}

function setTransitionEditorLine(line) {
  ui.transitionInput.value = line;
}

function closeInlineTransitionEditor() {
  interaction.inlineEditor = null;
}

function placeInlineEditor(edgeKey, text, clientX, clientY) {
  const rect = ui.stateGraph.getBoundingClientRect();
  const left = Math.max(8, Math.min(rect.width - 528, clientX - rect.left + 10));
  const top = Math.max(8, Math.min(rect.height - 180, clientY - rect.top + 10));
  interaction.inlineEditor = {
    edgeKey,
    text,
    left,
    top,
  };
}

function openInlineTransitionEditor(edgeKey, clientX, clientY) {
  const transitions = findTransitionsByEdgeKey(edgeKey);
  if (!transitions.length) {
    return;
  }
  placeInlineEditor(edgeKey, transitionsToMultiline(transitions), clientX, clientY);
}

function selectTransitionByKey(key) {
  if (!hasEdgeKey(key)) {
    clearTransitionSelection();
    return;
  }
  editor.selectedTransitionKey = key;
  const transitions = findTransitionsByEdgeKey(key);
  setTransitionEditorLine(transitions[0] ? transitionToLine(transitions[0]) : "");
  refreshSelectedTransition();
}

function getExpectedTapeCount() {
  try {
    return parseTapeDefinitions(ui.tapesInput.value).length;
  } catch {
    return null;
  }
}

function getTapeCountForTable() {
  return getExpectedTapeCount() || 2;
}

function tableInput(value = "") {
  const input = document.createElement("input");
  input.type = "text";
  input.value = value;
  input.spellcheck = false;
  return input;
}

function createTransitionRowElement(tapeCount, transition = null) {
  const tr = document.createElement("tr");

  const fromState = transition ? transition.fromState : "";
  const toState = transition ? transition.nextState : "";
  const readSymbols = transition ? transition.readSymbols : Array(tapeCount).fill("#");
  const actions = transition
    ? transition.actions.map(actionTokenFrom)
    : Array(tapeCount).fill("->");

  const stateCell = document.createElement("td");
  stateCell.appendChild(tableInput(fromState));
  tr.appendChild(stateCell);

  for (let i = 0; i < tapeCount; i += 1) {
    const cell = document.createElement("td");
    cell.appendChild(tableInput(readSymbols[i] ?? "#"));
    tr.appendChild(cell);
  }

  for (let i = 0; i < tapeCount; i += 1) {
    const cell = document.createElement("td");
    cell.appendChild(tableInput(actions[i] ?? "->"));
    tr.appendChild(cell);
  }

  const finalCell = document.createElement("td");
  finalCell.appendChild(tableInput(toState));
  tr.appendChild(finalCell);

  tr.addEventListener("click", () => {
    [...ui.transitionsTableBody.querySelectorAll("tr")].forEach((row) => row.classList.remove("selected"));
    tr.classList.add("selected");
    editor.selectedTableRow = tr;
  });

  return tr;
}

function renderTransitionsTable() {
  const tapeCount = getTapeCountForTable();
  const headRow = document.createElement("tr");

  const baseHead = document.createElement("th");
  baseHead.textContent = "Estado";
  headRow.appendChild(baseHead);

  for (let i = 0; i < tapeCount; i += 1) {
    const th = document.createElement("th");
    th.textContent = `Valor Cinta ${i + 1}`;
    headRow.appendChild(th);
  }
  for (let i = 0; i < tapeCount; i += 1) {
    const th = document.createElement("th");
    th.textContent = `Acción Cinta ${i + 1}`;
    headRow.appendChild(th);
  }
  const endHead = document.createElement("th");
  endHead.textContent = "Estado Final";
  headRow.appendChild(endHead);

  ui.transitionsTableHead.innerHTML = "";
  ui.transitionsTableHead.appendChild(headRow);
  ui.transitionsTableBody.innerHTML = "";

  const rows = [...editor.transitions].sort((a, b) =>
    transitionToLine(a).localeCompare(transitionToLine(b)),
  );
  rows.forEach((transition) => {
    ui.transitionsTableBody.appendChild(createTransitionRowElement(tapeCount, transition));
  });

  editor.selectedTableRow = null;
}

function collectTransitionsFromTable() {
  const tapeCount = getTapeCountForTable();
  const parsed = [];
  const rows = [...ui.transitionsTableBody.querySelectorAll("tr")];

  rows.forEach((row) => {
    const values = [...row.querySelectorAll("input")].map((input) => input.value.trim());
    const fromState = values[0];
    const readSymbols = values.slice(1, 1 + tapeCount).map((x) => (x === "" ? "#" : x));
    const actionTokens = values
      .slice(1 + tapeCount, 1 + (2 * tapeCount))
      .map((x) => (x === "" ? "->" : x));
    const nextState = values[1 + (2 * tapeCount)];

    if (
      !fromState &&
      !nextState &&
      readSymbols.every((x) => x === "#") &&
      actionTokens.every((x) => x === "->")
    ) {
      return;
    }

    const actions = actionTokens.map(parseActionToken);
    parsed.push({
      fromState,
      readSymbols,
      actions,
      nextState,
    });
  });

  return parsed;
}

function applyTransitionsFromTable() {
  try {
    const rows = collectTransitionsFromTable();
    const expected = getExpectedTapeCount();
    const next = [];
    const seen = new Set();

    rows.forEach((parsed) => {
      if (!parsed.fromState || !parsed.nextState) {
        throw new Error("Todas las filas deben tener Estado y Estado Final.");
      }
      if (!editor.nodes.has(parsed.fromState) || !editor.nodes.has(parsed.nextState)) {
        throw new Error(
          `Fila inválida: estado no existe en el diagrama (${parsed.fromState} -> ${parsed.nextState}).`,
        );
      }
      validateTransitionTapeWidth(parsed, expected);
      const key = transitionKey(parsed.fromState, parsed.readSymbols);
      if (seen.has(key)) {
        throw new Error(`Transición duplicada para ${parsed.fromState} (${parsed.readSymbols.join(", ")}).`);
      }
      seen.add(key);
      next.push({
        ...parsed,
        key,
      });
    });

    editor.transitions = next;
    if (editor.selectedTransitionKey && !hasEdgeKey(editor.selectedTransitionKey)) {
      clearTransitionSelection();
      setTransitionEditorLine("");
    } else {
      refreshSelectedTransition();
    }
    refreshTransitionsPreview();
    renderTransitionsTable();
    renderStateGraph();
    message("Tabla de transiciones aplicada.", "ok");
  } catch (err) {
    message(err.message, "err");
  }
}

function validateTransitionTapeWidth(parsed, expectedTapeCount) {
  if (expectedTapeCount === null) {
    return;
  }
  if (parsed.readSymbols.length !== expectedTapeCount) {
    throw new Error(`La lectura debe tener ${expectedTapeCount} valores (uno por cinta).`);
  }
  if (parsed.actions.length !== expectedTapeCount) {
    throw new Error(`Las acciones deben tener ${expectedTapeCount} valores (uno por cinta).`);
  }
}

function ensureStateName(name) {
  if (!name || !/^[a-zA-Z][\w-]*$/.test(name)) {
    throw new Error("Nombre de estado inválido. Usa letras, números, _ o -.");
  }
}

function generateStateName() {
  let i = 0;
  while (editor.nodes.has(`e${i}`)) {
    i += 1;
  }
  return `e${i}`;
}

function addState(name, x, y) {
  ensureStateName(name);
  if (editor.nodes.has(name)) {
    throw new Error(`El estado ${name} ya existe.`);
  }

  const hasStart = [...editor.nodes.values()].some((n) => n.isStart);
  editor.nodes.set(name, {
    x,
    y,
    isStart: !hasStart,
    isAccept: false,
  });

  editor.selectedState = name;
  refreshSelectedState();
  renderStateGraph();
}

function deleteSelectedState() {
  if (!editor.selectedState || !editor.nodes.has(editor.selectedState)) {
    message("Selecciona un estado para eliminar.", "warn");
    return;
  }

  const state = editor.selectedState;
  editor.nodes.delete(state);
  editor.transitions = editor.transitions.filter(
    (t) => t.fromState !== state && t.nextState !== state,
  );

  editor.selectedState = null;
  clearTransitionSelection();
  setTransitionEditorLine("");
  refreshSelectedState();
  refreshTransitionEditors();
  renderStateGraph();
  message(`Estado ${state} eliminado.`, "ok");
}

function setStartState() {
  const state = editor.selectedState;
  if (!state || !editor.nodes.has(state)) {
    message("Selecciona un estado para marcar inicio.", "warn");
    return;
  }

  editor.nodes.forEach((node) => {
    node.isStart = false;
  });
  editor.nodes.get(state).isStart = true;
  renderStateGraph();
  message(`Estado inicial: ${state}.`, "ok");
}

function toggleAcceptState() {
  const state = editor.selectedState;
  if (!state || !editor.nodes.has(state)) {
    message("Selecciona un estado para alternar aceptación.", "warn");
    return;
  }

  const node = editor.nodes.get(state);
  node.isAccept = !node.isAccept;
  renderStateGraph();
  message(`Estado ${state} ${node.isAccept ? "marcado" : "desmarcado"} como aceptación.`, "ok");
}

function addOrReplaceTransition(parsed, options = {}) {
  const { render = true } = options;
  const key = transitionKey(parsed.fromState, parsed.readSymbols);
  const idx = editor.transitions.findIndex((t) => transitionKey(t.fromState, t.readSymbols) === key);

  const transition = {
    fromState: parsed.fromState,
    nextState: parsed.nextState,
    readSymbols: parsed.readSymbols,
    actions: parsed.actions,
    key,
  };

  if (idx >= 0) {
    editor.transitions[idx] = transition;
  } else {
    editor.transitions.push(transition);
  }

  editor.selectedTransitionKey = edgeKey(parsed.fromState, parsed.nextState);
  if (render) {
    refreshSelectedTransition();
    refreshTransitionEditors();
    renderStateGraph();
  }
}

function prepareTransitionDraft(fromState, toState, clientX = null, clientY = null) {
  const expected = getExpectedTapeCount() || 2;
  const reads = Array(expected).fill("#").join(", ");
  const actions = Array(expected).fill("->").join(", ");
  const draft = `${fromState} (${reads}) -> (${actions}, ${toState})`;
  setTransitionEditorLine(draft);
  editor.selectedTransitionKey = edgeKey(fromState, toState);
  refreshSelectedTransition();
  if (clientX !== null && clientY !== null) {
    placeInlineEditor(edgeKey(fromState, toState), draft, clientX, clientY);
  }
  renderStateGraph();
}

function replaceTransitionsForEdge(edgePairKey, parsedTransitions) {
  const [fromState, toState] = edgePairKey.split("=>");
  editor.transitions = editor.transitions.filter(
    (t) => !(t.fromState === fromState && t.nextState === toState),
  );
  parsedTransitions.forEach((parsed) => {
    addOrReplaceTransition(parsed, { render: false });
  });
}

function saveTransitionFromEditor(rawLine = null, closeInline = false, forcedEdgeKey = null) {
  const raw = (rawLine ?? ui.transitionInput.value).trim();
  if (!raw) {
    message("Escribe una transición antes de guardar.", "warn");
    return;
  }

  try {
    const lines = raw
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith("#"));
    if (!lines.length) {
      throw new Error("No hay transiciones válidas para guardar.");
    }

    const expectedTapeCount = getExpectedTapeCount();
    const parsedList = lines.map((line) => {
      const parsed = parseTransitionLine(line);
      if (!editor.nodes.has(parsed.fromState) || !editor.nodes.has(parsed.nextState)) {
        throw new Error("Los estados de la transición deben existir en el diagrama.");
      }
      validateTransitionTapeWidth(parsed, expectedTapeCount);
      return parsed;
    });

    const targetEdgeKey = forcedEdgeKey || editor.selectedTransitionKey;
    if (targetEdgeKey) {
      const invalid = parsedList.find((p) => edgeKey(p.fromState, p.nextState) !== targetEdgeKey);
      if (invalid) {
        throw new Error(`Todas las líneas deben pertenecer a la flecha ${targetEdgeKey}.`);
      }
    }

    const pairKey = targetEdgeKey || edgeKey(parsedList[0].fromState, parsedList[0].nextState);
    const seen = new Set();
    parsedList.forEach((parsed) => {
      const key = transitionKey(parsed.fromState, parsed.readSymbols);
      if (seen.has(key)) {
        throw new Error(`Transición duplicada para ${parsed.fromState} (${parsed.readSymbols.join(", ")}).`);
      }
      seen.add(key);
    });

    replaceTransitionsForEdge(pairKey, parsedList);
    editor.selectedTransitionKey = pairKey;
    refreshSelectedTransition();
    refreshTransitionEditors();
    renderStateGraph();

    if (interaction.inlineEditor) {
      interaction.inlineEditor.text = transitionsToMultiline(findTransitionsByEdgeKey(pairKey));
      interaction.inlineEditor.edgeKey = pairKey;
      if (closeInline) {
        closeInlineTransitionEditor();
      }
    }
    message("Transición guardada.", "ok");
  } catch (err) {
    message(err.message, "err");
  }
}

function deleteSelectedTransition() {
  if (!editor.selectedTransitionKey) {
    message("Selecciona una transición para eliminar.", "warn");
    return;
  }
  const before = editor.transitions.length;
  const [fromState, toState] = editor.selectedTransitionKey.split("=>");
  editor.transitions = editor.transitions.filter(
    (t) => !(t.fromState === fromState && t.nextState === toState),
  );
  if (editor.transitions.length === before) {
    message("No se encontró la transición seleccionada.", "warn");
    return;
  }
  clearTransitionSelection();
  setTransitionEditorLine("");
  refreshTransitionEditors();
  renderStateGraph();
  message("Transición eliminada.", "ok");
}

function importTransitionsFromPreview() {
  const lines = ui.transitionsPreview.value
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#"));

  try {
    const next = [];
    const seen = new Set();
    const expected = getExpectedTapeCount();
    lines.forEach((line) => {
      const parsed = parseTransitionLine(line);
      if (!editor.nodes.has(parsed.fromState) || !editor.nodes.has(parsed.nextState)) {
        throw new Error(`La transición usa estados no existentes: ${line}`);
      }
      validateTransitionTapeWidth(parsed, expected);
      const key = transitionKey(parsed.fromState, parsed.readSymbols);
      if (seen.has(key)) {
        throw new Error(`Transición duplicada para ${parsed.fromState} (${parsed.readSymbols.join(", ")}).`);
      }
      seen.add(key);
      next.push({
        ...parsed,
        key,
      });
    });
    editor.transitions = next;
    if (editor.selectedTransitionKey && !hasEdgeKey(editor.selectedTransitionKey)) {
      clearTransitionSelection();
      setTransitionEditorLine("");
    } else {
      refreshSelectedTransition();
    }
    refreshTransitionEditors();
    renderStateGraph();
    message("Transiciones actualizadas desde el editor de texto.", "ok");
  } catch (err) {
    refreshTransitionEditors();
    message(err.message, "err");
  }
}

function createSvgElement(tag, attrs = {}) {
  const el = document.createElementNS(SVG_NS, tag);
  Object.entries(attrs).forEach(([k, v]) => el.setAttribute(k, String(v)));
  return el;
}

function countEdgePairs(edges) {
  const map = new Map();
  edges.forEach((edge) => {
    const pair = `${edge.fromState}=>${edge.toState}`;
    map.set(pair, (map.get(pair) || 0) + 1);
  });
  return map;
}

function renderStateGraph() {
  if (!editor.nodes.size) {
    ui.stateGraph.innerHTML = '<div class="graph-empty">Doble clic para crear el primer estado.</div>';
    updateGraphAriaLabel();
    return;
  }

  ui.stateGraph.innerHTML = "";

  const svg = createSvgElement("svg", {
    viewBox: `0 0 ${GRAPH_WIDTH} ${GRAPH_HEIGHT}`,
    role: "img",
    "aria-label": "Editor de máquina de Turing",
  });

  const defs = createSvgElement("defs");
  const arrow = createSvgElement("marker", {
    id: "arrow-default",
    markerWidth: 10,
    markerHeight: 10,
    refX: 9,
    refY: 5,
    orient: "auto",
    markerUnits: "strokeWidth",
  });
  arrow.appendChild(createSvgElement("path", { d: "M0,0 L10,5 L0,10 Z", fill: "#64748b" }));

  const arrowActive = createSvgElement("marker", {
    id: "arrow-active",
    markerWidth: 12,
    markerHeight: 12,
    refX: 10,
    refY: 6,
    orient: "auto",
    markerUnits: "strokeWidth",
  });
  arrowActive.appendChild(createSvgElement("path", { d: "M0,0 L12,6 L0,12 Z", fill: "#38bdf8" }));

  defs.appendChild(arrow);
  defs.appendChild(arrowActive);
  svg.appendChild(defs);

  const edgeGroups = groupTransitionsByEdge();
  const pairTotals = countEdgePairs(edgeGroups);
  const pairSeen = new Map();

  edgeGroups.forEach((edgeGroup) => {
    const from = editor.nodes.get(edgeGroup.fromState);
    const to = editor.nodes.get(edgeGroup.toState);
    if (!from || !to) {
      return;
    }

    const pairKey = edgeGroup.key;
    const reverseKey = `${edgeGroup.toState}=>${edgeGroup.fromState}`;
    const total = pairTotals.get(pairKey) || 1;
    const idx = pairSeen.get(pairKey) || 0;
    pairSeen.set(pairKey, idx + 1);

    const hasReverse = pairTotals.has(reverseKey);
    const active = Boolean(
      machine && edgeGroup.transitions.some((transition) => transition.key === machine.lastTransitionKey),
    );

    const group = createSvgElement("g", { "data-edge": edgeGroup.key });
    const isSelected = editor.selectedTransitionKey === edgeGroup.key;
    const path = createSvgElement("path", {
      class: `edge-path${active ? " edge-active" : ""}${isSelected ? " edge-selected" : ""}`,
      "marker-end": active ? "url(#arrow-active)" : "url(#arrow-default)",
      "data-edge": edgeGroup.key,
    });

    const label = createSvgElement("text", {
      class: `edge-label${active ? " edge-label-active" : ""}`,
      "data-edge": edgeGroup.key,
    });

    let labelX = 0;
    let labelY = 0;

    if (edgeGroup.fromState === edgeGroup.toState) {
      const x = from.x;
      const y = from.y;
      const h = 72 + idx * 14;
      const sx = x + NODE_RADIUS * 0.7;
      const sy = y - NODE_RADIUS * 0.7;
      const ex = x - NODE_RADIUS * 0.7;
      const ey = y - NODE_RADIUS * 0.7;
      const c1x = x + 58;
      const c1y = y - h;
      const c2x = x - 58;
      const c2y = y - h;
      path.setAttribute("d", `M ${sx} ${sy} C ${c1x} ${c1y}, ${c2x} ${c2y}, ${ex} ${ey}`);
      labelX = x;
      labelY = y - h - 8;
      label.setAttribute("x", String(labelX));
      label.setAttribute("y", String(labelY));
    } else {
      const dx = to.x - from.x;
      const dy = to.y - from.y;
      const dist = Math.hypot(dx, dy) || 1;
      const ux = dx / dist;
      const uy = dy / dist;
      const nx = -uy;
      const ny = ux;

      const sx = from.x + ux * NODE_RADIUS;
      const sy = from.y + uy * NODE_RADIUS;
      const ex = to.x - ux * NODE_RADIUS;
      const ey = to.y - uy * NODE_RADIUS;

      let curve = 24 * (idx - (total - 1) / 2);
      if (hasReverse && total === 1) {
        curve += edgeGroup.fromState < edgeGroup.toState ? -20 : 20;
      }

      const mx = (sx + ex) / 2;
      const my = (sy + ey) / 2;
      const cx = mx + nx * curve;
      const cy = my + ny * curve;

      path.setAttribute("d", `M ${sx} ${sy} Q ${cx} ${cy} ${ex} ${ey}`);

      const t = 0.5;
      const lx = (1 - t) * (1 - t) * sx + 2 * (1 - t) * t * cx + t * t * ex;
      const ly = (1 - t) * (1 - t) * sy + 2 * (1 - t) * t * cy + t * t * ey;
      labelX = lx + nx * (curve >= 0 ? 10 : -10);
      labelY = ly + ny * (curve >= 0 ? 10 : -10);
      label.setAttribute("x", String(labelX));
      label.setAttribute("y", String(labelY));
    }

    path.setAttribute("data-lx", String(labelX));
    path.setAttribute("data-ly", String(labelY));
    label.setAttribute("data-lx", String(labelX));
    label.setAttribute("data-ly", String(labelY));

    edgeGroup.transitions.forEach((transition, lineIndex) => {
      const tspan = createSvgElement("tspan", {
        x: String(labelX),
        dy: lineIndex === 0 ? "0" : "1.2em",
        "data-edge": edgeGroup.key,
      });
      tspan.textContent = `${transition.readSymbols.join(",")} -> (${transition.actions
        .map(actionTokenFrom)
        .join(",")})`;
      label.appendChild(tspan);
    });

    const totalLines = edgeGroup.transitions.length;
    if (totalLines > 1) {
      label.setAttribute("y", String(labelY - ((totalLines - 1) * 8)));
    }

    group.appendChild(path);
    group.appendChild(label);
    svg.appendChild(group);
  });

  if (interaction.linkFrom && interaction.linkTo) {
    const from = editor.nodes.get(interaction.linkFrom);
    const preview = createSvgElement("path", {
      class: "edge-preview",
      d: `M ${from.x} ${from.y} L ${interaction.linkTo.x} ${interaction.linkTo.y}`,
    });
    svg.appendChild(preview);
  }

  editor.nodes.forEach((node, name) => {
    const group = createSvgElement("g", { "data-node": name });
    const classes = ["node-circle"];

    if (node.isStart) {
      classes.push("node-start");
    }
    if (node.isAccept) {
      classes.push("node-accept");
    }
    if (editor.selectedState === name) {
      classes.push("node-selected");
    }
    if (machine && machine.currentState === name) {
      classes.push("node-active");
    }

    const circle = createSvgElement("circle", {
      cx: node.x,
      cy: node.y,
      r: NODE_RADIUS,
      class: classes.join(" "),
      "data-node": name,
    });

    if (node.isAccept) {
      group.appendChild(
        createSvgElement("circle", {
          cx: node.x,
          cy: node.y,
          r: NODE_RADIUS - 7,
          fill: "none",
          stroke: "#22c55e",
          "stroke-width": 2,
          "data-node": name,
        }),
      );
    }

    if (node.isStart) {
      group.appendChild(
        createSvgElement("line", {
          x1: node.x - 56,
          y1: node.y,
          x2: node.x - NODE_RADIUS - 4,
          y2: node.y,
          stroke: "#fbbf24",
          "stroke-width": 2,
          "marker-end": "url(#arrow-default)",
          "data-node": name,
        }),
      );
    }

    const text = createSvgElement("text", {
      x: node.x,
      y: node.y,
      class: "node-label",
      "data-node": name,
    });
    text.textContent = name;

    group.appendChild(circle);
    group.appendChild(text);
    svg.appendChild(group);
  });

  ui.stateGraph.appendChild(svg);

  if (interaction.inlineEditor) {
    const container = document.createElement("div");
    container.className = "inline-transition-editor";
    container.setAttribute("role", "dialog");
    container.setAttribute("aria-label", "Editor en línea de transiciones");
    container.style.left = `${interaction.inlineEditor.left}px`;
    container.style.top = `${interaction.inlineEditor.top}px`;
    container.innerHTML = `
      <textarea id="inlineTransitionInput" rows="6" aria-label="Editar transiciones de la flecha"></textarea>
      <div class="inline-transition-actions">
        <button id="inlineTransitionSave" type="button" aria-label="Guardar transiciones">Guardar</button>
        <button id="inlineTransitionDelete" type="button" aria-label="Eliminar transiciones de esta flecha">Eliminar</button>
        <button id="inlineTransitionClose" type="button" aria-label="Cerrar editor en línea">Cerrar</button>
      </div>
    `;
    ui.stateGraph.appendChild(container);

    const inlineInput = document.getElementById("inlineTransitionInput");
    const inlineSave = document.getElementById("inlineTransitionSave");
    const inlineDelete = document.getElementById("inlineTransitionDelete");
    const inlineClose = document.getElementById("inlineTransitionClose");

    inlineInput.value = interaction.inlineEditor.text;
    inlineInput.focus();
    inlineInput.setSelectionRange(inlineInput.value.length, inlineInput.value.length);

    inlineInput.addEventListener("input", () => {
      interaction.inlineEditor.text = inlineInput.value;
    });
    inlineInput.addEventListener("keydown", (event) => {
      if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
        event.preventDefault();
        saveTransitionFromEditor(inlineInput.value, true, interaction.inlineEditor.edgeKey);
      }
      if (event.key === "Escape") {
        event.preventDefault();
        closeInlineTransitionEditor();
        renderStateGraph();
      }
    });
    inlineSave.addEventListener("click", () => {
      saveTransitionFromEditor(inlineInput.value, true, interaction.inlineEditor.edgeKey);
    });
    inlineDelete.addEventListener("click", () => {
      deleteSelectedTransition();
      closeInlineTransitionEditor();
      renderStateGraph();
    });
    inlineClose.addEventListener("click", () => {
      closeInlineTransitionEditor();
      renderStateGraph();
    });
  }

  updateGraphAriaLabel();
}

function getSvgPointFromEvent(event) {
  const svg = ui.stateGraph.querySelector("svg");
  if (!svg) {
    return { x: GRAPH_WIDTH / 2, y: GRAPH_HEIGHT / 2 };
  }

  const rect = svg.getBoundingClientRect();
  const x = ((event.clientX - rect.left) / rect.width) * GRAPH_WIDTH;
  const y = ((event.clientY - rect.top) / rect.height) * GRAPH_HEIGHT;
  return {
    x: Math.max(NODE_RADIUS + 8, Math.min(GRAPH_WIDTH - NODE_RADIUS - 8, x)),
    y: Math.max(NODE_RADIUS + 8, Math.min(GRAPH_HEIGHT - NODE_RADIUS - 8, y)),
  };
}

function onGraphPointerDown(event) {
  if (event.target.closest(".inline-transition-editor")) {
    return;
  }

  if (interaction.inlineEditor && !event.target.closest(".inline-transition-editor")) {
    closeInlineTransitionEditor();
  }

  const edgeTarget = event.target.closest("[data-edge]");
  if (edgeTarget) {
    const edgeKey = edgeTarget.getAttribute("data-edge");
    if (edgeKey) {
      selectTransitionByKey(edgeKey);
    }
    return;
  }

  const nodeTarget = event.target.closest("[data-node]");
  if (!nodeTarget) {
    editor.selectedState = null;
    clearTransitionSelection();
    refreshSelectedState();
    renderStateGraph();
    return;
  }

  const nodeName = nodeTarget.getAttribute("data-node");
  if (!nodeName || !editor.nodes.has(nodeName)) {
    return;
  }

  editor.selectedState = nodeName;
  clearTransitionSelection();
  refreshSelectedState();

  if (event.shiftKey) {
    interaction.linkFrom = nodeName;
    interaction.linkTo = getSvgPointFromEvent(event);
    renderStateGraph();
    return;
  }

  interaction.dragNode = nodeName;
  interaction.dragPointerId = event.pointerId;
  ui.stateGraph.setPointerCapture(event.pointerId);
  renderStateGraph();
}

function onGraphPointerMove(event) {
  if (interaction.dragNode) {
    const point = getSvgPointFromEvent(event);
    const node = editor.nodes.get(interaction.dragNode);
    if (!node) {
      return;
    }
    node.x = point.x;
    node.y = point.y;
    renderStateGraph();
    return;
  }

  if (interaction.linkFrom) {
    interaction.linkTo = getSvgPointFromEvent(event);
    renderStateGraph();
  }
}

function onGraphPointerUp(event) {
  if (interaction.dragNode) {
    if (interaction.dragPointerId !== null) {
      try {
        ui.stateGraph.releasePointerCapture(interaction.dragPointerId);
      } catch {
        // ignore
      }
    }
    interaction.dragNode = null;
    interaction.dragPointerId = null;
    renderStateGraph();
    return;
  }

  if (interaction.linkFrom) {
    const fromState = interaction.linkFrom;
    const nodeTarget = event.target.closest("[data-node]");
    if (nodeTarget) {
      const toState = nodeTarget.getAttribute("data-node");
      if (toState && editor.nodes.has(toState)) {
        prepareTransitionDraft(fromState, toState, event.clientX, event.clientY);
        message("Borrador cargado en la flecha. Puedes editar y guardar ahí mismo.", "ok");
      }
    }

    interaction.linkFrom = null;
    interaction.linkTo = null;
    renderStateGraph();
  }
}

function onGraphDoubleClick(event) {
  if (event.target.closest(".inline-transition-editor")) {
    return;
  }

  const edgeTarget = event.target.closest("[data-edge]");
  if (edgeTarget) {
    const edgeKey = edgeTarget.getAttribute("data-edge");
    if (edgeKey) {
      selectTransitionByKey(edgeKey);
      openInlineTransitionEditor(edgeKey, event.clientX, event.clientY);
      renderStateGraph();
    }
    return;
  }

  const nodeTarget = event.target.closest("[data-node]");
  if (nodeTarget) {
    return;
  }

  try {
    const point = getSvgPointFromEvent(event);
    addState(generateStateName(), point.x, point.y);
    message("Estado creado. Usa Shift+arrastre para crear transición.", "ok");
  } catch (err) {
    message(err.message, "err");
  }
}

function onGraphKeyDown(event) {
  if (isEditableElement(event.target) && event.target !== ui.stateGraph) {
    return;
  }

  const selectedNode = editor.selectedState ? editor.nodes.get(editor.selectedState) : null;
  const step = event.shiftKey ? 20 : 10;
  let handled = false;

  if ((event.key === "n" || event.key === "N") && !event.ctrlKey && !event.metaKey) {
    addState(generateStateName(), GRAPH_WIDTH / 2, GRAPH_HEIGHT / 2);
    message("Estado creado con teclado.", "ok");
    handled = true;
  } else if (event.key === "Delete" || event.key === "Backspace") {
    deleteSelectedState();
    handled = true;
  } else if ((event.key === "i" || event.key === "I") && !event.ctrlKey && !event.metaKey) {
    setStartState();
    handled = true;
  } else if ((event.key === "a" || event.key === "A") && !event.ctrlKey && !event.metaKey) {
    toggleAcceptState();
    handled = true;
  } else if ((event.key === "e" || event.key === "E") && !event.ctrlKey && !event.metaKey) {
    if (editor.selectedTransitionKey) {
      const rect = ui.stateGraph.getBoundingClientRect();
      openInlineTransitionEditor(
        editor.selectedTransitionKey,
        rect.left + rect.width / 2,
        rect.top + rect.height / 2,
      );
      renderStateGraph();
    } else {
      message("Selecciona una flecha para editarla.", "warn");
    }
    handled = true;
  } else if (event.key === "Escape") {
    interaction.linkFrom = null;
    interaction.linkTo = null;
    closeInlineTransitionEditor();
    renderStateGraph();
    handled = true;
  } else if (selectedNode && event.key.startsWith("Arrow")) {
    if (event.key === "ArrowUp") {
      selectedNode.y = clamp(selectedNode.y - step, NODE_RADIUS + 8, GRAPH_HEIGHT - NODE_RADIUS - 8);
    } else if (event.key === "ArrowDown") {
      selectedNode.y = clamp(selectedNode.y + step, NODE_RADIUS + 8, GRAPH_HEIGHT - NODE_RADIUS - 8);
    } else if (event.key === "ArrowLeft") {
      selectedNode.x = clamp(selectedNode.x - step, NODE_RADIUS + 8, GRAPH_WIDTH - NODE_RADIUS - 8);
    } else if (event.key === "ArrowRight") {
      selectedNode.x = clamp(selectedNode.x + step, NODE_RADIUS + 8, GRAPH_WIDTH - NODE_RADIUS - 8);
    }
    renderStateGraph();
    handled = true;
  }

  if (handled) {
    event.preventDefault();
  }
}

function buildMachineFromEditor() {
  if (!editor.nodes.size) {
    throw new Error("Debes crear al menos un estado.");
  }

  const startNodes = [...editor.nodes.entries()].filter(([, node]) => node.isStart).map(([name]) => name);
  if (startNodes.length !== 1) {
    throw new Error("Debe existir exactamente un estado inicial.");
  }

  const tapes = parseTapeDefinitions(ui.tapesInput.value);
  const tapeCount = tapes.length;

  const transitions = new Map();
  editor.transitions.forEach((transition) => {
    if (transition.readSymbols.length !== tapeCount) {
      throw new Error(
        `Transición inválida (${transitionToLine(transition)}): lectura debe tener ${tapeCount} valores.`,
      );
    }
    if (transition.actions.length !== tapeCount) {
      throw new Error(
        `Transición inválida (${transitionToLine(transition)}): acciones deben tener ${tapeCount} valores.`,
      );
    }

    const key = transitionKey(transition.fromState, transition.readSymbols);
    if (transitions.has(key)) {
      throw new Error(`No determinista: transición duplicada para ${transition.fromState} (${transition.readSymbols.join(", ")}).`);
    }

    transitions.set(key, {
      nextState: transition.nextState,
      actions: transition.actions,
    });
    transition.key = key;
  });

  const definition = {
    states: new Set(editor.nodes.keys()),
    startState: startNodes[0],
    acceptStates: new Set(
      [...editor.nodes.entries()].filter(([, node]) => node.isAccept).map(([name]) => name),
    ),
    transitions,
    tapeCount,
  };

  return {
    definition,
    tapes,
  };
}

function refreshStatus() {
  if (!machine) {
    ui.currentState.textContent = "-";
    ui.stepCount.textContent = "0";
    return;
  }

  ui.currentState.textContent = machine.currentState;
  ui.stepCount.textContent = String(machine.stepCount);
}

function renderTapes() {
  if (!machine) {
    ui.tapeArea.innerHTML = "";
    return;
  }

  ui.tapeArea.innerHTML = "";
  const radius = 10;

  for (let i = 0; i < machine.tapeCount; i += 1) {
    const row = document.createElement("div");
    row.className = "tape-row";

    const title = document.createElement("div");
    title.className = "tape-title";
    title.textContent = `Cinta ${i + 1}`;

    const tape = document.createElement("div");
    tape.className = "tape";

    for (let pos = machine.heads[i] - radius; pos <= machine.heads[i] + radius; pos += 1) {
      const cell = document.createElement("div");
      cell.className = "cell";
      if (pos === machine.heads[i]) {
        cell.classList.add("active");
      }
      cell.textContent = machine.tapes[i].has(pos) ? machine.tapes[i].get(pos) : machine.blankSymbol;
      tape.appendChild(cell);
    }

    row.appendChild(title);
    row.appendChild(tape);
    ui.tapeArea.appendChild(row);
  }
}

function stopRun() {
  if (runTimer) {
    clearInterval(runTimer);
    runTimer = null;
  }
  if (machine && !machine.halted) {
    ui.pause.disabled = true;
    ui.run.disabled = false;
    ui.step.disabled = false;
  }
}

function executeStep() {
  if (!machine) {
    return;
  }

  const result = machine.step();
  refreshStatus();
  renderTapes();
  renderStateGraph();

  if (result.status === "accept") {
    message(result.message, "ok");
    stopRun();
  } else if (result.status === "halted") {
    message(result.message, "warn");
    stopRun();
  } else {
    message(result.message, "warn");
  }
}

function initializeMachine() {
  stopRun();

  try {
    const built = buildMachineFromEditor();
    machine = new MultiTapeTuringMachine(
      built.definition,
      built.tapes.map((t) => t.symbols),
      "#",
      ">",
    );

    setRunButtons(true);
    refreshStatus();
    renderTapes();
    renderStateGraph();
    message("Máquina inicializada correctamente.", "ok");
  } catch (err) {
    machine = null;
    setRunButtons(false);
    refreshStatus();
    renderTapes();
    renderStateGraph();
    message(err.message, "err");
  }
}

function resetMachine() {
  if (!machine) {
    message("Primero inicializa la máquina.", "warn");
    return;
  }

  try {
    const tapes = parseTapeDefinitions(ui.tapesInput.value);
    if (tapes.length !== machine.tapeCount) {
      throw new Error("El número de cintas cambió. Inicializa de nuevo la máquina.");
    }

    stopRun();
    machine.reset(tapes.map((t) => t.symbols));
    refreshStatus();
    renderTapes();
    renderStateGraph();
    message("Cintas reiniciadas.", "ok");
  } catch (err) {
    message(err.message, "err");
  }
}

function runMachine() {
  if (!machine || machine.halted) {
    return;
  }

  const delay = Number(ui.speed.value);
  ui.pause.disabled = false;
  ui.run.disabled = true;
  ui.step.disabled = true;

  runTimer = setInterval(() => {
    if (!machine || machine.halted) {
      stopRun();
      return;
    }
    executeStep();
  }, delay);
}

function loadExample() {
  editor.nodes.clear();
  editor.transitions = [];
  editor.selectedTransitionKey = null;

  editor.nodes.set("e0", { x: 320, y: 240, isStart: true, isAccept: false });
  editor.nodes.set("ef", { x: 760, y: 240, isStart: false, isAccept: true });

  addOrReplaceTransition(parseTransitionLine("e0 (>,>) -> (->, ->, e0)"), { render: false });
  addOrReplaceTransition(parseTransitionLine("e0 (1,#) -> (->, 1->, e0)"), { render: false });
  addOrReplaceTransition(parseTransitionLine("e0 (#,#) -> (, , ef)"), { render: false });
  editor.selectedTransitionKey = null;

  ui.tapesInput.value = [
    "cinta1=[>,1,1,1,1,1,#]",
    "cinta2=[>,#,#,#,#,#,#]",
  ].join("\n");

  editor.selectedState = "e0";
  refreshSelectedState();
  refreshTransitionEditors();
  refreshSelectedTransition();
  setTransitionEditorLine("");
  renderStateGraph();

  machine = null;
  setRunButtons(false);
  refreshStatus();
  renderTapes();
  message("Ejemplo cargado. Inicializa para simular.", "ok");
}

ui.addState.addEventListener("click", () => {
  try {
    addState(generateStateName(), GRAPH_WIDTH / 2, GRAPH_HEIGHT / 2);
    message("Estado agregado en el centro.", "ok");
  } catch (err) {
    message(err.message, "err");
  }
});

ui.setStart.addEventListener("click", setStartState);
ui.toggleAccept.addEventListener("click", toggleAcceptState);
ui.deleteState.addEventListener("click", deleteSelectedState);

ui.stateGraph.addEventListener("pointerdown", onGraphPointerDown);
ui.stateGraph.addEventListener("pointermove", onGraphPointerMove);
ui.stateGraph.addEventListener("pointerup", onGraphPointerUp);
ui.stateGraph.addEventListener("dblclick", onGraphDoubleClick);
ui.stateGraph.addEventListener("keydown", onGraphKeyDown);

ui.initialize.addEventListener("click", initializeMachine);
ui.reset.addEventListener("click", resetMachine);
ui.saveTransition.addEventListener("click", saveTransitionFromEditor);
ui.deleteTransition.addEventListener("click", deleteSelectedTransition);
ui.addTransitionRow.addEventListener("click", () => {
  const row = createTransitionRowElement(getTapeCountForTable(), null);
  ui.transitionsTableBody.appendChild(row);
  editor.selectedTableRow = row;
  [...ui.transitionsTableBody.querySelectorAll("tr")].forEach((r) => r.classList.remove("selected"));
  row.classList.add("selected");
  const firstInput = row.querySelector("input");
  if (firstInput) {
    firstInput.focus();
  }
});
ui.deleteTransitionRow.addEventListener("click", () => {
  const rows = [...ui.transitionsTableBody.querySelectorAll("tr")];
  if (!rows.length) {
    message("No hay filas para eliminar.", "warn");
    return;
  }
  const row = editor.selectedTableRow || rows[rows.length - 1];
  row.remove();
  editor.selectedTableRow = null;
  message("Fila eliminada de la tabla.", "ok");
});
ui.applyTransitionTable.addEventListener("click", applyTransitionsFromTable);
ui.clearTransition.addEventListener("click", () => {
  clearTransitionSelection();
  setTransitionEditorLine("");
  renderStateGraph();
});
ui.transitionInput.addEventListener("keydown", (event) => {
  if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
    saveTransitionFromEditor();
  }
});
ui.transitionsPreview.addEventListener("change", importTransitionsFromPreview);
ui.tapesInput.addEventListener("change", renderTransitionsTable);
ui.step.addEventListener("click", executeStep);
ui.run.addEventListener("click", runMachine);
ui.pause.addEventListener("click", () => {
  stopRun();
  message("Ejecución en pausa.", "warn");
});
ui.speed.addEventListener("input", () => {
  ui.speedValue.value = `${ui.speed.value} ms`;
  if (runTimer) {
    stopRun();
    runMachine();
  }
});
ui.loadExample.addEventListener("click", loadExample);

setRunButtons(false);
refreshSelectedState();
refreshSelectedTransition();
loadExample();
