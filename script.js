const STORAGE_KEY = "nossa-historia-site-v1";

const defaultState = {
  settings: {
    personOne: "Eu",
    personTwo: "Meu amor",
    startDate: "2024-02-14"
  },
  photos: [
    {
      id: "demo-photo-1",
      caption: "Nossa foto favorita",
      date: "2024-02-14",
      image: ""
    }
  ],
  memories: [
    {
      id: "demo-memory-1",
      title: "O dia em que tudo ficou oficial",
      date: "2024-02-14",
      place: "Nosso lugar especial",
      note: "Troque este texto por uma lembranca de voces dois."
    },
    {
      id: "demo-memory-2",
      title: "Um passeio que merece replay",
      date: "2024-06-12",
      place: "Aquela rua bonita",
      note: "Guarde aqui pequenos detalhes: uma musica, uma risada, uma frase."
    }
  ],
  theme: "light"
};

let state = loadState();
let counterTimer;

const elements = {
  heroTitle: document.querySelector("#heroTitle"),
  heroSubtitle: document.querySelector("#heroSubtitle"),
  sinceLabel: document.querySelector("#sinceLabel"),
  counterGrid: document.querySelector("#counterGrid"),
  settingsForm: document.querySelector("#settingsForm"),
  personOne: document.querySelector("#personOne"),
  personTwo: document.querySelector("#personTwo"),
  startDate: document.querySelector("#startDate"),
  photoForm: document.querySelector("#photoForm"),
  photoInput: document.querySelector("#photoInput"),
  photoCaption: document.querySelector("#photoCaption"),
  photoDate: document.querySelector("#photoDate"),
  memoryForm: document.querySelector("#memoryForm"),
  memoryTitle: document.querySelector("#memoryTitle"),
  memoryDate: document.querySelector("#memoryDate"),
  memoryPlace: document.querySelector("#memoryPlace"),
  memoryNote: document.querySelector("#memoryNote"),
  photoGrid: document.querySelector("#photoGrid"),
  timeline: document.querySelector("#timeline"),
  placesGrid: document.querySelector("#placesGrid"),
  themeToggle: document.querySelector("#themeToggle"),
  exportButton: document.querySelector("#exportButton"),
  resetDemoButton: document.querySelector("#resetDemoButton"),
  photoJumpButton: document.querySelector("#photoJumpButton"),
  emptyTemplate: document.querySelector("#emptyStateTemplate")
};

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (!saved) return structuredClone(defaultState);
    return {
      ...structuredClone(defaultState),
      ...saved,
      settings: { ...defaultState.settings, ...saved.settings }
    };
  } catch {
    return structuredClone(defaultState);
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function uid(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function formatDate(dateString) {
  if (!dateString) return "Sem data";
  const date = new Date(`${dateString}T12:00:00`);
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric"
  }).format(date);
}

function sortByDateDesc(items) {
  return [...items].sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
}

function applyTheme() {
  document.body.classList.toggle("dark", state.theme === "dark");
}

function renderSettings() {
  const { personOne, personTwo, startDate } = state.settings;
  const title = `${personOne} & ${personTwo}`;
  elements.heroTitle.textContent = title;
  document.title = title;
  elements.heroSubtitle.textContent = "Cada foto, lugar e detalhe que vale a pena guardar.";
  elements.personOne.value = personOne;
  elements.personTwo.value = personTwo;
  elements.startDate.value = startDate;
  elements.sinceLabel.textContent = formatDate(startDate);
}

function calculateDuration(startDate) {
  const start = new Date(`${startDate}T00:00:00`);
  const now = new Date();

  if (Number.isNaN(start.getTime()) || start > now) {
    return { years: 0, months: 0, days: 0, hours: 0, minutes: 0, seconds: 0 };
  }

  let cursor = new Date(start);
  let years = 0;
  while (addYears(cursor, 1) <= now) {
    cursor = addYears(cursor, 1);
    years += 1;
  }

  let months = 0;
  while (addMonths(cursor, 1) <= now) {
    cursor = addMonths(cursor, 1);
    months += 1;
  }

  const difference = now - cursor;
  const days = Math.floor(difference / 86400000);
  const hours = Math.floor((difference % 86400000) / 3600000);
  const minutes = Math.floor((difference % 3600000) / 60000);
  const seconds = Math.floor((difference % 60000) / 1000);

  return { years, months, days, hours, minutes, seconds };
}

