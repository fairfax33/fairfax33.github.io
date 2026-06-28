//Drives the binary decoder on the homepage's left panel;

/*
Each navigation button carries a binary number.
Clicking one feeds that number's binary as a bitstream from the bottom
The code then rises through the input lines, inverters produce the complements, and eventually one AND line decodes high
That line's number is the result, which is sent across to the right panel before the page loads.
This behavior models after a 74x138-style decoder.
Basically: the buttons arent hardcoded to any of the pages, they are hardcoded to drive _-_-_ and the gate associated with that input fires
*/

const PROPAGATION = {
  feed: 100,
  invert: 50,
  decode: 70,
  settle: 80,
  emit: 180,
};

//Drawing coordinates
const BOARD = {
  width: 340,
  height: 300,
  top: 56,
  productTop: 86,
  productBottom: 190,
  inverterY: 230,
  padY: 266,
  firstSourceX: 50,
  sourceSpacing: 72,
  complementOffset: 26,
  productLeft: 38,
  gateLeft: 246,
  gateStraight: 16,
  gateRadius: 9,
  outputEnd: 318,
  numberX: 330,
};

const SVG_NAMESPACE = "http://www.w3.org/2000/svg";

let sequenceIsRunning = false;
//Populated by buildCircuit()
let circuit = null;

document.addEventListener("DOMContentLoaded", initialiseCircuitStage);

function initialiseCircuitStage() {
  const board = document.getElementById("circuit-board");
  if (!board) return;
  const buttons = Array.from(document.querySelectorAll(".circuit-button"));
  const pages = buttons.map((button, index) => ({
    number: index + 1,
    page: button.getAttribute("href"),
    label: button.textContent.trim(),
  }));
  circuit = buildCircuit(board, pages);
  connectButtons(buttons, pages);
}

function connectButtons(buttons, pages) {
  buttons.forEach((button, index) => {
    button.addEventListener("click", (event) => {
      //Decode sequence is what actually navigates
      event.preventDefault();
      runDecodeSequence(button, pages[index]);
    });
  });
}

//Schematic built from page list so that it can adapt to any future changes. Also this way is just cleaner
function buildCircuit(board, pages) {
  const bitCount = Math.max(1, Math.ceil(Math.log2(pages.length + 1)));
  const svg = createSvgElement("svg", {
    viewBox: `0 0 ${BOARD.width} ${BOARD.height}`,
    class: "circuit-schematic",
  });

  const sources = buildInputSources(svg, bitCount);
  const products = pages.map((page, index) =>
    buildProductLine(svg, page, index, pages.length, sources, bitCount)
  );
  const feedLayer = createSvgElement("g", { class: "feed-layer" });
  svg.appendChild(feedLayer);

  board.replaceChildren(svg);
  return { bitCount, sources, products, feedLayer };
}

//One pair of vertical lines per input bit: the true line (driven by the click) and the complement line (driven by an inverter).
function buildInputSources(svg, bitCount) {
  const group = createSvgElement("g", { class: "input-layer" });
  const sources = [];

  for (let bit = 0; bit < bitCount; bit += 1) {
    const trueX = BOARD.firstSourceX + bit * BOARD.sourceSpacing;
    const complementX = trueX + BOARD.complementOffset;
    const name = `s${bit}`;

    const trueLine = drawWire(group, [
      [trueX, BOARD.padY],
      [trueX, BOARD.top],
    ]);
    trueLine.dataset.line = name;

    const complementLine = drawWire(group, [
      [complementX, BOARD.inverterY - 11],
      [complementX, BOARD.top],
    ]);
    complementLine.dataset.line = `${name}n`;

    drawInverter(group, trueX, complementX);
    drawInputPad(group, trueX, bit, bitCount);

    sources.push({ bit, name, trueX, complementX, trueLine, complementLine });
  }

  svg.appendChild(group);
  return sources;
}

