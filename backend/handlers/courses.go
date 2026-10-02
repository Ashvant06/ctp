package handlers

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"strconv"
	"strings"
)

type Course struct {
	Title       string `json:"title"`
	Description string `json:"description"`
}

func CoursesHandler(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodPost:
		createCourse(w, r)
	case http.MethodGet:
		GetAdminCoursesHandler(w, r)
	default:
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
	}
}

type DashboardCourse struct {
	ID        string `json:"id"`
	Title     string `json:"title"`
	CreatedAt string `json:"created_at"`
}

type AdminDashboardStats struct {
	CourseCount   int               `json:"course_count"`
	LessonCount   int               `json:"lesson_count"`
	UserCount     int               `json:"user_count"`
	RecentCourses []DashboardCourse `json:"recent_courses"`
}

func AdminDashboardHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	courseCount, err := getTableCount("courses")
	if err != nil {
		log.Printf("Failed to count courses: %v", err)
		http.Error(w, "Failed to load dashboard statistics", http.StatusBadGateway)
		return
	}
	lessonCount, err := getTableCount("lessons")
	if err != nil {
		log.Printf("Failed to count lessons: %v", err)
		http.Error(w, "Failed to load dashboard statistics", http.StatusBadGateway)
		return
	}
	userCount, err := getTableCount("profiles")
	if err != nil {
		log.Printf("Failed to count users: %v", err)
		http.Error(w, "Failed to load dashboard statistics", http.StatusBadGateway)
		return
	}

	recentCourses, err := getRecentCourses()
	if err != nil {
		log.Printf("Failed to load recent courses: %v", err)
		http.Error(w, "Failed to load dashboard statistics", http.StatusBadGateway)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(AdminDashboardStats{
		CourseCount:   courseCount,
		LessonCount:   lessonCount,
		UserCount:     userCount,
		RecentCourses: recentCourses,
	}); err != nil {
		log.Printf("Failed to encode dashboard statistics: %v", err)
	}
}

func getTableCount(table string) (int, error) {
	supabaseURL := os.Getenv("SUPABASE_URL")
	serviceKey := os.Getenv("SUPABASE_SERVICE_ROLE_KEY")
	url := fmt.Sprintf("%s/rest/v1/%s?select=id", supabaseURL, table)

	req, err := http.NewRequest(http.MethodHead, url, nil)
	if err != nil {
		return 0, err
	}
	req.Header.Set("apikey", serviceKey)
	req.Header.Set("Authorization", "Bearer "+serviceKey)
	req.Header.Set("Prefer", "count=exact")

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return 0, err
	}
	defer resp.Body.Close()

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return 0, fmt.Errorf("Supabase count request for %s returned status %d", table, resp.StatusCode)
	}
	contentRange := resp.Header.Get("Content-Range")
	separator := strings.LastIndex(contentRange, "/")
	if separator < 0 {
		return 0, fmt.Errorf("Supabase count response for %s has no total", table)
	}
	count, err := strconv.Atoi(contentRange[separator+1:])
	if err != nil {
		return 0, fmt.Errorf("invalid Supabase count for %s: %w", table, err)
	}
	return count, nil
}

func getRecentCourses() ([]DashboardCourse, error) {
	supabaseURL := os.Getenv("SUPABASE_URL")
	serviceKey := os.Getenv("SUPABASE_SERVICE_ROLE_KEY")
	url := supabaseURL + "/rest/v1/courses?select=id,title,created_at&order=created_at.desc&limit=5"

	req, err := http.NewRequest(http.MethodGet, url, nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("apikey", serviceKey)
	req.Header.Set("Authorization", "Bearer "+serviceKey)

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return nil, fmt.Errorf("Supabase recent courses request returned status %d", resp.StatusCode)
	}
	var courses []DashboardCourse
	if err := json.NewDecoder(resp.Body).Decode(&courses); err != nil {
		return nil, err
	}
	return courses, nil
}

