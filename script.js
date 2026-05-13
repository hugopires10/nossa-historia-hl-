const SUPABASE_URL = "https://xugajfhjrpmelehzupht.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_dVFiJ4jGMW3SYm1u-gbRog_xyD003yy";
const STORAGE_KEY = "nossa-historia-site-v1";
const BUCKET_NAME = "couple-photos";

const defaultState = {
  settings: {
    personOne: "Eu",
    personTwo: "Meu amor",
    startDate: "2024-02-14"
  },
  photos: [],
  memories: [],
  places: [],
  theme: "light"
};

let state = loadLocalState();
let counterTimer;
let currentUser = null;
let supabaseClient = null;

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
  memoryCategory: document.querySelector("#memoryCategory"),
  memoryNote: document.querySelector("#memoryNote"),
  placeForm: document.querySelector("#placeForm"),
  placeName: document.querySelector("#placeName"),
  placeNote: document.querySelector("#placeNote"),
  placeStatus: document.querySelector("#placeStatus"),
  photoGrid: document.querySelector("#photoGrid"),
  timeline: document.querySelector("#timeline"),
  placesGrid: document.querySelector("#placesGrid"),
  themeToggle: document.querySelector("#themeToggle"),
  logoutButton: document.querySelector("#logoutButton"),
  exportButton: document.querySelector("#exportButton"),
  resetDemoButton: document.querySelector("#resetDemoButton"),
  photoJumpButton: document.querySelector("#photoJumpButton"),
  passwordScreen: document.querySelector("#passwordScreen"),
  loginForm: document.querySelector("#loginForm"),
  emailInput: document.querySelector("#emailInput"),
  passwordInput: document.querySelector("#passwordInput"),
  passwordError: document.querySelector("#passwordError"),
  emptyTemplate: document.querySelector("#emptyStateTemplate")
};

function loadLocalState() {
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

function saveLocalState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ theme: state.theme }));
}

function initSupabase() {
  if (!window.supabase?.createClient) {
    elements.passwordError.textContent = "Nao consegui carregar a conexao. Confira sua internet e recarregue.";
    return false;
  }

  supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
  return true;
}

function showLogin(message = "") {
  currentUser = null;
  document.body.classList.add("auth-locked");
  elements.passwordScreen.removeAttribute("hidden");
  elements.passwordError.textContent = message;
}

async function unlockSite(session) {
  currentUser = session.user;
  document.body.classList.remove("auth-locked");
  elements.passwordScreen.setAttribute("hidden", "");
  await loadRemoteData();
}

async function boot() {
  applyTheme();
  renderAll();
  bindEvents();

  if (!initSupabase()) return;

  const { data, error } = await supabaseClient.auth.getSession();
  if (error || !data.session) {
    showLogin();
    return;
  }

  await unlockSite(data.session);
}

async function loadRemoteData() {
  await Promise.all([loadSettings(), loadPhotos(), loadMemories(), loadPlaces()]);
  renderAll();
}

async function loadSettings() {
  const { data, error } = await supabaseClient
    .from("couple_settings")
    .select("person_one, person_two, start_date")
    .eq("id", "main")
    .maybeSingle();

  if (error) {
    showStatus("Nao consegui carregar os detalhes do casal. Rode o SQL de configuracao no Supabase.");
    return;
  }

  if (data) {
    state.settings = {
      personOne: data.person_one || defaultState.settings.personOne,
      personTwo: data.person_two || defaultState.settings.personTwo,
      startDate: data.start_date || defaultState.settings.startDate
    };
  }
}

async function loadPhotos() {
  const { data, error } = await supabaseClient
    .from("photos")
    .select("id, caption, photo_date, file_path, created_at")
    .order("photo_date", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false });

  if (error) {
    showStatus("Nao consegui carregar as fotos. Confira a tabela photos e as permissoes.");
    state.photos = [];
    return;
  }

  state.photos = await Promise.all((data || []).map(async (photo) => {
    const signedUrl = await getSignedPhotoUrl(photo.file_path);
    return {
      id: photo.id,
      caption: photo.caption,
      date: photo.photo_date,
      filePath: photo.file_path,
      image: signedUrl
    };
  }));
}

