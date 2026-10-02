package handlers

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"os"

	"backend/middleware"

	"github.com/google/uuid"
)

type watchTimeRequest struct {
	LessonID string `json:"lesson_id"`
	Seconds  int    `json:"seconds"`
}

func RecordWatchTimeHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}
	claims, ok := r.Context().Value(middleware.UserClaimsKey).(map[string]string)
	if !ok || claims["sub"] == "" {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	var input watchTimeRequest
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}
	if _, err := uuid.Parse(input.LessonID); err != nil {
		http.Error(w, "Invalid lesson_id", http.StatusBadRequest)
		return
	}
	if input.Seconds < 1 || input.Seconds > 30 {
		http.Error(w, "seconds must be between 1 and 30", http.StatusBadRequest)
		return
	}

	body, err := json.Marshal(map[string]interface{}{
		"p_user_id":   claims["sub"],
		"p_lesson_id": input.LessonID,
		"p_seconds":   input.Seconds,
	})
	if err != nil {
		http.Error(w, "Failed to encode watch time", http.StatusInternalServerError)
		return
	}

	supabaseURL := os.Getenv("SUPABASE_URL")
	serviceKey := os.Getenv("SUPABASE_SERVICE_ROLE_KEY")
	req, err := http.NewRequest(http.MethodPost, supabaseURL+"/rest/v1/rpc/add_video_watch_seconds", bytes.NewReader(body))
	if err != nil {
		http.Error(w, "Failed to build watch-time request", http.StatusInternalServerError)
		return
	}
	req.Header.Set("apikey", serviceKey)
	req.Header.Set("Authorization", "Bearer "+serviceKey)
	req.Header.Set("Content-Type", "application/json")

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		http.Error(w, "Failed to record watch time", http.StatusBadGateway)
		return
	}
	defer resp.Body.Close()
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		http.Error(w, fmt.Sprintf("Failed to record watch time (database returned %d)", resp.StatusCode), http.StatusBadGateway)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}
