package middleware

import (
	"context"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"strings"

	"github.com/golang-jwt/jwt/v5"
)

type contextKey string

const UserClaimsKey contextKey = "userClaims"

func verifyToken(tokenString string) (*jwt.Token, error) {
	secret := os.Getenv("SUPABASE_JWT_SECRET")

	// Supabase JWT secrets are base64-encoded; decode before use
	decodedSecret, err := base64.StdEncoding.DecodeString(secret)
	if err != nil {
		// Fall back to raw secret if not valid base64
		log.Printf("JWT secret is not valid base64, using raw bytes: %v", err)
		decodedSecret = []byte(secret)
	}

	return jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
		}
		return decodedSecret, nil
	})
}

func Auth(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		authHeader := r.Header.Get("Authorization")
		if authHeader == "" || !strings.HasPrefix(authHeader, "Bearer ") {
			log.Printf("Auth: Missing or invalid Authorization header")
			http.Error(w, "Missing or invalid Authorization header", http.StatusUnauthorized)
			return
		}

		tokenString := strings.TrimPrefix(authHeader, "Bearer ")
		token, err := verifyToken(tokenString)
		if err != nil || !token.Valid {
			log.Printf("Auth: Token verification failed: %v", err)
			http.Error(w, "Invalid or expired token", http.StatusUnauthorized)
			return
		}

		claims, ok := token.Claims.(jwt.MapClaims)
		if !ok {
			http.Error(w, "Invalid token claims", http.StatusUnauthorized)
			return
		}

		log.Printf("Auth: Verified user %v", claims["sub"])
		ctx := context.WithValue(r.Context(), UserClaimsKey, claims)
		next(w, r.WithContext(ctx))
	}
}

func AdminOnly(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		claims, ok := r.Context().Value(UserClaimsKey).(jwt.MapClaims)
		if !ok {
			http.Error(w, "Unauthorized", http.StatusUnauthorized)
			return
		}

		// Get user ID from JWT
		userID, ok := claims["sub"].(string)
		if !ok || userID == "" {
			http.Error(w, "Invalid token: missing user ID", http.StatusUnauthorized)
			return
		}

		// Check role from Supabase profiles table
		role, err := getRoleFromSupabase(userID)
		if err != nil {
			http.Error(w, "Failed to verify role", http.StatusInternalServerError)
			return
		}

		if role != "admin" {
			http.Error(w, "Forbidden: admin only", http.StatusForbidden)
			return
		}

		next(w, r)
	}
}

func getRoleFromSupabase(userID string) (string, error) {
	supabaseURL := os.Getenv("SUPABASE_URL")
	serviceKey := os.Getenv("SUPABASE_SERVICE_ROLE_KEY")

	url := supabaseURL + "/rest/v1/profiles?id=eq." + userID + "&select=role"

	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return "", err
	}

	req.Header.Set("apikey", serviceKey)
	req.Header.Set("Authorization", "Bearer "+serviceKey)

	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	var profiles []struct {
		Role string `json:"role"`
	}

	if err := json.NewDecoder(resp.Body).Decode(&profiles); err != nil {
		return "", err
	}

	if len(profiles) == 0 {
		return "", fmt.Errorf("profile not found")
	}

	return profiles[0].Role, nil
}