async function getSignedPhotoUrl(filePath) {
  const { data, error } = await supabaseClient
    .storage
    .from(BUCKET_NAME)
    .createSignedUrl(filePath, 60 * 60);

  if (error) return "";
  return data.signedUrl;
}

async function loadMemories() {
  const { data, error } = await supabaseClient
    .from("memories")
    .select("id, title, memory_date, place, category, note, created_at")
    .order("memory_date", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false });

  if (error) {
    showStatus("Nao consegui carregar os momentos. Confira a tabela memories e as permissoes.");
    state.memories = [];
    return;
  }

  state.memories = (data || []).map((memory) => ({
    id: memory.id,
    title: memory.title,
    date: memory.memory_date,
    place: memory.place,
    category: memory.category || "Data especial",
    note: memory.note
  }));
}

async function loadPlaces() {
  const { data, error } = await supabaseClient
    .from("places")
    .select("id, name, note, created_at")
    .order("created_at", { ascending: false });

  if (error) {
    showStatus("Nao consegui carregar os lugares. Rode o SQL atualizado no Supabase.");
    state.places = [];
    return;
  }

  state.places = (data || []).map((place) => ({
    id: place.id,
    name: place.name,
    note: place.note,
    direct: true
  }));
}

function showStatus(message) {
  elements.passwordError.textContent = message;
  console.warn(message);
}

function friendlyAuthError(error) {
  const message = error?.message || "";
  const lowerMessage = message.toLowerCase();

  if (lowerMessage.includes("email not confirmed")) {
    return "Esse email ainda nao foi confirmado no Supabase. Va em Authentication > Users e confirme o usuario, ou recrie marcando Auto Confirm.";
  }

  if (lowerMessage.includes("invalid login credentials")) {
    return "Email ou senha incorretos. Confira se voce criou o usuario em Authentication > Users e digitou a senha certa.";
  }

  if (lowerMessage.includes("invalid api key") || lowerMessage.includes("jwt")) {
    return "A chave do Supabase parece incorreta. Confira a Publishable key no arquivo script.js.";
  }

  if (lowerMessage.includes("failed to fetch") || lowerMessage.includes("network")) {
    return "Nao consegui conectar ao Supabase. Confira sua internet e se a Project URL esta certa.";
  }

  return `Erro do Supabase: ${message || "nao foi possivel entrar."}`;
}

function supabaseErrorText(error) {
  if (!error) return "sem detalhe";
  return [error.message, error.details, error.hint, error.code]
    .filter(Boolean)
    .join(" | ");
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
    article.appendChild(createDeleteButton("Excluir foto", () => deletePhoto(photo.id, photo.filePath)));
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
      <span class="memory-tag">${escapeHtml(memory.category || "Data especial")}</span>
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
  const placesFromMemories = state.memories
    .filter((memory) => memory.place)
    .reduce((acc, memory) => {
      const key = memory.place.trim().toLowerCase();
      if (!acc.has(key)) acc.set(key, { name: memory.place.trim(), count: 0, latest: memory.date });
      const place = acc.get(key);
      place.count += 1;
      if (new Date(memory.date) > new Date(place.latest)) place.latest = memory.date;
      return acc;
    }, new Map());

  const directPlaces = state.places.map((place) => {
    const matchingMemoryPlace = placesFromMemories.get(place.name.trim().toLowerCase());
    return {
      ...place,
      count: matchingMemoryPlace?.count || 0
    };
  });

  const directPlaceKeys = new Set(directPlaces.map((place) => place.name.trim().toLowerCase()));
  const memoryOnlyPlaces = [...placesFromMemories.values()]
    .filter((place) => !directPlaceKeys.has(place.name.trim().toLowerCase()));

  const placeList = [...directPlaces, ...memoryOnlyPlaces]
    .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));

  if (!placeList.length) {
    elements.placesGrid.appendChild(emptyState("L", "Adicione um lugar especial ou preencha o campo Lugar em um momento."));
    return;
  }

  placeList.forEach((place, index) => {
    const article = document.createElement("article");
    article.className = "place-card";
    article.innerHTML = `
      <div class="place-index">${index + 1}</div>
      <h3>${escapeHtml(place.name)}</h3>
      <p>${escapeHtml(place.note || placeSummary(place.count))}</p>
      <div class="memory-actions">
        <a class="map-link" href="${mapsUrl(place.name)}" target="_blank" rel="noreferrer">Ver no mapa</a>
      </div>
    `;
    if (place.direct) {
      article.appendChild(createDeleteButton("Excluir lugar", () => deletePlace(place.id)));
    }
    elements.placesGrid.appendChild(article);
  });
}

