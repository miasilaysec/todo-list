package routes

import (
	"net/http"
	"strings"

	"todo-backend/handlers"
	"todo-backend/middleware"
)

func corsMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")

		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}

		next.ServeHTTP(w, r)
	})
}

func Register() http.Handler {
	mux := http.NewServeMux()

	mux.HandleFunc("/api/v1/auth/register", handlers.Register)
	mux.HandleFunc("/api/v1/auth/login", handlers.Login)

	todoHandler := middleware.JWTAuth(http.HandlerFunc(routeTodos))
	mux.Handle("/api/v1/todos", todoHandler)
	mux.Handle("/api/v1/todos/", todoHandler)

	return corsMiddleware(mux)
}

func routeTodos(w http.ResponseWriter, r *http.Request) {
	path := r.URL.Path

	if path == "/api/v1/todos" {
		switch r.Method {
		case http.MethodGet:
			handlers.ListTodos(w, r)
		case http.MethodPost:
			handlers.CreateTodo(w, r)
		default:
			handlers.MethodNotAllowed(w)
		}
		return
	}

	if strings.HasPrefix(path, "/api/v1/todos/") {
		switch r.Method {
		case http.MethodGet, http.MethodPut, http.MethodDelete:
			handlers.TodoByID(w, r)
		default:
			handlers.MethodNotAllowed(w)
		}
		return
	}

	http.NotFound(w, r)
}
