package middleware

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"strings"
)

type contextKey string

const UserClaimsKey contextKey = "userClaims"

type SupabaseUser struct {
	ID    string `json:"id"`
	Email string `json:"email"`
}

func verifyTokenWithSupabase(tokenString string) (*SupabaseUser, error) {
	supabaseURL := os.Getenv("SUPABASE_URL")
	supabaseKey := os.Getenv("SUPABASE_ANON_KEY")

	req, err := http.NewRequest("GET", supabaseURL+"/auth/v1/user", nil)
	if err != nil {
		return nil, err
	}

	req.Header.Set("apikey", supabaseKey)
	req.Header.Set("Authorization", "Bearer "+tokenString)

	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("invalid or expired token")
	}

	var user SupabaseUser
	if err := json.NewDecoder(resp.Body).Decode(&user); err != nil {
		return nil, err
	}

	if user.ID == "" {
		return nil, fmt.Errorf("invalid user")
	}

	return &user, nil
}

func Auth(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		authHeader := r.Header.Get("Authorization")
		if authHeader == "" || !strings.HasPrefix(authHeader, "Bearer ") {
			http.Error(w, "Missing or invalid Authorization header", http.StatusUnauthorized)
			return
		}

		tokenString := strings.TrimPrefix(authHeader, "Bearer ")

		user, err := verifyTokenWithSupabase(tokenString)
		if err != nil {
			http.Error(w, "Invalid or expired token", http.StatusUnauthorized)
			return
		}

		ctx := context.WithValue(r.Context(), UserClaimsKey, map[string]string{
			"sub":   user.ID,
			"email": user.Email,
		})
		next(w, r.WithContext(ctx))
	}
}

func AdminOnly(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		claims, ok := r.Context().Value(UserClaimsKey).(map[string]string)
		if !ok {
			http.Error(w, "Unauthorized", http.StatusUnauthorized)
			return
		}

		userID := claims["sub"]
		if userID == "" {
			http.Error(w, "Unauthorized", http.StatusUnauthorized)
			return
		}

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
