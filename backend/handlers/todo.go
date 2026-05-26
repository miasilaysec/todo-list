package handlers

import (
	"encoding/json"
	"net/http"
	"strings"
	"time"

	"todo-backend/config"
	"todo-backend/middleware"
	"todo-backend/models"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type todoRequest struct {
	Title     string `json:"title"`
	Completed *bool  `json:"completed"`
}

func ListTodos(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.UserIDFromContext(r.Context())
	if !ok {
		writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "Yetkilendirme gerekli"})
		return
	}

	var todos []models.Todo
	if err := config.DB.Where("user_id = ?", userID).Order("created_at desc").Find(&todos).Error; err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "Görevler listelenemedi"})
		return
	}

	if todos == nil {
		todos = []models.Todo{}
	}
	writeJSON(w, http.StatusOK, todos)
}

func CreateTodo(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.UserIDFromContext(r.Context())
	if !ok {
		writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "Yetkilendirme gerekli"})
		return
	}

	var req todoRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "Geçersiz JSON"})
		return
	}

	title := strings.TrimSpace(req.Title)
	if title == "" {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "Başlık boş olamaz"})
		return
	}

	completed := false
	if req.Completed != nil {
		completed = *req.Completed
	}

	todo := models.Todo{
		ID:        uuid.New(),
		Title:     title,
		Completed: completed,
		CreatedAt: time.Now().UTC(),
		UserID:    userID,
	}

	if err := config.DB.Create(&todo).Error; err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "Görev oluşturulamadı"})
		return
	}

	writeJSON(w, http.StatusCreated, todo)
}

func TodoByID(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.UserIDFromContext(r.Context())
	if !ok {
		writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "Yetkilendirme gerekli"})
		return
	}

	idStr := strings.TrimPrefix(r.URL.Path, "/api/v1/todos/")
	id, err := uuid.Parse(idStr)
	if err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "Geçersiz görev kimliği"})
		return
	}

	var todo models.Todo
	if err := config.DB.Where("id = ? AND user_id = ?", id, userID).First(&todo).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			writeJSON(w, http.StatusNotFound, map[string]string{"error": "Görev bulunamadı"})
			return
		}
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "Görev getirilemedi"})
		return
	}

	switch r.Method {
	case http.MethodGet:
		writeJSON(w, http.StatusOK, todo)
	case http.MethodPut:
		updateTodo(w, r, &todo)
	case http.MethodDelete:
		deleteTodo(w, &todo)
	default:
		MethodNotAllowed(w)
	}
}

func updateTodo(w http.ResponseWriter, r *http.Request, todo *models.Todo) {
	var req todoRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "Geçersiz JSON"})
		return
	}

	if req.Title != "" {
		title := strings.TrimSpace(req.Title)
		if title == "" {
			writeJSON(w, http.StatusBadRequest, map[string]string{"error": "Başlık boş olamaz"})
			return
		}
		todo.Title = title
	}
	if req.Completed != nil {
		todo.Completed = *req.Completed
	}

	if err := config.DB.Save(todo).Error; err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "Görev güncellenemedi"})
		return
	}

	writeJSON(w, http.StatusOK, todo)
}

func deleteTodo(w http.ResponseWriter, todo *models.Todo) {
	if err := config.DB.Delete(todo).Error; err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "Görev silinemedi"})
		return
	}
	w.WriteHeader(http.StatusNoContent)
}