function buildProductLine(svg, page, index, total, sources, bitCount) {
  const y = productY(index, total);
  const codeBits = numberToBits(page.number, bitCount);
  const group = createSvgElement("g", { class: "product" });
  group.dataset.number = page.number;

  //Horizontal product line and the AND gate that drives the output
  drawWire(group, [
    [BOARD.productLeft, y],
    [BOARD.gateLeft, y],
  ]).classList.add("product-line");
  drawAndGate(group, y);
  drawWire(group, [
    [BOARD.gateLeft + BOARD.gateStraight + BOARD.gateRadius, y],
    [BOARD.outputEnd, y],
  ]);

  const numberLabel = createSvgElement("text", {
    x: BOARD.numberX,
    y: y + 5,
    class: "product-number",
  });
  numberLabel.textContent = page.number;
  group.appendChild(numberLabel);

  //Connection dot wherever this product taps an input line
    //A 1 taps the true line, a 0 taps the complement line
  const taps = codeBits.map((codeBit, bit) => {
    const source = sources[bit];
    const tapX = codeBit === 1 ? source.trueX : source.complementX;
    drawDot(group, tapX, y);
    return codeBit === 1 ? source.name : `${source.name}n`;
  });

  svg.appendChild(group);
  return { ...page, group, taps };
}

//Decode sequence
async function runDecodeSequence(button, page) {
  if (sequenceIsRunning) return;
  sequenceIsRunning = true;

  markSelectedButton(button);
  resetCircuit();

  const codeBits = numberToBits(page.number, circuit.bitCount);
  const liveLines = highLineNames(codeBits);

  //Clock the bitstream up from the bottom
  await streamInputBits(codeBits);

  //True input lines take the code's 1s
  energiseLines(liveLines.trueLines);
  await wait(PROPAGATION.invert);

  //Inverters drive the complement lines for the code's 0s
  energiseLines(liveLines.complementLines);
  await wait(PROPAGATION.decode);

  //The one product line whose taps are all high decodes & read as a number
  const decoded = decodeActiveProduct(liveLines.all);
  activateProduct(decoded);
  await wait(PROPAGATION.settle);

  //Flash the number to the right side of the screen then swap the page
  await emitResult(decoded.number);

  if (typeof navigateToPage === "function") {
    //swaps the right panel; left stays put
    await navigateToPage(page.page);
    sequenceIsRunning = false;
  } else {
    //fallback in case the router isn't loaded
    window.location.href = page.page; 
  }
}

//Returns the product whose every tap is among the currently-high lines with a one-hot decoder that is exactly one line
function decodeActiveProduct(highNames) {
  return circuit.products.find((product) =>
    product.taps.every((name) => highNames.includes(name))
  );
}

function highLineNames(codeBits) {
  const trueLines = [];
  const complementLines = [];

  codeBits.forEach((codeBit, bit) => {
    if (codeBit === 1) trueLines.push(`s${bit}`);
    else complementLines.push(`s${bit}n`);
  });

  return { trueLines, complementLines, all: [...trueLines, ...complementLines] };
}

function energiseLines(lineNames) {
  lineNames.forEach((name) => {
    const wire = circuit.feedLayer.ownerSVGElement.querySelector(
      `[data-line="${name}"]`
    );
    if (wire) wire.classList.add("is-high");
  });
}

function activateProduct(product) {
  if (product) product.group.classList.add("is-active");
}

function resetCircuit() {
  const svg = circuit.feedLayer.ownerSVGElement;
  svg
    .querySelectorAll(".is-high")
    .forEach((wire) => wire.classList.remove("is-high"));
  circuit.products.forEach((product) =>
    product.group.classList.remove("is-active")
  );
  circuit.feedLayer.replaceChildren();
}

