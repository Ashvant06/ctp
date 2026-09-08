package handlers

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"

	"github.com/google/uuid"
)

func UploadLessonHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// 500MB max upload
	r.ParseMultipartForm(500 << 20)

	sectionID := r.FormValue("section_id")
	courseID := r.FormValue("course_id")
	title := r.FormValue("title")
	orderIndex := r.FormValue("order_index")

	if sectionID == "" || courseID == "" || title == "" {
		http.Error(w, "section_id, course_id and title are required", http.StatusBadRequest)
		return
	}

	file, _, err := r.FormFile("video")
	if err != nil {
		http.Error(w, "Video file is required", http.StatusBadRequest)
		return
	}
	defer file.Close()

	// Generate unique lesson ID
	lessonID := uuid.New().String()

	// Save raw video to disk
	rawPath := filepath.Join("storage", "raw", lessonID+".mp4")
	rawFile, err := os.Create(rawPath)
	if err != nil {
		http.Error(w, "Failed to save video", http.StatusInternalServerError)
		return
	}
	defer rawFile.Close()

	if _, err := io.Copy(rawFile, file); err != nil {
		http.Error(w, "Failed to write video", http.StatusInternalServerError)
		return
	}

	// Create lesson in Supabase with status "uploading"
	lesson := map[string]interface{}{
		"id":          lessonID,
		"section_id":  sectionID,
		"course_id":   courseID,
		"title":       title,
		"order_index": orderIndex,
		"status":      "uploading",
	}

	if err := createLesson(lesson); err != nil {
		http.Error(w, "Failed to create lesson in database", http.StatusInternalServerError)
		return
	}

	// Return immediately to client
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(map[string]string{
		"lesson_id": lessonID,
		"status":    "uploading",
		"message":   "Video received, conversion started",
	})

	// Start background conversion
	go convertToHLS(lessonID, rawPath)
}

func createLesson(lesson map[string]interface{}) error {
	supabaseURL := os.Getenv("SUPABASE_URL")
	serviceKey := os.Getenv("SUPABASE_SERVICE_ROLE_KEY")

	body, _ := json.Marshal(lesson)
	req, _ := http.NewRequest("POST", supabaseURL+"/rest/v1/lessons", bytes.NewBuffer(body))
	req.Header.Set("apikey", serviceKey)
	req.Header.Set("Authorization", "Bearer "+serviceKey)
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Prefer", "return=representation")

	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	return nil
}

func updateLessonStatus(lessonID, status, hlsURL string) error {
	supabaseURL := os.Getenv("SUPABASE_URL")
	serviceKey := os.Getenv("SUPABASE_SERVICE_ROLE_KEY")

	update := map[string]interface{}{
		"status": status,
	}
	if hlsURL != "" {
		update["hls_url"] = hlsURL
	}

	body, _ := json.Marshal(update)
	url := fmt.Sprintf("%s/rest/v1/lessons?id=eq.%s", supabaseURL, lessonID)
	req, _ := http.NewRequest("PATCH", url, bytes.NewBuffer(body))
	req.Header.Set("apikey", serviceKey)
	req.Header.Set("Authorization", "Bearer "+serviceKey)
	req.Header.Set("Content-Type", "application/json")

	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	return nil
}

func convertToHLS(lessonID, rawPath string) {
	log.Printf("Starting HLS conversion for lesson: %s", lessonID)

	// Update status to processing
	updateLessonStatus(lessonID, "processing", "")

	// Create HLS output directory
	hlsDir := filepath.Join("storage", "hls", lessonID)
	if err := os.MkdirAll(hlsDir, os.ModePerm); err != nil {
		log.Printf("Failed to create HLS dir: %v", err)
		updateLessonStatus(lessonID, "error", "")
		return
	}

	// ffmpeg command — converts to HLS with 2 quality levels
	cmd := exec.Command("ffmpeg",
		"-i", rawPath,
		"-filter_complex",
		"[v:0]split=2[v1][v2]",
		"-map", "[v1]", "-map", "a:0",
		"-map", "[v2]", "-map", "a:0",
		"-s:v:0", "1280x720",
		"-b:v:0", "2800k",
		"-s:v:1", "640x360",
		"-b:v:1", "800k",
		"-c:v", "libx264",
		"-c:a", "aac",
		"-ar", "48000",
		"-var_stream_map", "v:0,a:0 v:1,a:1",
		"-master_pl_name", "master.m3u8",
		"-f", "hls",
		"-hls_time", "6",
		"-hls_list_size", "0",
		"-hls_segment_filename", filepath.Join(hlsDir, "stream_%v_%03d.ts"),
		filepath.Join(hlsDir, "stream_%v.m3u8"),
	)

	output, err := cmd.CombinedOutput()
	if err != nil {
		log.Printf("ffmpeg error for lesson %s: %v\nOutput: %s", lessonID, err, string(output))
		updateLessonStatus(lessonID, "error", "")
		return
	}

	// HLS URL served by Go static file server
	hlsURL := fmt.Sprintf("http://localhost:8080/stream/%s/master.m3u8", lessonID)

	// Update status to ready
	if err := updateLessonStatus(lessonID, "ready", hlsURL); err != nil {
		log.Printf("Failed to update lesson status: %v", err)
		return
	}

	log.Printf("HLS conversion complete for lesson: %s", lessonID)

	// Clean up raw file
	os.Remove(rawPath)
}
