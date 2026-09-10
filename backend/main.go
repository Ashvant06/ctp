package main

import (
	"fmt"
	"log"
	"net/http"
	"os"

	"backend/handlers"
	"backend/middleware"

	"github.com/joho/godotenv"
)

func corsMiddleware(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "http://localhost:5173")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}
		next(w, r)
	}
}

func main() {
	if err := godotenv.Load(); err != nil {
		log.Println("Note: .env file not found")
	}

	os.MkdirAll("storage/raw", os.ModePerm)
	os.MkdirAll("storage/hls", os.ModePerm)

	// Public
	http.HandleFunc("/", corsMiddleware(func(w http.ResponseWriter, r *http.Request) {
		fmt.Fprintln(w, "LMS API running")
	}))

	// HLS static files (legacy local storage)
	fs := http.FileServer(http.Dir("storage/hls"))
	http.Handle("/stream/", corsMiddleware(func(w http.ResponseWriter, r *http.Request) {
		http.StripPrefix("/stream/", fs).ServeHTTP(w, r)
	}))

	// Admin routes — courses + sections
	http.HandleFunc("/admin/courses", corsMiddleware(middleware.Auth(middleware.AdminOnly(handlers.CoursesHandler))))
	http.HandleFunc("/admin/sections", corsMiddleware(middleware.Auth(middleware.AdminOnly(handlers.SectionsHandler))))

	// Admin routes — video upload (new Supabase Storage flow)
	http.HandleFunc("/admin/videos/upload-url", corsMiddleware(middleware.Auth(middleware.AdminOnly(handlers.CreateVideoUploadURLHandler))))
	http.HandleFunc("/admin/videos/confirm", corsMiddleware(middleware.Auth(middleware.AdminOnly(handlers.ConfirmVideoUploadHandler))))

	// Protected lesson play URL
	http.HandleFunc("/lessons/play", corsMiddleware(middleware.Auth(handlers.GetVideoPlayURLHandler)))

	// Public course routes
	http.HandleFunc("/courses", corsMiddleware(handlers.GetCoursesHandler))
	http.HandleFunc("/courses/", corsMiddleware(handlers.GetCourseHandler))

	fmt.Println("Server running on http://localhost:8080")
	if err := http.ListenAndServe(":8080", nil); err != nil {
		log.Fatalf("Server failed: %v", err)
	}
}
