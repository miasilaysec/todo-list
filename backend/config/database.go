package config

import (
	"fmt"
	"log"
	"os"
	"time"

	"todo-backend/models"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

var DB *gorm.DB

func Connect() {
	host := getEnv("DB_HOST", "localhost")
	port := getEnv("DB_PORT", "5432")
	user := getEnv("DB_USER", "todo")
	password := getEnv("DB_PASSWORD", "todo")
	dbname := getEnv("DB_NAME", "tododb")

	dsn := fmt.Sprintf(
		"host=%s user=%s password=%s dbname=%s port=%s sslmode=disable TimeZone=UTC",
		host, user, password, dbname, port,
	)

	var err error
	for attempt := 1; attempt <= 30; attempt++ {
		DB, err = gorm.Open(postgres.Open(dsn), &gorm.Config{
			Logger: logger.Default.LogMode(logger.Warn),
		})
		if err == nil {
			break
		}
		log.Printf("Veritabanına bağlanılamadı (deneme %d/30): %v", attempt, err)
		time.Sleep(2 * time.Second)
	}
	if err != nil {
		log.Fatalf("Veritabanı bağlantısı kurulamadı: %v", err)
	}

	if err := DB.AutoMigrate(&models.User{}, &models.Todo{}); err != nil {
		log.Fatalf("Migrasyon hatası: %v", err)
	}
	log.Println("PostgreSQL bağlantısı ve migrasyon tamamlandı")
}

func getEnv(key, fallback string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return fallback
}
