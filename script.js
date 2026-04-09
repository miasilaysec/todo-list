const todoForm = document.getElementById("todo-form");
const todoInput = document.getElementById("todo-input");
const statusInput = document.getElementById("status-input");
const searchInput = document.getElementById("search-input");
const todoList = document.getElementById("todo-list");
const emptyMessage = document.getElementById("empty-message");
const statusFilters = document.querySelectorAll(".status-filter");

let todos = JSON.parse(localStorage.getItem("todos")) || [];
let editingTodoId = null;
let currentFilter = "all";
const validStatuses = ["yapilacak", "devam", "tamamlandi"];
const statusLabels = {
  yapilacak: "Yapılacak",
  devam: "Devam Ediyor",
  tamamlandi: "Tamamlandı",
};

todos = todos.map((todo) => ({
  ...todo,
  status: validStatuses.includes(todo.status) ? todo.status : "yapilacak",
}));

function saveTodos() {
  localStorage.setItem("todos", JSON.stringify(todos));
}

function createTodoElement(todo) {
  const li = document.createElement("li");
  li.className = "todo-item";
  li.dataset.id = todo.id;
  const isEditing = editingTodoId === todo.id;
  let editInput = null;

  if (isEditing) {
    li.classList.add("editing");
    editInput = document.createElement("input");
    editInput.type = "text";
    editInput.className = "todo-edit-input";
    editInput.value = todo.text;
    editInput.maxLength = 120;
    editInput.autocomplete = "off";
    editInput.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        saveEditedTodo(todo.id, editInput.value);
      }
      if (event.key === "Escape") {
        cancelEdit();
      }
    });
    li.appendChild(editInput);
  } else {
    const contentBox = document.createElement("div");
    contentBox.className = "todo-content";

    const span = document.createElement("span");
    span.className = "todo-text";
    span.textContent = todo.text;

    const statusBadge = document.createElement("button");
    statusBadge.type = "button";
    statusBadge.className = `todo-status status-${todo.status}`;
    statusBadge.textContent = statusLabels[todo.status];
    statusBadge.title = "Durum degistir";
    statusBadge.addEventListener("click", () => cycleTodoStatus(todo.id));

    contentBox.append(span, statusBadge);
    li.appendChild(contentBox);
  }

  const actionBox = document.createElement("div");
  actionBox.className = "actions";

  const editButton = document.createElement("button");
  editButton.className = "edit-btn";
  editButton.textContent = isEditing ? "Kaydet" : "Düzenle";
  editButton.addEventListener("click", () => {
    if (isEditing) {
      saveEditedTodo(todo.id, editInput.value);
      return;
    }
    editingTodoId = todo.id;
    renderTodos(searchInput.value);
  });

  const deleteButton = document.createElement("button");
  deleteButton.className = "delete-btn";
  if (isEditing) {
    deleteButton.classList.add("cancel-btn");
    deleteButton.textContent = "İptal";
    deleteButton.addEventListener("click", cancelEdit);
  } else {
    deleteButton.textContent = "Sil";
    deleteButton.addEventListener("click", () => deleteTodo(todo.id));
  }

  actionBox.append(editButton, deleteButton);
  li.appendChild(actionBox);

  return li;
}

function renderTodos(filterText = "") {
  todoList.innerHTML = "";

  const normalized = filterText.trim().toLowerCase();
  const filteredTodos = todos.filter((todo) => {
    const matchesText = todo.text.toLowerCase().includes(normalized);
    const matchesStatus =
      currentFilter === "all" ? true : todo.status === currentFilter;
    return matchesText && matchesStatus;
  });

  if (editingTodoId && !filteredTodos.some((todo) => todo.id === editingTodoId)) {
    editingTodoId = null;
  }

  filteredTodos.forEach((todo) => {
    const todoElement = createTodoElement(todo);
    todoList.appendChild(todoElement);
  });

  const activeEditInput = todoList.querySelector(".todo-edit-input");
  if (activeEditInput) {
    activeEditInput.focus();
    activeEditInput.select();
  }

  emptyMessage.style.display = filteredTodos.length === 0 ? "block" : "none";
  emptyMessage.textContent =
    currentFilter === "all"
      ? "Henüz görev eklenmedi. Yukarıdan ilk görevini ekleyebilirsin."
      : "Bu bölümde henüz görev yok.";

  updateActiveFilter();
}

function addTodo(text) {
  const trimmed = text.trim();

  if (!trimmed) {
    alert("Lutfen bos birakma.");
    return;
  }

  const newTodo = {
    id: Date.now().toString(),
    text: trimmed,
    status: statusInput.value,
  };

  todos.push(newTodo);
  saveTodos();
  renderTodos(searchInput.value);
}

function cycleTodoStatus(id) {
  const selected = todos.find((todo) => todo.id === id);
  if (!selected) return;

  const currentIndex = validStatuses.indexOf(selected.status);
  const nextIndex = (currentIndex + 1) % validStatuses.length;
  selected.status = validStatuses[nextIndex];
  saveTodos();
  renderTodos(searchInput.value);
}

function deleteTodo(id) {
  todos = todos.filter((todo) => todo.id !== id);
  if (editingTodoId === id) {
    editingTodoId = null;
  }
  saveTodos();
  renderTodos(searchInput.value);
}

function saveEditedTodo(id, text) {
  const trimmed = text.trim();
  if (!trimmed) {
    alert("Lütfen boş bırakma.");
    return;
  }

  const selected = todos.find((todo) => todo.id === id);
  if (!selected) return;

  selected.text = trimmed;
  editingTodoId = null;
  saveTodos();
  renderTodos(searchInput.value);
}

function cancelEdit() {
  editingTodoId = null;
  renderTodos(searchInput.value);
}

function updateActiveFilter() {
  statusFilters.forEach((button) => {
    const isActive = button.dataset.filter === currentFilter;
    button.classList.toggle("active", isActive);
  });
}

todoForm.addEventListener("submit", (event) => {
  event.preventDefault();
  addTodo(todoInput.value);
  todoInput.value = "";
  statusInput.value = "yapilacak";
  todoInput.focus();
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

renderTodos();
