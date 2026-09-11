package handlers

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"strings"

	"backend/services"

	"github.com/google/uuid"
)

type CreateUploadURLRequest struct {
	CourseID   string `json:"course_id"`
	LessonID   string `json:"lesson_id"`
	Title      string `json:"title"`
	SectionID  string `json:"section_id"`
	OrderIndex int    `json:"order_index"`
}

type CreateUploadURLResponse struct {
	SignedURL string `json:"signed_url"`
	Token     string `json:"token"`
	Path      string `json:"path"`
	LessonID  string `json:"lesson_id"`
}

func CreateVideoUploadURLHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req CreateUploadURLRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	if req.CourseID == "" || req.Title == "" || req.SectionID == "" {
		http.Error(w, "course_id, section_id and title are required", http.StatusBadRequest)
		return
	}

	// Generate lesson ID if not provided
	lessonID := req.LessonID
	if lessonID == "" {
		lessonID = uuid.New().String()
	}

	// Build storage path
	path := fmt.Sprintf(
		"courses/%s/lessons/%s/video.mp4",
		req.CourseID,
		lessonID,
	)

	// Create signed upload URL
	result, err := services.CreateSignedUploadURL(path)
	if err != nil {
		http.Error(w, fmt.Sprintf("Failed to create upload URL: %v", err), http.StatusInternalServerError)
		return
	}

	// Create lesson record in Supabase with status "pending"
	if err := createLessonRecord(lessonID, req); err != nil {
		http.Error(w, "Failed to create lesson record", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(CreateUploadURLResponse{
		SignedURL: result.SignedURL,
		Token:     result.Token,
		Path:      path,
		LessonID:  lessonID,
	})
}

func createLessonRecord(lessonID string, req CreateUploadURLRequest) error {
	supabaseURL := os.Getenv("SUPABASE_URL")
	serviceKey := os.Getenv("SUPABASE_SERVICE_ROLE_KEY")

	lesson := map[string]interface{}{
		"id":             lessonID,
		"course_id":      req.CourseID,
		"section_id":     req.SectionID,
		"title":          req.Title,
		"order_index":    req.OrderIndex,
		"status":         "pending",
		"video_provider": "supabase",
	}

	body, _ := json.Marshal(lesson)
	httpReq, _ := http.NewRequest("POST", supabaseURL+"/rest/v1/lessons", bytes.NewBuffer(body))
	httpReq.Header.Set("apikey", serviceKey)
	httpReq.Header.Set("Authorization", "Bearer "+serviceKey)
	httpReq.Header.Set("Content-Type", "application/json")
	httpReq.Header.Set("Prefer", "return=representation")

	resp, err := http.DefaultClient.Do(httpReq)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return fmt.Errorf("Supabase lessons insert returned status %d", resp.StatusCode)
	}
	return nil
}

// ConfirmVideoUpload — called after React successfully uploads to Supabase Storage
type ConfirmUploadRequest struct {
	LessonID  string `json:"lesson_id"`
	VideoPath string `json:"video_path"`
}

func ConfirmVideoUploadHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req ConfirmUploadRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	if req.LessonID == "" || req.VideoPath == "" {
		http.Error(w, "lesson_id and video_path are required", http.StatusBadRequest)
		return
	}
	if !strings.HasSuffix(req.VideoPath, "/lessons/"+req.LessonID+"/video.mp4") || strings.Contains(req.VideoPath, "..") {
		http.Error(w, "video_path does not match the lesson", http.StatusBadRequest)
		return
	}
	objectExists, err := services.VideoObjectExists(req.VideoPath)
	if err != nil {
		http.Error(w, fmt.Sprintf("Failed to verify uploaded video: %v", err), http.StatusBadGateway)
		return
	}
	if !objectExists {
		http.Error(w, "Uploaded video was not found in storage", http.StatusBadRequest)
		return
	}

	supabaseURL := os.Getenv("SUPABASE_URL")
	serviceKey := os.Getenv("SUPABASE_SERVICE_ROLE_KEY")

	update := map[string]interface{}{
		"video_path": req.VideoPath,
		"status":     "ready",
	}

	body, _ := json.Marshal(update)
	url := fmt.Sprintf("%s/rest/v1/lessons?id=eq.%s", supabaseURL, req.LessonID)
	httpReq, _ := http.NewRequest("PATCH", url, bytes.NewBuffer(body))
	httpReq.Header.Set("apikey", serviceKey)
	httpReq.Header.Set("Authorization", "Bearer "+serviceKey)
	httpReq.Header.Set("Content-Type", "application/json")

	resp, err := http.DefaultClient.Do(httpReq)
	if err != nil {
		http.Error(w, "Failed to update lesson", http.StatusInternalServerError)
		return
	}
	defer resp.Body.Close()
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		http.Error(w, "Failed to update lesson", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{
		"lesson_id": req.LessonID,
		"status":    "ready",
	})
}

// GetVideoPlayURL — generates signed download URL for playback
func GetVideoPlayURLHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	lessonID := r.URL.Query().Get("lesson_id")
	if lessonID == "" {
		http.Error(w, "lesson_id is required", http.StatusBadRequest)
		return
	}

	// Fetch video_path from Supabase
	supabaseURL := os.Getenv("SUPABASE_URL")
	serviceKey := os.Getenv("SUPABASE_SERVICE_ROLE_KEY")

	url := fmt.Sprintf("%s/rest/v1/lessons?id=eq.%s&select=video_path,status", supabaseURL, lessonID)
	req, _ := http.NewRequest("GET", url, nil)
	req.Header.Set("apikey", serviceKey)
	req.Header.Set("Authorization", "Bearer "+serviceKey)

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		http.Error(w, "Failed to fetch lesson", http.StatusInternalServerError)
		return
	}
	defer resp.Body.Close()

	var lessons []struct {
		VideoPath string `json:"video_path"`
		Status    string `json:"status"`
	}
	json.NewDecoder(resp.Body).Decode(&lessons)

	if len(lessons) == 0 || lessons[0].VideoPath == "" {
		http.Error(w, "Lesson not found or video not ready", http.StatusNotFound)
		return
	}
	if lessons[0].Status != "ready" {
		http.Error(w, "Video is not ready", http.StatusConflict)
		return
	}

	// Generate signed URL valid for 1 hour
	signedURL, err := services.CreateSignedDownloadURL(lessons[0].VideoPath, 3600)
	if err != nil {
		http.Error(w, "Failed to generate play URL", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{
		"url": signedURL,
	})
}
