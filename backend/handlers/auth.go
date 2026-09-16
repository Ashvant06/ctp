package handlers

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"os"

	"backend/middleware"
)

type SyncProfileRequest struct {
	FullName  string `json:"full_name"`
	AvatarURL string `json:"avatar_url"`
}

func SyncProfileHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	claims, ok := r.Context().Value(middleware.UserClaimsKey).(map[string]string)
	if !ok {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	userID := claims["sub"]
	email := claims["email"]

	if userID == "" {
		http.Error(w, "Invalid token", http.StatusUnauthorized)
		return
	}

	var req SyncProfileRequest
	json.NewDecoder(r.Body).Decode(&req)

	supabaseURL := os.Getenv("SUPABASE_URL")
	serviceKey := os.Getenv("SUPABASE_SERVICE_ROLE_KEY")

	// Check if profile exists
	checkURL := fmt.Sprintf("%s/rest/v1/profiles?id=eq.%s&select=id,role", supabaseURL, userID)
	checkReq, _ := http.NewRequest("GET", checkURL, nil)
	checkReq.Header.Set("apikey", serviceKey)
	checkReq.Header.Set("Authorization", "Bearer "+serviceKey)

	checkResp, err := http.DefaultClient.Do(checkReq)
	if err != nil {
		http.Error(w, "Failed to check profile", http.StatusInternalServerError)
		return
	}
	defer checkResp.Body.Close()

	var profiles []struct {
		ID   string `json:"id"`
		Role string `json:"role"`
	}
	json.NewDecoder(checkResp.Body).Decode(&profiles)

	if len(profiles) == 0 {
		// Profile doesn't exist — create it
		profile := map[string]interface{}{
			"id":         userID,
			"full_name":  req.FullName,
			"avatar_url": req.AvatarURL,
			"role":       "user",
		}

		body, _ := json.Marshal(profile)
		insertReq, _ := http.NewRequest("POST", supabaseURL+"/rest/v1/profiles", bytes.NewBuffer(body))
		insertReq.Header.Set("apikey", serviceKey)
		insertReq.Header.Set("Authorization", "Bearer "+serviceKey)
		insertReq.Header.Set("Content-Type", "application/json")
		insertReq.Header.Set("Prefer", "return=representation")

		insertResp, err := http.DefaultClient.Do(insertReq)
		if err != nil {
			http.Error(w, "Failed to create profile", http.StatusInternalServerError)
			return
		}
		defer insertResp.Body.Close()

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]string{
			"status": "created",
			"role":   "user",
			"email":  email,
		})
		return
	}

	// Profile exists — return role
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{
		"status": "exists",
		"role":   profiles[0].Role,
		"email":  email,
	})
}