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
		origin := r.Header.Get("Origin")

		allowedOrigins := []string{
			"http://localhost:5173",
			"https://ctp-client.onrender.com", // replace with your actual frontend URL
		}

		for _, allowed := range allowedOrigins {
			if origin == allowed {
				w.Header().Set("Access-Control-Allow-Origin", origin)
				break
			}
		}

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

	http.HandleFunc("/", corsMiddleware(func(w http.ResponseWriter, r *http.Request) {
		fmt.Fprintln(w, "LMS API running")
	}))

	fs := http.FileServer(http.Dir("storage/hls"))
	http.Handle("/stream/", corsMiddleware(func(w http.ResponseWriter, r *http.Request) {
		http.StripPrefix("/stream/", fs).ServeHTTP(w, r)
	}))

	http.HandleFunc("/admin/courses", corsMiddleware(middleware.Auth(middleware.AdminOnly(handlers.CoursesHandler))))
	http.HandleFunc("/admin/sections", corsMiddleware(middleware.Auth(middleware.AdminOnly(handlers.SectionsHandler))))
	http.HandleFunc("/admin/videos/upload-url", corsMiddleware(middleware.Auth(middleware.AdminOnly(handlers.CreateVideoUploadURLHandler))))
	http.HandleFunc("/admin/videos/confirm", corsMiddleware(middleware.Auth(middleware.AdminOnly(handlers.ConfirmVideoUploadHandler))))
	http.HandleFunc("/lessons/play", corsMiddleware(middleware.Auth(handlers.GetVideoPlayURLHandler)))

	http.HandleFunc("/courses", corsMiddleware(handlers.GetCoursesHandler))
	http.HandleFunc("/courses/", corsMiddleware(handlers.GetCourseHandler))

	fmt.Println("Server running on http://localhost:8080")
	if err := http.ListenAndServe(":8080", nil); err != nil {
		log.Fatalf("Server failed: %v", err)
	}
}