function placeSummary(count) {
  if (count > 0) return `${count} ${count === 1 ? "momento guardado" : "momentos guardados"} neste lugar.`;
  return "Lugar especial guardado no mapa afetivo de voces.";
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

async function deletePhoto(id, filePath) {
  if (!confirm("Excluir esta foto?")) return;

  if (filePath) {
    await supabaseClient.storage.from(BUCKET_NAME).remove([filePath]);
  }

  const { error } = await supabaseClient.from("photos").delete().eq("id", id);
  if (error) {
    alert("Nao consegui excluir a foto.");
    return;
  }

  await loadPhotos();
  renderPhotos();
}

async function deleteMemory(id) {
  if (!confirm("Excluir este momento?")) return;

  const { error } = await supabaseClient.from("memories").delete().eq("id", id);
  if (error) {
    alert("Nao consegui excluir o momento.");
    return;
  }

  await loadMemories();
  renderMemories();
}

async function deletePlace(id) {
  if (!confirm("Excluir este lugar?")) return;

  const { error } = await supabaseClient.from("places").delete().eq("id", id);
  if (error) {
    alert("Nao consegui excluir o lugar.");
    return;
  }

  await loadPlaces();
  renderPlaces();
}

function escapeHtml(value) {
  const div = document.createElement("div");
  div.textContent = value || "";
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
  return new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.82));
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

function cleanFileName(name) {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9.]+/g, "-")
    .replace(/^-+|-+$/g, "");
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

function setButtonLoading(button, isLoading, loadingText, normalText) {
  button.disabled = isLoading;
  button.textContent = isLoading ? loadingText : normalText;
}

