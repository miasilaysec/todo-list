package main

import (
	"log"
	"net/http"
	"os"

	"todo-backend/config"
	"todo-backend/routes"
)

func main() {
	config.Connect()

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	handler := routes.Register()
	log.Printf("Backend servisi :%s üzerinde dinleniyor", port)
	if err := http.ListenAndServe(":"+port, handler); err != nil {
		log.Fatalf("Sunucu başlatılamadı: %v", err)
	}
}