function addYears(date, years) {
  const next = new Date(date);
  next.setFullYear(next.getFullYear() + years);
  return next;
}

function addMonths(date, months) {
  const next = new Date(date);
  next.setMonth(next.getMonth() + months);
  return next;
}

function renderCounter() {
  const duration = calculateDuration(state.settings.startDate);
  Object.entries(duration).forEach(([unit, value]) => {
    const node = elements.counterGrid.querySelector(`[data-unit="${unit}"]`);
    if (node) node.textContent = value;
  });
}

function createDeleteButton(label, onDelete) {
  const button = document.createElement("button");
  button.className = "delete-button";
  button.type = "button";
  button.setAttribute("aria-label", label);
  button.title = label;
  button.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4a1 1 0 0 1 1-1h8a1 1 0 0 1 1 1v1h4v2h-2v13a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V7H3V5h4V4Zm2 1h6V4H9v1Zm-2 2v13h10V7H7Zm2 3h2v7H9v-7Zm4 0h2v7h-2v-7Z"/></svg>';
  button.addEventListener("click", onDelete);
  return button;
}

function renderPhotos() {
  elements.photoGrid.replaceChildren();

  if (!state.photos.length) {
    elements.photoGrid.appendChild(emptyState("F", "Adicione a primeira foto de voces."));
    return;
  }

  sortByDateDesc(state.photos).forEach((photo) => {
    const article = document.createElement("article");
    article.className = "photo-card";

    if (photo.image) {
      const image = document.createElement("img");
      image.src = photo.image;
      image.alt = photo.caption || "Foto do casal";
      article.appendChild(image);
    } else {
      const placeholder = document.createElement("div");
      placeholder.className = "photo-placeholder";
      placeholder.textContent = "Foto";
      article.appendChild(placeholder);
    }

    const body = document.createElement("div");
    body.className = "photo-body";
    body.innerHTML = `
      <p class="card-date">${formatDate(photo.date)}</p>
      <h3>${escapeHtml(photo.caption || "Uma memoria bonita")}</h3>
    `;
    article.appendChild(body);
    article.appendChild(createDeleteButton("Excluir foto", () => deletePhoto(photo.id)));
    elements.photoGrid.appendChild(article);
  });
}

function renderMemories() {
  elements.timeline.replaceChildren();

  if (!state.memories.length) {
    elements.timeline.appendChild(emptyState("M", "Guarde aqui os momentos mais importantes."));
    renderPlaces();
    return;
  }

  sortByDateDesc(state.memories).forEach((memory) => {
    const article = document.createElement("article");
    article.className = "memory-card";
    article.innerHTML = `
      <p class="card-date">${formatDate(memory.date)}</p>
      <h3>${escapeHtml(memory.title)}</h3>
      <p>${escapeHtml(memory.note || "Sem detalhes ainda.")}</p>
      <div class="memory-actions">
        <span>${escapeHtml(memory.place || "Lugar nao informado")}</span>
        ${memory.place ? `<a class="map-link" href="${mapsUrl(memory.place)}" target="_blank" rel="noreferrer">Abrir mapa</a>` : ""}
      </div>
    `;
    article.appendChild(createDeleteButton("Excluir momento", () => deleteMemory(memory.id)));
    elements.timeline.appendChild(article);
  });

  renderPlaces();
}

function renderPlaces() {
  elements.placesGrid.replaceChildren();
  const places = state.memories
    .filter((memory) => memory.place)
    .reduce((acc, memory) => {
      const key = memory.place.trim().toLowerCase();
      if (!acc.has(key)) acc.set(key, { name: memory.place.trim(), count: 0, latest: memory.date });
      const place = acc.get(key);
      place.count += 1;
      if (new Date(memory.date) > new Date(place.latest)) place.latest = memory.date;
      return acc;
    }, new Map());

  const placeList = [...places.values()].sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));

  if (!placeList.length) {
    elements.placesGrid.appendChild(emptyState("L", "Quando voce adicionar lugares nos momentos, eles aparecem aqui."));
    return;
  }

  placeList.forEach((place, index) => {
    const article = document.createElement("article");
    article.className = "place-card";
    article.innerHTML = `
      <div class="place-index">${index + 1}</div>
      <h3>${escapeHtml(place.name)}</h3>
      <p>${place.count} ${place.count === 1 ? "momento guardado" : "momentos guardados"} neste lugar.</p>
      <a class="map-link" href="${mapsUrl(place.name)}" target="_blank" rel="noreferrer">Ver no mapa</a>
    `;
    elements.placesGrid.appendChild(article);
  });
}

