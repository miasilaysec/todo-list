package handlers

import (
	"encoding/json"
	"net/http"
	"os"
	"strings"
	"time"

	"todo-backend/config"
	"todo-backend/models"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"
)

type authRequest struct {
	Username string `json:"username"`
	Password string `json:"password"`
}

type authResponse struct {
	Token string `json:"token"`
}

func Register(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		MethodNotAllowed(w)
		return
	}

	var req authRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "Geçersiz JSON"})
		return
	}

	req.Username = strings.TrimSpace(req.Username)
	if req.Username == "" || len(req.Password) < 6 {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "Kullanıcı adı ve en az 6 karakterli şifre gerekli"})
		return
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "Şifre işlenemedi"})
		return
	}

	user := models.User{
		ID:           uuid.New(),
		Username:     req.Username,
		PasswordHash: string(hash),
		CreatedAt:    time.Now().UTC(),
	}

	if err := config.DB.Create(&user).Error; err != nil {
		writeJSON(w, http.StatusConflict, map[string]string{"error": "Bu kullanıcı adı zaten kullanılıyor"})
		return
	}

	token, err := generateToken(user.ID)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "Token oluşturulamadı"})
		return
	}

	writeJSON(w, http.StatusCreated, authResponse{Token: token})
}

func Login(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		MethodNotAllowed(w)
		return
	}

	var req authRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "Geçersiz JSON"})
		return
	}

	var user models.User
	if err := config.DB.Where("username = ?", strings.TrimSpace(req.Username)).First(&user).Error; err != nil {
		writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "Kullanıcı adı veya şifre hatalı"})
		return
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(req.Password)); err != nil {
		writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "Kullanıcı adı veya şifre hatalı"})
		return
	}

	token, err := generateToken(user.ID)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "Token oluşturulamadı"})
		return
	}

	writeJSON(w, http.StatusOK, authResponse{Token: token})
}

func generateToken(userID uuid.UUID) (string, error) {
	secret := os.Getenv("JWT_SECRET")
	if secret == "" {
		secret = "dev-secret-change-in-production"
	}

	claims := jwt.MapClaims{
		"user_id": userID.String(),
		"exp":     time.Now().Add(24 * time.Hour).Unix(),
		"iat":     time.Now().Unix(),
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(secret))
}
