const API_BASE = "/api/v1";

const authSection = document.getElementById("auth-section");
const appSection = document.getElementById("app-section");
const authForm = document.getElementById("auth-form");
const usernameInput = document.getElementById("username-input");
const passwordInput = document.getElementById("password-input");
const registerBtn = document.getElementById("register-btn");
const logoutBtn = document.getElementById("logout-btn");
const authError = document.getElementById("auth-error");
const appError = document.getElementById("app-error");

const todoForm = document.getElementById("todo-form");
const todoInput = document.getElementById("todo-input");
const completedInput = document.getElementById("completed-input");
const searchInput = document.getElementById("search-input");
const todoList = document.getElementById("todo-list");
const emptyMessage = document.getElementById("empty-message");
const statusFilters = document.querySelectorAll(".status-filter");
const statTotal = document.getElementById("stat-total");
const statActive = document.getElementById("stat-active");
const statDone = document.getElementById("stat-done");
const progressRingFill = document.getElementById("progress-ring-fill");
const progressPercent = document.getElementById("progress-percent");
const progressBar = document.getElementById("progress-bar");
const progressSub = document.getElementById("progress-sub");

const RING_CIRCUMFERENCE = 213.628;
let statAnimFrame = null;

let todos = [];
let editingTodoId = null;
let currentFilter = "all";

function getToken() {
  return sessionStorage.getItem("jwt_token");
}

function setToken(token) {
  sessionStorage.setItem("jwt_token", token);
}

function clearToken() {
  sessionStorage.removeItem("jwt_token");
}

function showAuthError(message) {
  authError.textContent = message;
  authError.hidden = !message;
}

function showAppError(message) {
  appError.textContent = message;
  appError.hidden = !message;
}

function showAuthView() {
  authSection.hidden = false;
  appSection.hidden = true;
  todos = [];
  editingTodoId = null;
  todoList.innerHTML = "";
  if (statTotal) {
    statTotal.textContent = "0";
    statActive.textContent = "0";
    statDone.textContent = "0";
    updateProgress();
  }
}

function showAppView() {
  authSection.hidden = true;
  appSection.hidden = false;
  showAuthError("");
}

async function apiRequest(path, options = {}) {
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };

  const token = getToken();
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  if (response.status === 204) {
    return null;
  }

  let data = null;
  const text = await response.text();
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = { error: text };
    }
  }

  if (!response.ok) {
    const message = data?.error || `İstek başarısız (${response.status})`;
    throw new Error(message);
  }

  return data;
}

async function login(username, password) {
  const data = await apiRequest("/auth/login", {
    method: "POST",
    body: JSON.stringify({ username, password }),
  });
  setToken(data.token);
}

async function register(username, password) {
  const data = await apiRequest("/auth/register", {
    method: "POST",
    body: JSON.stringify({ username, password }),
  });
  setToken(data.token);
}

async function fetchTodos() {
  todos = await apiRequest("/todos");
  renderTodos(searchInput.value);
}

async function createTodo(title, completed) {
  await apiRequest("/todos", {
    method: "POST",
    body: JSON.stringify({ title, completed }),
  });
  await fetchTodos();
}