function bindEvents() {
  elements.loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const button = elements.loginForm.querySelector("button");
    setButtonLoading(button, true, "Entrando...", "Entrar");
    elements.passwordError.textContent = "";

    const { data, error } = await supabaseClient.auth.signInWithPassword({
      email: elements.emailInput.value.trim(),
      password: elements.passwordInput.value
    });

    setButtonLoading(button, false, "Entrando...", "Entrar");

    if (error || !data.session) {
      elements.passwordError.textContent = friendlyAuthError(error);
      console.warn("Supabase login error:", error);
      elements.passwordInput.select();
      return;
    }

    await unlockSite(data.session);
  });

  elements.settingsForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const nextSettings = {
      personOne: elements.personOne.value.trim() || "Eu",
      personTwo: elements.personTwo.value.trim() || "Meu amor",
      startDate: elements.startDate.value || defaultState.settings.startDate
    };

    const button = elements.settingsForm.querySelector("button");
    setButtonLoading(button, true, "Salvando...", "Salvar");

    const { error } = await supabaseClient.from("couple_settings").upsert({
      id: "main",
      person_one: nextSettings.personOne,
      person_two: nextSettings.personTwo,
      start_date: nextSettings.startDate,
      updated_by: currentUser.id
    });

    setButtonLoading(button, false, "Salvando...", "Salvar");

    if (error) {
      alert("Nao consegui salvar os detalhes do casal.");
      return;
    }

    state.settings = nextSettings;
    renderSettings();
    renderCounter();
  });

  elements.photoForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const file = elements.photoInput.files[0];
    if (!file || !currentUser) return;

    const button = elements.photoForm.querySelector("button");
    setButtonLoading(button, true, "Enviando...", "Adicionar foto");

    try {
      const imageBlob = await resizeImage(file);
      const fileName = `${Date.now()}-${cleanFileName(file.name).replace(/\.[^.]+$/, "")}.jpg`;
      const filePath = `${currentUser.id}/${fileName}`;
      const upload = await supabaseClient.storage.from(BUCKET_NAME).upload(filePath, imageBlob, {
        contentType: "image/jpeg",
        upsert: false
      });

      if (upload.error) throw upload.error;

      const insert = await supabaseClient.from("photos").insert({
        caption: elements.photoCaption.value.trim() || "Uma memoria bonita",
        photo_date: elements.photoDate.value || new Date().toISOString().slice(0, 10),
        file_path: filePath,
        created_by: currentUser.id
      });

      if (insert.error) throw insert.error;

      elements.photoForm.reset();
      await loadPhotos();
      renderPhotos();
      document.querySelector("#fotos").scrollIntoView({ behavior: "smooth" });
    } catch (error) {
      console.error(error);
      alert("Nao consegui enviar a foto. Confira o bucket e as permissoes no Supabase.");
    } finally {
      setButtonLoading(button, false, "Enviando...", "Adicionar foto");
    }
  });

  elements.memoryForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const button = elements.memoryForm.querySelector("button");
    setButtonLoading(button, true, "Guardando...", "Guardar momento");

    const { error } = await supabaseClient.from("memories").insert({
      title: elements.memoryTitle.value.trim(),
      memory_date: elements.memoryDate.value,
      place: elements.memoryPlace.value.trim(),
      category: elements.memoryCategory.value,
      note: elements.memoryNote.value.trim(),
      created_by: currentUser.id
    });

    setButtonLoading(button, false, "Guardando...", "Guardar momento");

    if (error) {
      alert("Nao consegui guardar o momento.");
      return;
    }

    elements.memoryForm.reset();
    await loadMemories();
    renderMemories();
    document.querySelector("#momentos").scrollIntoView({ behavior: "smooth" });
  });

  elements.placeForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const button = elements.placeForm.querySelector("button");
    const status = elements.placeStatus;
    status?.classList.remove("success");
    if (status) status.textContent = "Tentando adicionar...";

    if (!currentUser?.id) {
      const message = "Sua sessao expirou. Clique em Sair e entre de novo.";
      if (status) status.textContent = message;
      alert(message);
      return;
    }

    setButtonLoading(button, true, "Adicionando...", "Adicionar lugar");

    const placeName = elements.placeName.value.trim();
    const placeNote = elements.placeNote.value.trim();
    const { error } = await supabaseClient.from("places").insert({
      name: placeName,
      note: placeNote || null,
      created_by: currentUser.id
    });

    setButtonLoading(button, false, "Adicionando...", "Adicionar lugar");

    if (error) {
      console.error("Supabase place insert error:", error);
      const message = `Erro do Supabase: ${supabaseErrorText(error)}`;
      if (status) status.textContent = message;
      alert(message);
      return;
    }

    elements.placeForm.reset();
    await loadPlaces();
    renderPlaces();
    status?.classList.add("success");
    if (status) status.textContent = "Lugar adicionado.";
    alert("Lugar adicionado.");
    document.querySelector("#lugares").scrollIntoView({ behavior: "smooth" });
  });

  elements.themeToggle.addEventListener("click", () => {
    state.theme = state.theme === "dark" ? "light" : "dark";
    saveLocalState();
    applyTheme();
  });

  elements.logoutButton.addEventListener("click", async () => {
    await supabaseClient.auth.signOut();
    showLogin();
  });

  elements.exportButton.addEventListener("click", downloadJson);

  elements.resetDemoButton.addEventListener("click", async () => {
    if (!confirm("Restaurar os textos de exemplo? Isso muda os detalhes do casal, mas nao apaga fotos ou momentos.")) return;

    const { error } = await supabaseClient.from("couple_settings").upsert({
      id: "main",
      person_one: defaultState.settings.personOne,
      person_two: defaultState.settings.personTwo,
      start_date: defaultState.settings.startDate,
      updated_by: currentUser.id
    });

    if (!error) {
      state.settings = structuredClone(defaultState.settings);
      renderSettings();
      renderCounter();
    }
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

boot();
