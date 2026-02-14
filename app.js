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
const WORLD_LIMIT = 100000;

const ui = {
  openDiagramConfig: document.getElementById("openDiagramConfig"),
  diagramConfigDialog: document.getElementById("diagramConfigDialog"),
  diagramMinDistance: document.getElementById("diagramMinDistance"),
  diagramConfigSave: document.getElementById("diagramConfigSave"),
  diagramConfigCancel: document.getElementById("diagramConfigCancel"),
  tabTM: document.getElementById("tabTM"),
  tabFA: document.getElementById("tabFA"),
  tabPDA: document.getElementById("tabPDA"),
  viewTM: document.getElementById("viewTM"),
  viewFA: document.getElementById("viewFA"),
  viewPDA: document.getElementById("viewPDA"),
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
  tapeCount: document.getElementById("tapeCount"),
  initialTapesEditor: document.getElementById("initialTapesEditor"),
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
  faAddState: document.getElementById("faAddState"),
  faSetStart: document.getElementById("faSetStart"),
  faToggleAccept: document.getElementById("faToggleAccept"),
  faDeleteState: document.getElementById("faDeleteState"),
  faLoadGraphFromText: document.getElementById("faLoadGraphFromText"),
  faSelectedState: document.getElementById("faSelectedState"),
  faGraph: document.getElementById("faGraph"),
  faStates: document.getElementById("faStates"),
  faAlphabet: document.getElementById("faAlphabet"),
  faStartState: document.getElementById("faStartState"),
  faAcceptStates: document.getElementById("faAcceptStates"),
  faTransitions: document.getElementById("faTransitions"),
  faInputWord: document.getElementById("faInputWord"),
  faLoadExample: document.getElementById("faLoadExample"),
  faEvaluate: document.getElementById("faEvaluate"),
  faMinimize: document.getElementById("faMinimize"),
  faResult: document.getElementById("faResult"),
  faMessage: document.getElementById("faMessage"),
  faMinimizedOutput: document.getElementById("faMinimizedOutput"),
  pdaStates: document.getElementById("pdaStates"),
  pdaAddState: document.getElementById("pdaAddState"),
  pdaSetStart: document.getElementById("pdaSetStart"),
  pdaToggleAccept: document.getElementById("pdaToggleAccept"),
  pdaDeleteState: document.getElementById("pdaDeleteState"),
  pdaLoadGraphFromText: document.getElementById("pdaLoadGraphFromText"),
  pdaSelectedState: document.getElementById("pdaSelectedState"),
  pdaGraph: document.getElementById("pdaGraph"),
  pdaStartState: document.getElementById("pdaStartState"),
  pdaAcceptStates: document.getElementById("pdaAcceptStates"),
  pdaInitialStack: document.getElementById("pdaInitialStack"),
  pdaTransitions: document.getElementById("pdaTransitions"),
  pdaInputWord: document.getElementById("pdaInputWord"),
  pdaLoadExample: document.getElementById("pdaLoadExample"),
  pdaEvaluate: document.getElementById("pdaEvaluate"),
  pdaResult: document.getElementById("pdaResult"),
  pdaMessage: document.getElementById("pdaMessage"),
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
  panActive: false,
  panPointerId: null,
  panStartClientX: 0,
  panStartClientY: 0,
  panStartOffsetX: 0,
  panStartOffsetY: 0,
  linkFrom: null,
  linkTo: null,
  inlineEditor: null,
};

let machine = null;
let runTimer = null;
const tmViewport = {
  x: 0,
  y: 0,
};
const diagramConfig = {
  minNodeDistance: 90,
};
const faGraphEditor = {
  nodes: new Map(),
  transitions: [],
  selectedState: null,
  selectedEdgeKey: null,
  viewX: 0,
  viewY: 0,
  panActive: false,
  panPointerId: null,
  panStartClientX: 0,
  panStartClientY: 0,
  panStartOffsetX: 0,
  panStartOffsetY: 0,
  dragNode: null,
  dragPointerId: null,
  linkFrom: null,
  linkTo: null,
};
const pdaGraphEditor = {
  nodes: new Map(),
  transitions: [],
  selectedState: null,
  selectedEdgeKey: null,
  viewX: 0,
  viewY: 0,
  panActive: false,
  panPointerId: null,
  panStartClientX: 0,
  panStartClientY: 0,
  panStartOffsetX: 0,
  panStartOffsetY: 0,
  dragNode: null,
  dragPointerId: null,
  linkFrom: null,
  linkTo: null,
};

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

function clampNodePosition(node) {
  node.x = clamp(node.x, -WORLD_LIMIT, WORLD_LIMIT);
  node.y = clamp(node.y, -WORLD_LIMIT, WORLD_LIMIT);
}

function enforceMinNodeDistance(nodesMap, pinnedName = null) {
  const minDistance = Math.max(68, Number(diagramConfig.minNodeDistance) || 90);
  if (!nodesMap || nodesMap.size < 2) {
    return;
  }

  const entries = [...nodesMap.entries()];
  const maxIterations = 36;
  for (let iteration = 0; iteration < maxIterations; iteration += 1) {
    let adjusted = false;
    for (let i = 0; i < entries.length; i += 1) {
      const [nameA, nodeA] = entries[i];
      for (let j = i + 1; j < entries.length; j += 1) {
        const [nameB, nodeB] = entries[j];
        let dx = nodeB.x - nodeA.x;
        let dy = nodeB.y - nodeA.y;
        let distance = Math.hypot(dx, dy);
        if (distance >= minDistance) {
          continue;
        }

        if (distance < 0.001) {
          dx = 1;
          dy = 0;
          distance = 1;
        }

        const overlap = minDistance - distance;
        const ux = dx / distance;
        const uy = dy / distance;

        const aPinned = pinnedName && nameA === pinnedName;
        const bPinned = pinnedName && nameB === pinnedName;
        let pushA = 0.5;
        let pushB = 0.5;
        if (aPinned && !bPinned) {
          pushA = 0;
          pushB = 1;
        } else if (bPinned && !aPinned) {
          pushA = 1;
          pushB = 0;
        }

        nodeA.x -= ux * overlap * pushA;
        nodeA.y -= uy * overlap * pushA;
        nodeB.x += ux * overlap * pushB;
        nodeB.y += uy * overlap * pushB;
        clampNodePosition(nodeA);
        clampNodePosition(nodeB);
        adjusted = true;
      }
    }
    if (!adjusted) {
      break;
    }
  }
}

function applyMinDistanceToAllDiagrams() {
  enforceMinNodeDistance(editor.nodes, editor.selectedState);
  enforceMinNodeDistance(faGraphEditor.nodes, faGraphEditor.selectedState);
  enforceMinNodeDistance(pdaGraphEditor.nodes, pdaGraphEditor.selectedState);
}

function openDialog(dialog) {
  if (!dialog) return;
  if (typeof dialog.showModal === "function") {
    dialog.showModal();
    return;
  }
  dialog.setAttribute("open", "open");
}

function closeDialog(dialog) {
  if (!dialog) return;
  if (typeof dialog.close === "function") {
    dialog.close();
    return;
  }
  dialog.removeAttribute("open");
}

function splitByCommaPreserve(value) {
  return value.split(",").map((s) => s.trim());
}

function parseTapeSymbols(raw, tapeName) {
  const trimmed = raw.trim();
  const body = trimmed.startsWith("[") && trimmed.endsWith("]")
    ? trimmed.slice(1, -1)
    : trimmed;
  const symbols = splitByCommaPreserve(body).map((s) => s.trim());
  if (!symbols.length || (symbols.length === 1 && symbols[0] === "")) {
    throw new Error(`La ${tapeName} no puede estar vacía.`);
  }
  return symbols.map((s) => (s === "" ? "#" : s));
}