func GetAdminCoursesHandler(w http.ResponseWriter, r *http.Request) {
	supabaseURL := os.Getenv("SUPABASE_URL")
	serviceKey := os.Getenv("SUPABASE_SERVICE_ROLE_KEY")
	url := supabaseURL + "/rest/v1/courses?select=*,sections(*,lessons(*)),lessons(*)&order=created_at.desc"

	req, err := http.NewRequest(http.MethodGet, url, nil)
	if err != nil {
		http.Error(w, "Failed to build courses request", http.StatusInternalServerError)
		return
	}
	req.Header.Set("apikey", serviceKey)
	req.Header.Set("Authorization", "Bearer "+serviceKey)

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		http.Error(w, "Failed to fetch courses", http.StatusBadGateway)
		return
	}
	defer resp.Body.Close()

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		http.Error(w, "Failed to fetch courses", http.StatusBadGateway)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	if _, err := io.Copy(w, resp.Body); err != nil {
		log.Printf("Failed to proxy admin courses: %v", err)
	}
}

func createCourse(w http.ResponseWriter, r *http.Request) {
	var course Course
	if err := json.NewDecoder(r.Body).Decode(&course); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	if course.Title == "" {
		http.Error(w, "Title is required", http.StatusBadRequest)
		return
	}

	supabaseURL := os.Getenv("SUPABASE_URL")
	serviceKey := os.Getenv("SUPABASE_SERVICE_ROLE_KEY")

	body, _ := json.Marshal(map[string]string{
		"title":       course.Title,
		"description": course.Description,
	})

	req, _ := http.NewRequest("POST", supabaseURL+"/rest/v1/courses", bytes.NewBuffer(body))
	req.Header.Set("apikey", serviceKey)
	req.Header.Set("Authorization", "Bearer "+serviceKey)
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Prefer", "return=representation")

	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		http.Error(w, "Failed to create course", http.StatusInternalServerError)
		return
	}
	defer resp.Body.Close()

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	var result interface{}
	json.NewDecoder(resp.Body).Decode(&result)
	json.NewEncoder(w).Encode(result)
}

func GetCoursesHandler(w http.ResponseWriter, r *http.Request) {
	supabaseURL := os.Getenv("SUPABASE_URL")
	serviceKey := os.Getenv("SUPABASE_SERVICE_ROLE_KEY")

	req, _ := http.NewRequest("GET", supabaseURL+"/rest/v1/courses?select=*", nil)
	req.Header.Set("apikey", serviceKey)
	req.Header.Set("Authorization", "Bearer "+serviceKey)

	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		http.Error(w, "Failed to fetch courses", http.StatusInternalServerError)
		return
	}
	defer resp.Body.Close()

	w.Header().Set("Content-Type", "application/json")
	var result interface{}
	json.NewDecoder(resp.Body).Decode(&result)
	json.NewEncoder(w).Encode(result)
}

func GetCourseHandler(w http.ResponseWriter, r *http.Request) {
	id := strings.TrimPrefix(r.URL.Path, "/courses/")
	if id == "" {
		http.Error(w, "Course ID required", http.StatusBadRequest)
		return
	}

	supabaseURL := os.Getenv("SUPABASE_URL")
	serviceKey := os.Getenv("SUPABASE_SERVICE_ROLE_KEY")

	url := fmt.Sprintf(
		"%s/rest/v1/courses?id=eq.%s&select=*,sections(*,lessons(*))",
		supabaseURL, id,
	)

	req, _ := http.NewRequest("GET", url, nil)
	req.Header.Set("apikey", serviceKey)
	req.Header.Set("Authorization", "Bearer "+serviceKey)

	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		http.Error(w, "Failed to fetch course", http.StatusInternalServerError)
		return
	}
	defer resp.Body.Close()

	w.Header().Set("Content-Type", "application/json")
	var result interface{}
	json.NewDecoder(resp.Body).Decode(&result)
	json.NewEncoder(w).Encode(result)
}