//Drop the code's bits at the input pads with a short upward clock in
function streamInputBits(codeBits) {
  codeBits.forEach((codeBit, bit) => {
    const source = circuit.sources[bit];
    const token = createSvgElement("text", {
      x: source.trueX - 10,
      y: BOARD.padY - 10,
      class: "feed-bit",
    });
    token.textContent = codeBit;
    circuit.feedLayer.appendChild(token);
    requestAnimationFrame(() => token.classList.add("is-fed"));
  });

  return wait(PROPAGATION.feed);
}

//Sends the decoded number from the circuit to the right panel
//PROPAGATION.emit matches the result-cross animation duration in the CSS
async function emitResult(number) {
  const token = document.createElement("div");
  token.className = "circuit-result";
  token.textContent = number;
  document.querySelector(".home-layout").appendChild(token);

  await wait(PROPAGATION.emit);
  token.remove();
}

function markSelectedButton(selectedButton) {
  document.querySelectorAll(".circuit-button").forEach((button) => {
    button.classList.toggle("is-selected", button === selectedButton);
  });
}

//Helpers for drawing & math
function productY(index, total) {
  if (total === 1) return (BOARD.productTop + BOARD.productBottom) / 2;
  const step = (BOARD.productBottom - BOARD.productTop) / (total - 1);
  return BOARD.productTop + index * step;
}

//MSB first 
//E.g. numberToBits(3, 3) => [0, 1, 1]
function numberToBits(value, bitCount) {
  return value
    .toString(2)
    .padStart(bitCount, "0")
    .split("")
    .map(Number);
}

function drawWire(parent, points) {
  const definition = points
    .map((point, index) => `${index === 0 ? "M" : "L"} ${point[0]} ${point[1]}`)
    .join(" ");
  const wire = createSvgElement("path", { d: definition, class: "wire" });
  parent.appendChild(wire);
  return wire;
}

function drawDot(parent, x, y) {
  const dot = createSvgElement("circle", { cx: x, cy: y, r: 3.2, class: "dot" });
  parent.appendChild(dot);
}

function drawAndGate(parent, y) {
  const left = BOARD.gateLeft;
  const top = y - BOARD.gateStraight / 2 - 1;
  const definition =
    `M ${left} ${top} h ${BOARD.gateStraight} ` +
    `a ${BOARD.gateRadius} ${BOARD.gateRadius} 0 0 1 0 ${BOARD.gateStraight + 2} ` +
    `h -${BOARD.gateStraight} z`;
  const gate = createSvgElement("path", { d: definition, class: "gate" });
  parent.appendChild(gate);
}

//NOT gate (triangle + bubble) pointing up, fed from the true line.
function drawInverter(parent, trueX, complementX) {
  const y = BOARD.inverterY;
  drawWire(parent, [
    [trueX, y + 12],
    [complementX, y + 12],
    [complementX, y + 5],
  ]);

  const triangle = createSvgElement("path", {
    d: `M ${complementX - 6} ${y + 5} L ${complementX + 6} ${y + 5} L ${complementX} ${y - 6} Z`,
    class: "gate",
  });
  parent.appendChild(triangle);

  const bubble = createSvgElement("circle", {
    cx: complementX,
    cy: y - 8.5,
    r: 2.6,
    class: "gate",
  });
  parent.appendChild(bubble);
}

function drawInputPad(parent, x, bit, bitCount) {
  const pad = createSvgElement("circle", {
    cx: x,
    cy: BOARD.padY,
    r: 5,
    class: "input-pad",
  });
  parent.appendChild(pad);

  const label = createSvgElement("text", {
    x: x,
    y: BOARD.padY + 18,
    class: "input-label",
  });
  label.textContent = "A" + (bitCount - 1 - bit);
  parent.appendChild(label);
}

function createSvgElement(tag, attributes) {
  const element = document.createElementNS(SVG_NAMESPACE, tag);
  for (const name in attributes) {
    element.setAttribute(name, attributes[name]);
  }
  return element;
}

function wait(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}
