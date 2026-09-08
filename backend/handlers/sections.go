package handlers

import (
	"bytes"
	"encoding/json"
	"net/http"
	"os"
)

type Section struct {
	CourseID   string `json:"course_id"`
	Title      string `json:"title"`
	OrderIndex int    `json:"order_index"`
}

func SectionsHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var section Section
	if err := json.NewDecoder(r.Body).Decode(&section); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	if section.CourseID == "" || section.Title == "" {
		http.Error(w, "course_id and title are required", http.StatusBadRequest)
		return
	}

	supabaseURL := os.Getenv("SUPABASE_URL")
	serviceKey := os.Getenv("SUPABASE_SERVICE_ROLE_KEY")

	body, _ := json.Marshal(map[string]interface{}{
		"course_id":   section.CourseID,
		"title":       section.Title,
		"order_index": section.OrderIndex,
	})

	req, _ := http.NewRequest("POST", supabaseURL+"/rest/v1/sections", bytes.NewBuffer(body))
	req.Header.Set("apikey", serviceKey)
	req.Header.Set("Authorization", "Bearer "+serviceKey)
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Prefer", "return=representation")

	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		http.Error(w, "Failed to create section", http.StatusInternalServerError)
		return
	}
	defer resp.Body.Close()

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	var result interface{}
	json.NewDecoder(resp.Body).Decode(&result)
	json.NewEncoder(w).Encode(result)
}