function getConfiguredTapeCount() {
  const parsed = Number.parseInt(ui.tapeCount.value, 10);
  return Math.max(Number.isFinite(parsed) ? parsed : 2, 1);
}

function renderInitialTapesEditor(tapeCount, initialTapes = null) {
  ui.initialTapesEditor.innerHTML = "";
  const defaultFirst = [">", "1", "1", "1", "#"];
  const firstSymbols = initialTapes && initialTapes[0] ? initialTapes[0].symbols : defaultFirst;
  const row = document.createElement("div");
  row.className = "tape-config-row";

  const label = document.createElement("label");
  label.textContent = "Cinta 1";

  const input = document.createElement("input");
  input.type = "text";
  input.spellcheck = false;
  input.dataset.tapeInput = "0";
  input.placeholder = ">,1,1,1,#";
  input.value = firstSymbols.join(",");

  row.appendChild(label);
  row.appendChild(input);
  ui.initialTapesEditor.appendChild(row);
}

function readInitialTapesFromEditor() {
  const tapeCount = getConfiguredTapeCount();
  const inputs = [...ui.initialTapesEditor.querySelectorAll("input[data-tape-input]")];
  if (!inputs.length) {
    renderInitialTapesEditor(tapeCount);
    throw new Error("Se actualizó el editor de cintas. Revisa las entradas e intenta de nuevo.");
  }
  const firstInput = inputs.find((input) => input.dataset.tapeInput === "0");
  if (!firstInput) {
    throw new Error("No se encontró la Cinta 1.");
  }
  const firstSymbols = parseTapeSymbols(firstInput.value, "cinta1");
  const tapes = [{ name: "cinta1", symbols: firstSymbols }];
  for (let i = 1; i < tapeCount; i += 1) {
    tapes.push({
      name: `cinta${i + 1}`,
      symbols: [">"],
    });
  }
  return tapes;
}