function emptyState(initial, text) {
  const node = elements.emptyTemplate.content.firstElementChild.cloneNode(true);
  node.querySelector("span").textContent = initial;
  node.querySelector("p").textContent = text;
  return node;
}

function mapsUrl(place) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place)}`;
}

function deletePhoto(id) {
  state.photos = state.photos.filter((photo) => photo.id !== id);
  saveState();
  renderPhotos();
}

function deleteMemory(id) {
  state.memories = state.memories.filter((memory) => memory.id !== id);
  saveState();
  renderMemories();
}

function escapeHtml(value) {
  const div = document.createElement("div");
  div.textContent = value;
  return div.innerHTML;
}

async function resizeImage(file) {
  const dataUrl = await readFileAsDataUrl(file);
  const image = await loadImage(dataUrl);
  const canvas = document.createElement("canvas");
  const maxSide = 1280;
  const ratio = Math.min(1, maxSide / Math.max(image.width, image.height));
  canvas.width = Math.round(image.width * ratio);
  canvas.height = Math.round(image.height * ratio);
  const context = canvas.getContext("2d");
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", 0.82);
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = src;
  });
}

function downloadJson() {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "nossa-historia.json";
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function bindEvents() {
  elements.settingsForm.addEventListener("submit", (event) => {
    event.preventDefault();
    state.settings = {
      personOne: elements.personOne.value.trim() || "Eu",
      personTwo: elements.personTwo.value.trim() || "Meu amor",
      startDate: elements.startDate.value || defaultState.settings.startDate
    };
    saveState();
    renderSettings();
    renderCounter();
  });

  elements.photoForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const file = elements.photoInput.files[0];
    if (!file) return;

    const button = elements.photoForm.querySelector("button");
    button.disabled = true;
    button.textContent = "Carregando...";

    try {
      const image = await resizeImage(file);
      state.photos.push({
        id: uid("photo"),
        caption: elements.photoCaption.value.trim() || "Uma memoria bonita",
        date: elements.photoDate.value || new Date().toISOString().slice(0, 10),
        image
      });
      saveState();
      elements.photoForm.reset();
      renderPhotos();
      document.querySelector("#fotos").scrollIntoView({ behavior: "smooth" });
    } finally {
      button.disabled = false;
      button.textContent = "Adicionar foto";
    }
  });

  elements.memoryForm.addEventListener("submit", (event) => {
    event.preventDefault();
    state.memories.push({
      id: uid("memory"),
      title: elements.memoryTitle.value.trim(),
      date: elements.memoryDate.value,
      place: elements.memoryPlace.value.trim(),
      note: elements.memoryNote.value.trim()
    });
    saveState();
    elements.memoryForm.reset();
    renderMemories();
    document.querySelector("#momentos").scrollIntoView({ behavior: "smooth" });
  });

  elements.themeToggle.addEventListener("click", () => {
    state.theme = state.theme === "dark" ? "light" : "dark";
    saveState();
    applyTheme();
  });

  elements.exportButton.addEventListener("click", downloadJson);

  elements.resetDemoButton.addEventListener("click", () => {
    state = structuredClone(defaultState);
    saveState();
    renderAll();
  });

  elements.photoJumpButton.addEventListener("click", () => {
    elements.photoInput.scrollIntoView({ behavior: "smooth", block: "center" });
    elements.photoInput.focus();
  });
}

function renderAll() {
  applyTheme();
  renderSettings();
  renderCounter();
  renderPhotos();
  renderMemories();
  clearInterval(counterTimer);
  counterTimer = setInterval(renderCounter, 1000);
}

bindEvents();
renderAll();