async function updateTodo(id, payload) {
  await apiRequest(`/todos/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
  await fetchTodos();
}

async function deleteTodo(id) {
  await apiRequest(`/todos/${id}`, { method: "DELETE" });
  await fetchTodos();
}

function formatDate(isoString) {
  const date = new Date(isoString);
  return date.toLocaleString("tr-TR", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function animateStat(el, target) {
  const start = Number(el.textContent) || 0;
  if (start === target) return;
  const duration = 400;
  const startTime = performance.now();

  function tick(now) {
    const progress = Math.min((now - startTime) / duration, 1);
    const eased = 1 - (1 - progress) ** 3;
    el.textContent = Math.round(start + (target - start) * eased);
    if (progress < 1) {
      statAnimFrame = requestAnimationFrame(tick);
    }
  }

  if (statAnimFrame) cancelAnimationFrame(statAnimFrame);
  requestAnimationFrame(tick);
}

function updateProgress() {
  const total = todos.length;
  const done = todos.filter((t) => t.completed).length;
  const percent = total === 0 ? 0 : Math.round((done / total) * 100);
  const offset = RING_CIRCUMFERENCE - (percent / 100) * RING_CIRCUMFERENCE;

  progressRingFill.style.strokeDashoffset = String(offset);
  progressPercent.textContent = `${percent}%`;
  progressBar.style.width = `${percent}%`;

  progressRingFill.classList.toggle("complete", percent === 100 && total > 0);

  if (total === 0) {
    progressSub.textContent = "Henüz görev yok";
  } else if (percent === 100) {
    progressSub.textContent = "Tebrikler! Tüm görevler tamamlandı.";
  } else {
    progressSub.textContent = `${done} / ${total} görev tamamlandı`;
  }
}

function updateStats() {
  const total = todos.length;
  const done = todos.filter((t) => t.completed).length;
  const active = total - done;
  animateStat(statTotal, total);
  animateStat(statActive, active);
  animateStat(statDone, done);
  updateProgress();
}

function createTodoElement(todo, index = 0) {
  const li = document.createElement("li");
  li.className = `todo-item${todo.completed ? " completed" : ""}`;
  li.dataset.id = todo.id;
  li.style.animationDelay = `${Math.min(index * 0.06, 0.35)}s`;
  const isEditing = editingTodoId === todo.id;

  if (isEditing) {
    li.classList.add("editing");
    const editInput = document.createElement("input");
    editInput.type = "text";
    editInput.className = "todo-edit-input";
    editInput.value = todo.title;
    editInput.maxLength = 255;
    editInput.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        saveEditedTodo(todo.id, editInput.value);
      }
      if (event.key === "Escape") {
        cancelEdit();
      }
    });
    li.appendChild(editInput);
    setTimeout(() => {
      editInput.focus();
      editInput.select();
    }, 0);
  } else {
    const contentBox = document.createElement("div");
    contentBox.className = "todo-content";

    const check = document.createElement("button");
    check.type = "button";
    check.className = "todo-check";
    check.setAttribute("aria-label", todo.completed ? "Tamamlanmadı işaretle" : "Tamamlandı işaretle");
    check.textContent = todo.completed ? "✓" : "";
    check.addEventListener("click", () =>
      updateTodo(todo.id, { completed: !todo.completed }).catch(handleAppError)
    );

    const body = document.createElement("div");
    body.className = "todo-body";

    const titleSpan = document.createElement("span");
    titleSpan.className = "todo-text";
    titleSpan.textContent = todo.title;

    const meta = document.createElement("div");
    meta.className = "todo-meta";

    const pill = document.createElement("span");
    pill.className = `todo-pill ${todo.completed ? "todo-pill-done" : "todo-pill-active"}`;
    pill.textContent = todo.completed ? "Tamamlandı" : "Devam ediyor";

    const date = document.createElement("span");
    date.className = "todo-date";
    date.textContent = formatDate(todo.created_at);

    meta.append(pill, date);
    body.append(titleSpan, meta);
    contentBox.append(check, body);
    li.appendChild(contentBox);
  }

  const actionBox = document.createElement("div");
  actionBox.className = "actions";

  if (!isEditing) {
    const toggleButton = document.createElement("button");
    toggleButton.type = "button";
    toggleButton.className = "toggle-btn";
    toggleButton.textContent = todo.completed ? "Geri Al" : "Tamamla";
    toggleButton.addEventListener("click", () =>
      updateTodo(todo.id, { completed: !todo.completed }).catch(handleAppError)
    );
    actionBox.appendChild(toggleButton);
  }

  const editButton = document.createElement("button");
  editButton.type = "button";
  editButton.className = isEditing ? "edit-btn" : "edit-btn";
  editButton.textContent = isEditing ? "Kaydet" : "Düzenle";
  editButton.addEventListener("click", () => {
    if (isEditing) {
      const input = li.querySelector(".todo-edit-input");
      saveEditedTodo(todo.id, input.value);
      return;
    }
    editingTodoId = todo.id;
    renderTodos(searchInput.value);
  });

  const deleteButton = document.createElement("button");
  deleteButton.type = "button";
  deleteButton.className = isEditing ? "cancel-btn delete-btn" : "delete-btn";
  deleteButton.textContent = isEditing ? "İptal" : "Sil";
  deleteButton.addEventListener("click", () => {
    if (isEditing) {
      cancelEdit();
      return;
    }
    deleteTodo(todo.id).catch(handleAppError);
  });

  actionBox.append(editButton, deleteButton);
  li.appendChild(actionBox);

  return li;
}

function renderTodos(filterText = "") {
  todoList.innerHTML = "";
  const normalized = filterText.trim().toLowerCase();

  const filteredTodos = todos.filter((todo) => {
    const matchesText = todo.title.toLowerCase().includes(normalized);
    const matchesFilter =
      currentFilter === "all" ||
      (currentFilter === "completed" && todo.completed) ||
      (currentFilter === "active" && !todo.completed);
    return matchesText && matchesFilter;
  });

  if (editingTodoId && !filteredTodos.some((todo) => todo.id === editingTodoId)) {
    editingTodoId = null;
  }

  filteredTodos.forEach((todo, index) => {
    todoList.appendChild(createTodoElement(todo, index));
  });

  updateStats();

  const isEmpty = filteredTodos.length === 0;
  emptyMessage.hidden = !isEmpty;
  if (isEmpty) {
    const title = emptyMessage.querySelector(".empty-title");
    const desc = emptyMessage.querySelector(".empty-desc");
    if (todos.length === 0) {
      title.textContent = "Henüz görev yok";
      desc.textContent = "Yukarıdan ilk görevini ekleyerek başla.";
    } else {
      title.textContent = "Sonuç bulunamadı";
      desc.textContent = "Arama veya filtreyi değiştirmeyi dene.";
    }
  }

  statusFilters.forEach((button) => {
    button.classList.toggle("active", button.dataset.filter === currentFilter);
  });
}

async function saveEditedTodo(id, title) {
  const trimmed = title.trim();
  if (!trimmed) {
    showAppError("Başlık boş olamaz.");
    return;
  }
  editingTodoId = null;
  showAppError("");
  await updateTodo(id, { title: trimmed });
}

function cancelEdit() {
  editingTodoId = null;
  renderTodos(searchInput.value);
}

function handleAppError(error) {
  if (error.message.includes("Yetkilendirme") || error.message.includes("token")) {
    clearToken();
    showAuthView();
    showAuthError("Oturum süresi doldu. Lütfen tekrar giriş yap.");
    return;
  }
  showAppError(error.message);
}

authForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  showAuthError("");
  try {
    await login(usernameInput.value, passwordInput.value);
    showAppView();
    await fetchTodos();
  } catch (error) {
    showAuthError(error.message);
  }
});

registerBtn.addEventListener("click", async () => {
  showAuthError("");
  try {
    await register(usernameInput.value, passwordInput.value);
    showAppView();
    await fetchTodos();
  } catch (error) {
    showAuthError(error.message);
  }
});

logoutBtn.addEventListener("click", () => {
  clearToken();
  showAuthView();
  passwordInput.value = "";
});

todoForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  showAppError("");
  const title = todoInput.value.trim();
  if (!title) {
    showAppError("Başlık boş olamaz.");
    return;
  }
  try {
    await createTodo(title, completedInput.checked);
    todoInput.value = "";
    completedInput.checked = false;
    todoInput.focus();
  } catch (error) {
    handleAppError(error);
  }
});

searchInput.addEventListener("input", () => {
  renderTodos(searchInput.value);
});

statusFilters.forEach((button) => {
  button.addEventListener("click", () => {
    currentFilter = button.dataset.filter;
    renderTodos(searchInput.value);
  });
});

async function init() {
  if (getToken()) {
    try {
      showAppView();
      await fetchTodos();
    } catch {
      clearToken();
      showAuthView();
    }
  } else {
    showAuthView();
  }
}

init();