function parseActionToken(rawToken) {
  const token = rawToken.trim();

  if (token === "") {
    return { writeSymbol: null, move: "S" };
  }

  const normalizeWriteSymbol = (value) => {
    const trimmed = value.trim();
    if (trimmed === "") {
      return null;
    }
    if (/^(eps|epsilon)$/i.test(trimmed) || trimmed === "ε") {
      return "#";
    }
    return trimmed;
  };

  if (/^(eps|epsilon)$/i.test(token) || token === "ε") {
    return { writeSymbol: "#", move: "S" };
  }

  if (token.includes("|")) {
    const [writePart, movePart] = token.split("|").map((s) => s.trim());
    return {
      writeSymbol: normalizeWriteSymbol(writePart),
      move: normalizeMove(movePart || "S"),
    };
  }

  if (token.includes("&")) {
    const [writePart, movePart] = token.split("&").map((s) => s.trim());
    return {
      writeSymbol: normalizeWriteSymbol(writePart),
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
    return { writeSymbol: normalizeWriteSymbol(writeSymbol), move: "R" };
  }
  if (token.endsWith("<-")) {
    const writeSymbol = token.slice(0, -2).trim();
    return { writeSymbol: normalizeWriteSymbol(writeSymbol), move: "L" };
  }

  return { writeSymbol: normalizeWriteSymbol(token), move: "S" };
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
  const readSymbols = splitByCommaPreserve(match[2]).map((s) => {
    const symbol = s.trim();
    if (symbol === "" || /^(eps|epsilon)$/i.test(symbol) || symbol === "ε") {
      return "#";
    }
    return symbol;
  });
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
  return getConfiguredTapeCount();
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

function normalizeTransitionToTapeCount(transition, tapeCount) {
  const normalizedReads = [...transition.readSymbols];
  const normalizedActions = [...transition.actions];
  const fillReadSymbol = normalizedReads.length > 0 && normalizedReads.every((s) => s === ">")
    ? ">"
    : "#";

  while (normalizedReads.length < tapeCount) {
    normalizedReads.push(fillReadSymbol);
  }
  while (normalizedActions.length < tapeCount) {
    normalizedActions.push({ writeSymbol: null, move: "R" });
  }

  return {
    ...transition,
    readSymbols: normalizedReads.slice(0, tapeCount),
    actions: normalizedActions.slice(0, tapeCount),
  };
}

function autoAdjustTransitionsToTapeCount(tapeCount) {
  const normalizedMap = new Map();

  editor.transitions.forEach((transition) => {
    const normalized = normalizeTransitionToTapeCount(transition, tapeCount);
    const key = transitionKey(normalized.fromState, normalized.readSymbols);
    normalizedMap.set(key, {
      fromState: normalized.fromState,
      nextState: normalized.nextState,
      readSymbols: normalized.readSymbols,
      actions: normalized.actions,
      key,
    });
  });

  editor.transitions = [...normalizedMap.values()];
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
  enforceMinNodeDistance(editor.nodes, name);
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

    // Inline editor (sobre la flecha) reemplaza el conjunto de la flecha completa.
    // Editor rápido agrega/actualiza transiciones individuales y conserva las demás.
    const replaceWholeEdge = forcedEdgeKey !== null;
    if (replaceWholeEdge) {
      replaceTransitionsForEdge(pairKey, parsedList);
      editor.selectedTransitionKey = pairKey;
    } else {
      parsedList.forEach((parsed) => addOrReplaceTransition(parsed, { render: false }));
      editor.selectedTransitionKey = edgeKey(
        parsedList[parsedList.length - 1].fromState,
        parsedList[parsedList.length - 1].nextState,
      );
    }

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
    viewBox: `${tmViewport.x} ${tmViewport.y} ${GRAPH_WIDTH} ${GRAPH_HEIGHT}`,
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
    return { x: tmViewport.x + GRAPH_WIDTH / 2, y: tmViewport.y + GRAPH_HEIGHT / 2 };
  }

  const rect = svg.getBoundingClientRect();
  const x = tmViewport.x + ((event.clientX - rect.left) / rect.width) * GRAPH_WIDTH;
  const y = tmViewport.y + ((event.clientY - rect.top) / rect.height) * GRAPH_HEIGHT;
  return {
    x: clamp(x, -WORLD_LIMIT, WORLD_LIMIT),
    y: clamp(y, -WORLD_LIMIT, WORLD_LIMIT),
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
    interaction.panActive = true;
    interaction.panPointerId = event.pointerId;
    interaction.panStartClientX = event.clientX;
    interaction.panStartClientY = event.clientY;
    interaction.panStartOffsetX = tmViewport.x;
    interaction.panStartOffsetY = tmViewport.y;
    ui.stateGraph.setPointerCapture(event.pointerId);
    ui.stateGraph.classList.add("panning");
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
  if (interaction.panActive) {
    const svg = ui.stateGraph.querySelector("svg");
    if (!svg) {
      return;
    }
    const rect = svg.getBoundingClientRect();
    if (!rect.width || !rect.height) {
      return;
    }
    const worldDx = (event.clientX - interaction.panStartClientX) * (GRAPH_WIDTH / rect.width);
    const worldDy = (event.clientY - interaction.panStartClientY) * (GRAPH_HEIGHT / rect.height);
    tmViewport.x = clamp(interaction.panStartOffsetX - worldDx, -WORLD_LIMIT, WORLD_LIMIT);
    tmViewport.y = clamp(interaction.panStartOffsetY - worldDy, -WORLD_LIMIT, WORLD_LIMIT);
    renderStateGraph();
    return;
  }

  if (interaction.dragNode) {
    const point = getSvgPointFromEvent(event);
    const node = editor.nodes.get(interaction.dragNode);
    if (!node) {
      return;
    }
    node.x = point.x;
    node.y = point.y;
    enforceMinNodeDistance(editor.nodes, interaction.dragNode);
    renderStateGraph();
    return;
  }

  if (interaction.linkFrom) {
    interaction.linkTo = getSvgPointFromEvent(event);
    renderStateGraph();
  }
}

function onGraphPointerUp(event) {
  if (interaction.panActive) {
    if (interaction.panPointerId !== null) {
      try {
        ui.stateGraph.releasePointerCapture(interaction.panPointerId);
      } catch {
        // ignore
      }
    }
    interaction.panActive = false;
    interaction.panPointerId = null;
    ui.stateGraph.classList.remove("panning");
    renderStateGraph();
    return;
  }

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
      selectedNode.y = clamp(selectedNode.y - step, -WORLD_LIMIT, WORLD_LIMIT);
    } else if (event.key === "ArrowDown") {
      selectedNode.y = clamp(selectedNode.y + step, -WORLD_LIMIT, WORLD_LIMIT);
    } else if (event.key === "ArrowLeft") {
      selectedNode.x = clamp(selectedNode.x - step, -WORLD_LIMIT, WORLD_LIMIT);
    } else if (event.key === "ArrowRight") {
      selectedNode.x = clamp(selectedNode.x + step, -WORLD_LIMIT, WORLD_LIMIT);
    }
    enforceMinNodeDistance(editor.nodes, editor.selectedState);
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

  const tapes = readInitialTapesFromEditor();
  const tapeCount = tapes.length;
  autoAdjustTransitionsToTapeCount(tapeCount);

  const transitions = new Map();
  editor.transitions.forEach((transition) => {
    const normalized = normalizeTransitionToTapeCount(transition, tapeCount);
    const key = transitionKey(normalized.fromState, normalized.readSymbols);
    if (transitions.has(key)) {
      throw new Error(`No determinista: transición duplicada para ${normalized.fromState} (${normalized.readSymbols.join(", ")}).`);
    }

    transitions.set(key, {
      nextState: normalized.nextState,
      actions: normalized.actions,
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
  const visibleCells = 15;
  const radius = Math.floor(visibleCells / 2);

  for (let i = 0; i < machine.tapeCount; i += 1) {
    const card = document.createElement("div");
    card.className = "tape-card";

    const title = document.createElement("div");
    title.className = "tape-title";
    title.textContent = `Cinta ${i + 1}`;

    const viewport = document.createElement("div");
    viewport.className = "tape-viewport";
    const track = document.createElement("div");
    track.className = "tape-track";
    track.style.setProperty("--cells", String(visibleCells));

    for (let pos = machine.heads[i] - radius; pos <= machine.heads[i] + radius; pos += 1) {
      const cell = document.createElement("div");
      cell.className = "tape-cell";
      if (pos === machine.heads[i]) {
        cell.classList.add("active");
      }
      cell.textContent = machine.tapes[i].has(pos) ? machine.tapes[i].get(pos) : machine.blankSymbol;
      track.appendChild(cell);
    }
    viewport.appendChild(track);

    card.appendChild(title);
    card.appendChild(viewport);
    ui.tapeArea.appendChild(card);
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

    refreshTransitionEditors();
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
    const tapes = readInitialTapesFromEditor();
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
  enforceMinNodeDistance(editor.nodes, null);

  addOrReplaceTransition(parseTransitionLine("e0 (>,>) -> (->, ->, e0)"), { render: false });
  addOrReplaceTransition(parseTransitionLine("e0 (1,#) -> (->, 1->, e0)"), { render: false });
  addOrReplaceTransition(parseTransitionLine("e0 (#,#) -> (, , ef)"), { render: false });
  editor.selectedTransitionKey = null;

  ui.tapeCount.value = "2";
  renderInitialTapesEditor(2, [
    { name: "cinta1", symbols: [">", "1", "1", "1", "1", "1", "#"] },
    { name: "cinta2", symbols: [">", "#", "#", "#", "#", "#", "#"] },
  ]);

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

function switchView(view) {
  const views = {
    tm: ui.viewTM,
    fa: ui.viewFA,
    pda: ui.viewPDA,
  };
  const tabs = {
    tm: ui.tabTM,
    fa: ui.tabFA,
    pda: ui.tabPDA,
  };
  Object.entries(views).forEach(([key, el]) => {
    if (!el) return;
    el.classList.toggle("active-view", key === view);
  });
  Object.entries(tabs).forEach(([key, el]) => {
    if (!el) return;
    el.classList.toggle("active", key === view);
    el.setAttribute("aria-selected", key === view ? "true" : "false");
  });
}

function parseNameListCSV(value) {
  return splitByCommaPreserve(value).map((s) => s.trim()).filter(Boolean);
}

function layoutNodesInCircle(names, width = GRAPH_WIDTH, height = GRAPH_HEIGHT) {
  const map = new Map();
  if (names.length === 0) return map;
  if (names.length === 1) {
    map.set(names[0], { x: width / 2, y: height / 2 });
    return map;
  }
  const cx = width / 2;
  const cy = height / 2;
  const r = Math.max(100, Math.min(width, height) / 2 - 70);
  names.forEach((name, idx) => {
    const angle = (-Math.PI / 2) + ((2 * Math.PI * idx) / names.length);
    map.set(name, { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) });
  });
  return map;
}

function nextStateName(editorData, prefix = "q") {
  let i = 0;
  while (editorData.nodes.has(`${prefix}${i}`)) i += 1;
  return `${prefix}${i}`;
}

function groupSimpleEdges(transitions) {
  const map = new Map();
  transitions.forEach((t) => {
    const k = `${t.fromState}=>${t.toState}`;
    if (!map.has(k)) {
      map.set(k, { key: k, fromState: t.fromState, toState: t.toState, labels: [] });
    }
    map.get(k).labels.push(t.label);
  });
  return [...map.values()];
}

function renderSimpleGraph(container, editorData, selectedTextEl) {
  if (!container) return;
  container.innerHTML = "";
  selectedTextEl.textContent = editorData.selectedState || "(ninguno)";
  if (!editorData.nodes.size) {
    container.innerHTML = '<div class="graph-empty">Doble clic para crear estado.</div>';
    return;
  }

  const svg = createSvgElement("svg", {
    viewBox: `${editorData.viewX} ${editorData.viewY} ${GRAPH_WIDTH} ${GRAPH_HEIGHT}`,
    role: "img",
    "aria-label": "Editor gráfico",
  });
  const defs = createSvgElement("defs");
  const arrow = createSvgElement("marker", {
    id: `arrow-simple-${container.id}`,
    markerWidth: 10,
    markerHeight: 10,
    refX: 9,
    refY: 5,
    orient: "auto",
    markerUnits: "strokeWidth",
  });
  arrow.appendChild(createSvgElement("path", { d: "M0,0 L10,5 L0,10 Z", fill: "#64748b" }));
  defs.appendChild(arrow);
  svg.appendChild(defs);

  const edgeGroups = groupSimpleEdges(editorData.transitions);
  const pairTotals = new Map();
  const pairSeen = new Map();
  edgeGroups.forEach((e) => {
    const key = `${e.fromState}=>${e.toState}`;
    pairTotals.set(key, (pairTotals.get(key) || 0) + 1);
  });

  edgeGroups.forEach((edge) => {
    const from = editorData.nodes.get(edge.fromState);
    const to = editorData.nodes.get(edge.toState);
    if (!from || !to) return;
    const pairKey = `${edge.fromState}=>${edge.toState}`;
    const idx = pairSeen.get(pairKey) || 0;
    pairSeen.set(pairKey, idx + 1);
    const total = pairTotals.get(pairKey) || 1;
    const reverseKey = `${edge.toState}=>${edge.fromState}`;
    const hasReverse = pairTotals.has(reverseKey);
    const isSelectedEdge = editorData.selectedEdgeKey === edge.key;
    const path = createSvgElement("path", {
      class: isSelectedEdge ? "edge-path edge-selected" : "edge-path",
      "marker-end": `url(#arrow-simple-${container.id})`,
      "data-edge": edge.key,
    });
    const label = createSvgElement("text", {
      class: isSelectedEdge ? "edge-label edge-label-selected" : "edge-label",
      "data-edge": edge.key,
    });
    let lx = 0;
    let ly = 0;
    if (edge.fromState === edge.toState) {
      const x = from.x;
      const y = from.y;
      const h = 70 + idx * 14;
      path.setAttribute("d", `M ${x + NODE_RADIUS * 0.7} ${y - NODE_RADIUS * 0.7} C ${x + 56} ${y - h}, ${x - 56} ${y - h}, ${x - NODE_RADIUS * 0.7} ${y - NODE_RADIUS * 0.7}`);
      lx = x;
      ly = y - h - 7;
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
      if (hasReverse && total === 1) curve += edge.fromState < edge.toState ? -20 : 20;
      const mx = (sx + ex) / 2;
      const my = (sy + ey) / 2;
      const cx = mx + nx * curve;
      const cy = my + ny * curve;
      path.setAttribute("d", `M ${sx} ${sy} Q ${cx} ${cy} ${ex} ${ey}`);
      lx = (sx + 2 * cx + ex) / 4 + nx * (curve >= 0 ? 8 : -8);
      ly = (sy + 2 * cy + ey) / 4 + ny * (curve >= 0 ? 8 : -8);
    }
    label.setAttribute("x", String(lx));
    label.setAttribute("y", String(ly));
    edge.labels.forEach((text, i) => {
      const t = createSvgElement("tspan", { x: String(lx), dy: i === 0 ? "0" : "1.15em", "data-edge": edge.key });
      t.textContent = text;
      label.appendChild(t);
    });
    svg.appendChild(path);
    svg.appendChild(label);
  });

  editorData.nodes.forEach((node, name) => {
    const classes = ["node-circle"];
    if (node.isStart) classes.push("node-start");
    if (node.isAccept) classes.push("node-accept");
    if (editorData.selectedState === name) classes.push("node-selected");
    const circle = createSvgElement("circle", {
      cx: node.x,
      cy: node.y,
      r: NODE_RADIUS,
      class: classes.join(" "),
      "data-node": name,
    });
    const text = createSvgElement("text", {
      class: "node-label",
      x: node.x,
      y: node.y,
      "data-node": name,
    });
    text.textContent = name;
    svg.appendChild(circle);
    if (node.isAccept) {
      svg.appendChild(createSvgElement("circle", {
        cx: node.x, cy: node.y, r: NODE_RADIUS - 7, fill: "none", stroke: "#22c55e", "stroke-width": 2, "data-node": name,
      }));
    }
    if (node.isStart) {
      svg.appendChild(createSvgElement("line", {
        x1: node.x - 56, y1: node.y, x2: node.x - NODE_RADIUS - 4, y2: node.y,
        stroke: "#9a6800", "stroke-width": 2, "marker-end": `url(#arrow-simple-${container.id})`, "data-node": name,
      }));
    }
    svg.appendChild(text);
  });

  if (editorData.linkFrom && editorData.linkTo) {
    const from = editorData.nodes.get(editorData.linkFrom);
    if (from) {
      svg.appendChild(createSvgElement("path", {
        class: "edge-preview",
        d: `M ${from.x} ${from.y} L ${editorData.linkTo.x} ${editorData.linkTo.y}`,
      }));
    }
  }

  container.appendChild(svg);
}

function getPointInGraph(container, event) {
  const sourceEditor = editorForContainer(container);
  const offsetX = Number(sourceEditor?.viewX || 0);
  const offsetY = Number(sourceEditor?.viewY || 0);
  const svg = container.querySelector("svg");
  if (!svg) return { x: offsetX + GRAPH_WIDTH / 2, y: offsetY + GRAPH_HEIGHT / 2 };
  const rect = svg.getBoundingClientRect();
  const x = offsetX + ((event.clientX - rect.left) / rect.width) * GRAPH_WIDTH;
  const y = offsetY + ((event.clientY - rect.top) / rect.height) * GRAPH_HEIGHT;
  return {
    x: clamp(x, -WORLD_LIMIT, WORLD_LIMIT),
    y: clamp(y, -WORLD_LIMIT, WORLD_LIMIT),
  };
}

function editorForContainer(container) {
  if (container === ui.faGraph) {
    return faGraphEditor;
  }
  if (container === ui.pdaGraph) {
    return pdaGraphEditor;
  }
  return null;
}

function parseCsvList(value) {
  return splitByCommaPreserve(value).map((s) => s.trim()).filter(Boolean);
}

function normalizeEpsilonLabel(labelRaw) {
  const label = labelRaw.trim();
  if (!label || /^(eps|epsilon)$/i.test(label) || label === "ε") {
    return "eps";
  }
  return label;
}

function syncFaFormFromGraph() {
  const states = [...faGraphEditor.nodes.keys()];
  ui.faStates.value = states.join(",");
  const start = states.find((s) => faGraphEditor.nodes.get(s).isStart) || "";
  ui.faStartState.value = start;
  const accept = states.filter((s) => faGraphEditor.nodes.get(s).isAccept);
  ui.faAcceptStates.value = accept.join(",");
  const byFromSymbol = new Map();
  faGraphEditor.transitions.forEach((t) => {
    const key = `${t.fromState}|${t.label}`;
    if (!byFromSymbol.has(key)) byFromSymbol.set(key, new Set());
    byFromSymbol.get(key).add(t.toState);
  });
  const lines = [...byFromSymbol.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, toSet]) => {
      const [from, symbol] = key.split("|");
      return `${from},${symbol} -> ${[...toSet].join(",")}`;
    });
  ui.faTransitions.value = lines.join("\n");
}

function loadFaGraphFromForm() {
  const states = parseNameListCSV(ui.faStates.value);
  const positions = layoutNodesInCircle(states);
  faGraphEditor.nodes.clear();
  states.forEach((s) => {
    const p = positions.get(s) || { x: GRAPH_WIDTH / 2, y: GRAPH_HEIGHT / 2 };
    faGraphEditor.nodes.set(s, {
      x: p.x,
      y: p.y,
      isStart: ui.faStartState.value.trim() === s,
      isAccept: parseNameListCSV(ui.faAcceptStates.value).includes(s),
    });
  });
  enforceMinNodeDistance(faGraphEditor.nodes, null);
  faGraphEditor.transitions = [];
  try {
    const parsed = parseFaTransitions(ui.faTransitions.value);
    parsed.forEach((destSet, key) => {
      const [from, symbol] = key.split("|");
      destSet.forEach((to) => {
        if (faGraphEditor.nodes.has(from) && faGraphEditor.nodes.has(to)) {
          faGraphEditor.transitions.push({ fromState: from, toState: to, label: symbol });
        }
      });
    });
  } catch {
    // ignore parse errors while loading graph
  }
  faGraphEditor.selectedState = null;
  faGraphEditor.selectedEdgeKey = null;
  faGraphEditor.panActive = false;
  faGraphEditor.panPointerId = null;
  ui.faGraph.classList.remove("panning");
  renderSimpleGraph(ui.faGraph, faGraphEditor, ui.faSelectedState);
}

function syncPdaFormFromGraph() {
  const states = [...pdaGraphEditor.nodes.keys()];
  ui.pdaStates.value = states.join(",");
  const start = states.find((s) => pdaGraphEditor.nodes.get(s).isStart) || "";
  ui.pdaStartState.value = start;
  const accept = states.filter((s) => pdaGraphEditor.nodes.get(s).isAccept);
  ui.pdaAcceptStates.value = accept.join(",");
  const lines = pdaGraphEditor.transitions
    .map((t) => `${t.fromState},${t.label.split("->")[0].trim()} -> ${t.toState},${t.label.split("->")[1].trim()}`)
    .sort((a, b) => a.localeCompare(b));
  ui.pdaTransitions.value = lines.join("\n");
}

function loadPdaGraphFromForm() {
  const states = parseNameListCSV(ui.pdaStates.value);
  const positions = layoutNodesInCircle(states);
  pdaGraphEditor.nodes.clear();
  states.forEach((s) => {
    const p = positions.get(s) || { x: GRAPH_WIDTH / 2, y: GRAPH_HEIGHT / 2 };
    pdaGraphEditor.nodes.set(s, {
      x: p.x,
      y: p.y,
      isStart: ui.pdaStartState.value.trim() === s,
      isAccept: parseNameListCSV(ui.pdaAcceptStates.value).includes(s),
    });
  });
  enforceMinNodeDistance(pdaGraphEditor.nodes, null);
  pdaGraphEditor.transitions = [];
  try {
    const parsed = parsePdaTransitions(ui.pdaTransitions.value);
    parsed.forEach((t) => {
      if (pdaGraphEditor.nodes.has(t.state) && pdaGraphEditor.nodes.has(t.nextState)) {
        pdaGraphEditor.transitions.push({
          fromState: t.state,
          toState: t.nextState,
          label: `${t.inputSym},${t.stackTop} -> ${t.push}`,
        });
      }
    });
  } catch {
    // ignore parse errors while loading graph
  }
  pdaGraphEditor.selectedState = null;
  pdaGraphEditor.selectedEdgeKey = null;
  pdaGraphEditor.panActive = false;
  pdaGraphEditor.panPointerId = null;
  ui.pdaGraph.classList.remove("panning");
  renderSimpleGraph(ui.pdaGraph, pdaGraphEditor, ui.pdaSelectedState);
}

function bindSimpleGraphEditor(container, editorData, selectedEl, options) {
  const { prefix, kind } = options;
  container.addEventListener("pointerdown", (event) => {
    container.focus();
    const edgeTarget = event.target.closest("[data-edge]");
    if (edgeTarget) {
      editorData.selectedEdgeKey = edgeTarget.getAttribute("data-edge");
      editorData.selectedState = null;
      renderSimpleGraph(container, editorData, selectedEl);
      return;
    }
    const nodeTarget = event.target.closest("[data-node]");
    if (!nodeTarget) {
      editorData.selectedState = null;
      editorData.selectedEdgeKey = null;
      editorData.panActive = true;
      editorData.panPointerId = event.pointerId;
      editorData.panStartClientX = event.clientX;
      editorData.panStartClientY = event.clientY;
      editorData.panStartOffsetX = editorData.viewX;
      editorData.panStartOffsetY = editorData.viewY;
      container.setPointerCapture(event.pointerId);
      container.classList.add("panning");
      renderSimpleGraph(container, editorData, selectedEl);
      return;
    }
    const state = nodeTarget.getAttribute("data-node");
    if (!state || !editorData.nodes.has(state)) return;
    editorData.selectedState = state;
    editorData.selectedEdgeKey = null;
    if (event.shiftKey) {
      editorData.linkFrom = state;
      editorData.linkTo = getPointInGraph(container, event);
      renderSimpleGraph(container, editorData, selectedEl);
      return;
    }
    editorData.dragNode = state;
    editorData.dragPointerId = event.pointerId;
    container.setPointerCapture(event.pointerId);
    renderSimpleGraph(container, editorData, selectedEl);
  });

  container.addEventListener("pointermove", (event) => {
    if (editorData.panActive) {
      const svg = container.querySelector("svg");
      if (!svg) return;
      const rect = svg.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      const worldDx = (event.clientX - editorData.panStartClientX) * (GRAPH_WIDTH / rect.width);
      const worldDy = (event.clientY - editorData.panStartClientY) * (GRAPH_HEIGHT / rect.height);
      editorData.viewX = clamp(editorData.panStartOffsetX - worldDx, -WORLD_LIMIT, WORLD_LIMIT);
      editorData.viewY = clamp(editorData.panStartOffsetY - worldDy, -WORLD_LIMIT, WORLD_LIMIT);
      renderSimpleGraph(container, editorData, selectedEl);
      return;
    }

    if (editorData.dragNode) {
      const p = getPointInGraph(container, event);
      const node = editorData.nodes.get(editorData.dragNode);
      if (!node) return;
      node.x = p.x;
      node.y = p.y;
      enforceMinNodeDistance(editorData.nodes, editorData.dragNode);
      renderSimpleGraph(container, editorData, selectedEl);
      return;
    }
    if (editorData.linkFrom) {
      editorData.linkTo = getPointInGraph(container, event);
      renderSimpleGraph(container, editorData, selectedEl);
    }
  });

  container.addEventListener("pointerup", (event) => {
    if (editorData.panActive) {
      if (editorData.panPointerId !== null) {
        try { container.releasePointerCapture(editorData.panPointerId); } catch {}
      }
      editorData.panActive = false;
      editorData.panPointerId = null;
      container.classList.remove("panning");
      renderSimpleGraph(container, editorData, selectedEl);
      return;
    }

    if (editorData.dragNode) {
      try { container.releasePointerCapture(editorData.dragPointerId); } catch {}
      editorData.dragNode = null;
      editorData.dragPointerId = null;
      renderSimpleGraph(container, editorData, selectedEl);
      return;
    }
    if (editorData.linkFrom) {
      const from = editorData.linkFrom;
      const nodeTarget = event.target.closest("[data-node]");
      if (nodeTarget) {
        const to = nodeTarget.getAttribute("data-node");
        if (to && editorData.nodes.has(to)) {
          if (kind === "fa") {
            const label = window.prompt("Etiqueta (eps/ε, símbolo o varios separados por coma):", "0");
            if (label !== null) {
              splitByCommaPreserve(label).map((x) => x.trim()).filter(Boolean).forEach((sym) => {
                editorData.transitions.push({ fromState: from, toState: to, label: sym });
              });
              editorData.selectedEdgeKey = `${from}=>${to}`;
              syncFaFormFromGraph();
            }
          } else {
            const label = window.prompt("Etiqueta PDA: input,top -> push", "eps,Z -> Z");
            if (label !== null && label.includes("->")) {
              editorData.transitions.push({ fromState: from, toState: to, label: label.trim() });
              editorData.selectedEdgeKey = `${from}=>${to}`;
              syncPdaFormFromGraph();
            }
          }
        }
      }
      editorData.linkFrom = null;
      editorData.linkTo = null;
      renderSimpleGraph(container, editorData, selectedEl);
    }
  });

  container.addEventListener("dblclick", (event) => {
    const edgeTarget = event.target.closest("[data-edge]");
    if (edgeTarget) {
      const key = edgeTarget.getAttribute("data-edge");
      editorData.selectedEdgeKey = key;
      const edgeEntries = editorData.transitions.filter((t) => `${t.fromState}=>${t.toState}` === key);
      const current = edgeEntries.map((e) => e.label).join("\n");
      const updated = window.prompt("Editar etiquetas (una por línea):", current);
      if (updated !== null) {
        editorData.transitions = editorData.transitions.filter((t) => `${t.fromState}=>${t.toState}` !== key);
        updated.split("\n").map((x) => x.trim()).filter(Boolean).forEach((label) => {
          const [fromState, toState] = key.split("=>");
          editorData.transitions.push({ fromState, toState, label });
        });
        if (kind === "fa") syncFaFormFromGraph(); else syncPdaFormFromGraph();
        renderSimpleGraph(container, editorData, selectedEl);
      }
      return;
    }
    const nodeTarget = event.target.closest("[data-node]");
    if (nodeTarget) return;
    const p = getPointInGraph(container, event);
    const name = nextStateName(editorData, prefix);
    const hasStart = [...editorData.nodes.values()].some((n) => n.isStart);
    editorData.nodes.set(name, { x: p.x, y: p.y, isStart: !hasStart, isAccept: false });
    editorData.selectedState = name;
    editorData.selectedEdgeKey = null;
    enforceMinNodeDistance(editorData.nodes, name);
    if (kind === "fa") syncFaFormFromGraph(); else syncPdaFormFromGraph();
    renderSimpleGraph(container, editorData, selectedEl);
  });

  container.addEventListener("keydown", (event) => {
    if (isEditableElement(event.target)) {
      return;
    }
    if (event.key !== "Delete" && event.key !== "Backspace") {
      return;
    }
    if (!editorData.selectedEdgeKey) {
      return;
    }
    const edgeKey = editorData.selectedEdgeKey;
    editorData.transitions = editorData.transitions.filter(
      (t) => `${t.fromState}=>${t.toState}` !== edgeKey,
    );
    editorData.selectedEdgeKey = null;
    if (kind === "fa") {
      syncFaFormFromGraph();
    } else {
      syncPdaFormFromGraph();
    }
    renderSimpleGraph(container, editorData, selectedEl);
    event.preventDefault();
  });
}

function parseFaTransitions(raw) {
  const map = new Map();
  const lines = raw
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#"));
  lines.forEach((line, idx) => {
    const [left, right] = line.split("->").map((x) => x.trim());
    if (!left || !right) {
      throw new Error(`Transición inválida en línea ${idx + 1}.`);
    }
    const [from, symbolRaw] = splitByCommaPreserve(left);
    const symbol = normalizeEpsilonLabel(symbolRaw || "");
    if (!from || !symbol) {
      throw new Error(`Línea ${idx + 1}: faltan origen o símbolo.`);
    }
    const destinations = splitByCommaPreserve(right).map((d) => d.trim()).filter(Boolean);
    if (!destinations.length) {
      throw new Error(`Línea ${idx + 1}: falta estado destino.`);
    }
    const key = `${from}|${symbol}`;
    if (!map.has(key)) {
      map.set(key, new Set());
    }
    destinations.forEach((d) => map.get(key).add(d));
  });
  return map;
}

function buildFaModel() {
  const states = new Set(parseCsvList(ui.faStates.value));
  const alphabet = new Set(parseCsvList(ui.faAlphabet.value).map((s) => normalizeEpsilonLabel(s)));
  const startState = ui.faStartState.value.trim();
  const acceptStates = new Set(parseCsvList(ui.faAcceptStates.value));
  const transitions = parseFaTransitions(ui.faTransitions.value);

  if (!startState || !states.has(startState)) {
    throw new Error("Estado inicial inválido en AF.");
  }
  acceptStates.forEach((s) => {
    if (!states.has(s)) {
      throw new Error(`Estado de aceptación inválido: ${s}`);
    }
  });
  transitions.forEach((destSet, key) => {
    const [from, symbol] = key.split("|");
    if (!states.has(from)) {
      throw new Error(`Estado origen inválido en transición: ${from}`);
    }
    if (symbol !== "eps") {
      alphabet.add(symbol);
    }
    destSet.forEach((dest) => {
      if (!states.has(dest)) {
        throw new Error(`Estado destino inválido en transición: ${dest}`);
      }
    });
  });

  return { states, alphabet, startState, acceptStates, transitions };
}

function evaluateFA(model, word) {
  const transitionsList = [];
  model.transitions.forEach((destSet, key) => {
    const [from, label] = key.split("|");
    destSet.forEach((to) => transitionsList.push({ from, label, to }));
  });

  const q = [{ state: model.startState, pos: 0 }];
  const seen = new Set();
  let accepted = false;
  let frontier = new Set();

  while (q.length) {
    const cfg = q.shift();
    const cfgKey = `${cfg.state}|${cfg.pos}`;
    if (seen.has(cfgKey)) continue;
    seen.add(cfgKey);
    frontier.add(cfg.state);
    if (cfg.pos === word.length && model.acceptStates.has(cfg.state)) {
      accepted = true;
      break;
    }

    transitionsList.forEach((t) => {
      if (t.from !== cfg.state) return;
      if (t.label === "eps") {
        q.push({ state: t.to, pos: cfg.pos });
        return;
      }
      if (word.startsWith(t.label, cfg.pos)) {
        q.push({ state: t.to, pos: cfg.pos + t.label.length });
      }
    });
  }

  return {
    accepted,
    detail: `Estados explorados: ${[...frontier].join(", ") || "∅"}`,
  };
}

function expandLabelsToUnitNFA(model) {
  const states = new Set(model.states);
  const transitions = new Map();
  const alphabet = new Set();
  let aux = 0;
  const addTransition = (from, symbol, to) => {
    const key = `${from}|${symbol}`;
    if (!transitions.has(key)) transitions.set(key, new Set());
    transitions.get(key).add(to);
    if (symbol !== "eps") alphabet.add(symbol);
  };

  model.transitions.forEach((destSet, key) => {
    const [from, labelRaw] = key.split("|");
    const label = normalizeEpsilonLabel(labelRaw);
    destSet.forEach((to) => {
      if (label === "eps") {
        addTransition(from, "eps", to);
        return;
      }
      if (label.length <= 1) {
        addTransition(from, label, to);
        return;
      }
      let prev = from;
      for (let i = 0; i < label.length; i += 1) {
        const ch = label[i];
        const next = i === label.length - 1 ? to : `__aux${aux++}`;
        states.add(next);
        addTransition(prev, ch, next);
        prev = next;
      }
    });
  });

  return {
    states,
    alphabet,
    startState: model.startState,
    acceptStates: new Set(model.acceptStates),
    transitions,
  };
}

function epsilonClosure(transitions, inputStates) {
  const closure = new Set(inputStates);
  const stack = [...inputStates];
  while (stack.length) {
    const state = stack.pop();
    const next = transitions.get(`${state}|eps`) || new Set();
    next.forEach((n) => {
      if (!closure.has(n)) {
        closure.add(n);
        stack.push(n);
      }
    });
  }
  return closure;
}

function determinizeNFA(nfaUnit) {
  const alphabet = [...nfaUnit.alphabet].filter((a) => a !== "eps");
  const startSet = epsilonClosure(nfaUnit.transitions, new Set([nfaUnit.startState]));
  const setKey = (set) => [...set].sort().join("&") || "∅";
  const queue = [startSet];
  const seen = new Set([setKey(startSet)]);
  const states = new Map([[setKey(startSet), startSet]]);
  const transitions = new Map();

  while (queue.length) {
    const currentSet = queue.shift();
    const currentKey = setKey(currentSet);
    alphabet.forEach((symbol) => {
      const moveSet = new Set();
      currentSet.forEach((state) => {
        const next = nfaUnit.transitions.get(`${state}|${symbol}`);
        if (next) {
          next.forEach((n) => moveSet.add(n));
        }
      });
      const targetSet = epsilonClosure(nfaUnit.transitions, moveSet);
      const targetKey = setKey(targetSet);
      transitions.set(`${currentKey}|${symbol}`, targetKey);
      if (!seen.has(targetKey)) {
        seen.add(targetKey);
        states.set(targetKey, targetSet);
        queue.push(targetSet);
      }
    });
  }

  const acceptStates = new Set(
    [...states.entries()]
      .filter(([, subset]) => [...subset].some((s) => nfaUnit.acceptStates.has(s)))
      .map(([name]) => name),
  );

  return {
    states: new Set(states.keys()),
    alphabet: new Set(alphabet),
    startState: setKey(startSet),
    acceptStates,
    transitions,
  };
}

function minimizeDFA(dfa) {
  const alphabet = [...dfa.alphabet];
  const reachable = new Set([dfa.startState]);
  const queue = [dfa.startState];
  while (queue.length) {
    const s = queue.shift();
    alphabet.forEach((a) => {
      const n = dfa.transitions.get(`${s}|${a}`);
      if (n && !reachable.has(n)) {
        reachable.add(n);
        queue.push(n);
      }
    });
  }
  const allStates = [...reachable];
  let partitions = [];
  const acc = new Set(allStates.filter((s) => dfa.acceptStates.has(s)));
  const nonAcc = new Set(allStates.filter((s) => !dfa.acceptStates.has(s)));
  if (acc.size) partitions.push(acc);
  if (nonAcc.size) partitions.push(nonAcc);

  let changed = true;
  while (changed) {
    changed = false;
    const newParts = [];
    partitions.forEach((part) => {
      const groups = new Map();
      part.forEach((state) => {
        const signature = alphabet
          .map((a) => {
            const t = dfa.transitions.get(`${state}|${a}`);
            return partitions.findIndex((p) => p.has(t));
          })
          .join("|");
        if (!groups.has(signature)) groups.set(signature, new Set());
        groups.get(signature).add(state);
      });
      if (groups.size > 1) changed = true;
      groups.forEach((g) => newParts.push(g));
    });
    partitions = newParts;
  }

  const partName = (part) => [...part].sort().join("_");
  const minimizedStates = new Set(partitions.map(partName));
  const stateToPart = new Map();
  partitions.forEach((p) => p.forEach((s) => stateToPart.set(s, partName(p))));

  const transitions = new Map();
  partitions.forEach((p) => {
    const rep = [...p][0];
    const from = partName(p);
    alphabet.forEach((a) => {
      const t = dfa.transitions.get(`${rep}|${a}`);
      if (t) transitions.set(`${from}|${a}`, stateToPart.get(t));
    });
  });

  const acceptStates = new Set(
    partitions.filter((p) => [...p].some((s) => dfa.acceptStates.has(s))).map(partName),
  );

  return {
    states: minimizedStates,
    alphabet: new Set(alphabet),
    startState: stateToPart.get(dfa.startState),
    acceptStates,
    transitions,
  };
}

function formatDFA(dfa) {
  const lines = [];
  lines.push(`Estados: ${[...dfa.states].join(", ")}`);
  lines.push(`Alfabeto: ${[...dfa.alphabet].join(", ")}`);
  lines.push(`Inicial: ${dfa.startState}`);
  lines.push(`Aceptación: ${[...dfa.acceptStates].join(", ") || "-"}`);
  lines.push("Transiciones:");
  [...dfa.transitions.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .forEach(([k, v]) => {
      const [from, symbol] = k.split("|");
      lines.push(`${from},${symbol} -> ${v}`);
    });
  return lines.join("\n");
}

function handleFaEvaluate() {
  try {
    const model = buildFaModel();
    const result = evaluateFA(model, ui.faInputWord.value);
    ui.faResult.textContent = result.accepted ? "Aceptada" : "Rechazada";
    ui.faMessage.textContent = result.detail;
  } catch (err) {
    ui.faResult.textContent = "Error";
    ui.faMessage.textContent = err.message;
  }
}

function handleFaMinimize() {
  try {
    const model = buildFaModel();
    const nfaUnit = expandLabelsToUnitNFA(model);
    const dfa = determinizeNFA(nfaUnit);
    const minimized = minimizeDFA(dfa);
    ui.faMinimizedOutput.value = formatDFA(minimized);
    ui.faMessage.textContent = "AF convertido a DFA y minimizado.";
  } catch (err) {
    ui.faMinimizedOutput.value = "";
    ui.faMessage.textContent = err.message;
  }
}

function loadFaExample() {
  ui.faStates.value = "q0,q1,q2,q3,q4";
  ui.faAlphabet.value = "a,b";
  ui.faStartState.value = "q0";
  ui.faAcceptStates.value = "q4";
  ui.faTransitions.value = [
    "q0,eps -> q1",
    "q1,ab -> q2",
    "q1,a -> q3",
    "q3,b -> q4",
    "q2,eps -> q4",
  ].join("\n");
  ui.faInputWord.value = "ab";
  ui.faResult.textContent = "-";
  ui.faMessage.textContent = "Ejemplo AF cargado (eps y etiquetas multi-símbolo).";
  ui.faMinimizedOutput.value = "";
}

function parsePdaTransitions(raw) {
  const lines = raw
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#"));
  return lines.map((line, idx) => {
    const [left, right] = line.split("->").map((x) => x.trim());
    if (!left || !right) {
      throw new Error(`Transición PDA inválida en línea ${idx + 1}.`);
    }
    const [state, inputSym, stackTop] = splitByCommaPreserve(left).map((x) => x.trim());
    const [nextState, pushRaw] = splitByCommaPreserve(right).map((x) => x.trim());
    if (!state || !inputSym || !stackTop || !nextState || pushRaw === undefined) {
      throw new Error(`Línea ${idx + 1}: faltan campos PDA.`);
    }
    return { state, inputSym, stackTop, nextState, push: pushRaw };
  });
}

function buildPdaModel() {
  const states = new Set(parseCsvList(ui.pdaStates.value));
  const startState = ui.pdaStartState.value.trim();
  const acceptStates = new Set(parseCsvList(ui.pdaAcceptStates.value));
  const initialStack = ui.pdaInitialStack.value.trim();
  const transitions = parsePdaTransitions(ui.pdaTransitions.value);
  if (!states.has(startState)) {
    throw new Error("Estado inicial inválido en PDA.");
  }
  return { states, startState, acceptStates, initialStack, transitions };
}

function evaluatePDA(model, input) {
  const maxSteps = 20000;
  const queue = [{ state: model.startState, pos: 0, stack: [model.initialStack] }];
  const seen = new Set();
  let steps = 0;

  while (queue.length && steps < maxSteps) {
    steps += 1;
    const cfg = queue.shift();
    const top = cfg.stack.length ? cfg.stack[cfg.stack.length - 1] : "eps";
    const key = `${cfg.state}|${cfg.pos}|${cfg.stack.join("")}`;
    if (seen.has(key)) continue;
    seen.add(key);

    if (cfg.pos === input.length && model.acceptStates.has(cfg.state)) {
      return { accepted: true, detail: `Aceptada en ${cfg.state}.` };
    }

    model.transitions.forEach((t) => {
      if (t.state !== cfg.state) return;
      const inputMatch = t.inputSym === "eps" || input[cfg.pos] === t.inputSym;
      if (!inputMatch) return;
      const topMatch = t.stackTop === "eps" || top === t.stackTop;
      if (!topMatch) return;

      const nextPos = t.inputSym === "eps" ? cfg.pos : cfg.pos + 1;
      const nextStack = [...cfg.stack];
      if (t.stackTop !== "eps") nextStack.pop();
      if (t.push !== "eps" && t.push !== "") {
        for (let i = t.push.length - 1; i >= 0; i -= 1) {
          nextStack.push(t.push[i]);
        }
      }
      queue.push({ state: t.nextState, pos: nextPos, stack: nextStack });
    });
  }

  return { accepted: false, detail: "No se encontró configuración de aceptación." };
}

function handlePdaEvaluate() {
  try {
    const model = buildPdaModel();
    const result = evaluatePDA(model, ui.pdaInputWord.value);
    ui.pdaResult.textContent = result.accepted ? "Aceptada" : "Rechazada";
    ui.pdaMessage.textContent = result.detail;
  } catch (err) {
    ui.pdaResult.textContent = "Error";
    ui.pdaMessage.textContent = err.message;
  }
}

function loadPdaExample() {
  ui.pdaStates.value = "q0,qf";
  ui.pdaStartState.value = "q0";
  ui.pdaAcceptStates.value = "qf";
  ui.pdaInitialStack.value = "Z";
  ui.pdaTransitions.value = [
    "q0,(,Z -> q0,(Z",
    "q0,(,( -> q0,((",
    "q0,),(( -> q0,eps",
    "q0,eps,Z -> qf,Z",
  ].join("\n");
  ui.pdaInputWord.value = "(())()";
  ui.pdaResult.textContent = "-";
  ui.pdaMessage.textContent = "Ejemplo PDA cargado.";
}

function editorAddState(editorData, prefix, kind) {
  const name = nextStateName(editorData, prefix);
  const hasStart = [...editorData.nodes.values()].some((n) => n.isStart);
  editorData.nodes.set(name, { x: GRAPH_WIDTH / 2, y: GRAPH_HEIGHT / 2, isStart: !hasStart, isAccept: false });
  editorData.selectedState = name;
  editorData.selectedEdgeKey = null;
  enforceMinNodeDistance(editorData.nodes, name);
  if (kind === "fa") {
    syncFaFormFromGraph();
    renderSimpleGraph(ui.faGraph, faGraphEditor, ui.faSelectedState);
  } else {
    syncPdaFormFromGraph();
    renderSimpleGraph(ui.pdaGraph, pdaGraphEditor, ui.pdaSelectedState);
  }
}

function editorSetStart(editorData, kind) {
  if (!editorData.selectedState || !editorData.nodes.has(editorData.selectedState)) return;
  editorData.nodes.forEach((node) => { node.isStart = false; });
  editorData.nodes.get(editorData.selectedState).isStart = true;
  if (kind === "fa") {
    syncFaFormFromGraph();
    renderSimpleGraph(ui.faGraph, faGraphEditor, ui.faSelectedState);
  } else {
    syncPdaFormFromGraph();
    renderSimpleGraph(ui.pdaGraph, pdaGraphEditor, ui.pdaSelectedState);
  }
}

function editorToggleAccept(editorData, kind) {
  if (!editorData.selectedState || !editorData.nodes.has(editorData.selectedState)) return;
  const node = editorData.nodes.get(editorData.selectedState);
  node.isAccept = !node.isAccept;
  if (kind === "fa") {
    syncFaFormFromGraph();
    renderSimpleGraph(ui.faGraph, faGraphEditor, ui.faSelectedState);
  } else {
    syncPdaFormFromGraph();
    renderSimpleGraph(ui.pdaGraph, pdaGraphEditor, ui.pdaSelectedState);
  }
}

function editorDeleteState(editorData, kind) {
  if (!editorData.selectedState || !editorData.nodes.has(editorData.selectedState)) return;
  const s = editorData.selectedState;
  editorData.nodes.delete(s);
  editorData.transitions = editorData.transitions.filter((t) => t.fromState !== s && t.toState !== s);
  editorData.selectedState = null;
  editorData.selectedEdgeKey = null;
  if (kind === "fa") {
    syncFaFormFromGraph();
    renderSimpleGraph(ui.faGraph, faGraphEditor, ui.faSelectedState);
  } else {
    syncPdaFormFromGraph();
    renderSimpleGraph(ui.pdaGraph, pdaGraphEditor, ui.pdaSelectedState);
  }
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
ui.tapeCount.addEventListener("change", () => {
  const previous = (() => {
    try {
      return readInitialTapesFromEditor();
    } catch {
      return null;
    }
  })();
  const nextCount = getConfiguredTapeCount();
  ui.tapeCount.value = String(nextCount);
  renderInitialTapesEditor(nextCount, previous);
  autoAdjustTransitionsToTapeCount(nextCount);
  refreshTransitionEditors();
});
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
ui.openDiagramConfig.addEventListener("click", () => {
  ui.diagramMinDistance.value = String(diagramConfig.minNodeDistance);
  openDialog(ui.diagramConfigDialog);
});
ui.diagramConfigCancel.addEventListener("click", () => {
  closeDialog(ui.diagramConfigDialog);
});
ui.diagramConfigSave.addEventListener("click", () => {
  const parsed = Number.parseInt(ui.diagramMinDistance.value, 10);
  const next = clamp(Number.isFinite(parsed) ? parsed : diagramConfig.minNodeDistance, 68, 5000);
  diagramConfig.minNodeDistance = next;
  ui.diagramMinDistance.value = String(next);
  applyMinDistanceToAllDiagrams();
  renderStateGraph();
  renderSimpleGraph(ui.faGraph, faGraphEditor, ui.faSelectedState);
  renderSimpleGraph(ui.pdaGraph, pdaGraphEditor, ui.pdaSelectedState);
  closeDialog(ui.diagramConfigDialog);
  message(`Distancia mínima de nodos: ${next}px.`, "ok");
});
ui.tabTM.addEventListener("click", () => switchView("tm"));
ui.tabFA.addEventListener("click", () => switchView("fa"));
ui.tabPDA.addEventListener("click", () => switchView("pda"));
ui.faLoadExample.addEventListener("click", loadFaExample);
ui.faEvaluate.addEventListener("click", handleFaEvaluate);
ui.faMinimize.addEventListener("click", handleFaMinimize);
ui.faAddState.addEventListener("click", () => editorAddState(faGraphEditor, "q", "fa"));
ui.faSetStart.addEventListener("click", () => editorSetStart(faGraphEditor, "fa"));
ui.faToggleAccept.addEventListener("click", () => editorToggleAccept(faGraphEditor, "fa"));
ui.faDeleteState.addEventListener("click", () => editorDeleteState(faGraphEditor, "fa"));
ui.faLoadGraphFromText.addEventListener("click", loadFaGraphFromForm);
ui.pdaLoadExample.addEventListener("click", loadPdaExample);
ui.pdaEvaluate.addEventListener("click", handlePdaEvaluate);
ui.pdaAddState.addEventListener("click", () => editorAddState(pdaGraphEditor, "p", "pda"));
ui.pdaSetStart.addEventListener("click", () => editorSetStart(pdaGraphEditor, "pda"));
ui.pdaToggleAccept.addEventListener("click", () => editorToggleAccept(pdaGraphEditor, "pda"));
ui.pdaDeleteState.addEventListener("click", () => editorDeleteState(pdaGraphEditor, "pda"));
ui.pdaLoadGraphFromText.addEventListener("click", loadPdaGraphFromForm);

setRunButtons(false);
refreshSelectedState();
refreshSelectedTransition();
ui.diagramMinDistance.value = String(diagramConfig.minNodeDistance);
loadExample();
loadFaExample();
loadPdaExample();
bindSimpleGraphEditor(ui.faGraph, faGraphEditor, ui.faSelectedState, { prefix: "q", kind: "fa" });
bindSimpleGraphEditor(ui.pdaGraph, pdaGraphEditor, ui.pdaSelectedState, { prefix: "p", kind: "pda" });
loadFaGraphFromForm();
loadPdaGraphFromForm();
switchView("tm");
