package main

import (
	"fmt"
	"log"
	"net/http"
	"os"
	"strings"

	"backend/handlers"
	"backend/middleware"

	"github.com/golang-jwt/jwt/v5"
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

	// Debug token received
	http.HandleFunc("/debug/token", corsMiddleware(func(w http.ResponseWriter, r *http.Request) {
		authHeader := r.Header.Get("Authorization")
		fmt.Fprintf(w, "Auth header received: %s\n", authHeader)
	}))

	// Debug verify token
	http.HandleFunc("/debug/verify", corsMiddleware(func(w http.ResponseWriter, r *http.Request) {
		secret := os.Getenv("SUPABASE_JWT_SECRET")
		authHeader := r.Header.Get("Authorization")
		tokenString := strings.TrimPrefix(authHeader, "Bearer ")

		fmt.Fprintf(w, "Secret length: %d\n", len(secret))
		fmt.Fprintf(w, "Token length: %d\n", len(tokenString))

		// Parse without verification first
		parser := jwt.NewParser()
		token, _, err := parser.ParseUnverified(tokenString, jwt.MapClaims{})
		if err != nil {
			fmt.Fprintf(w, "Parse error: %v\n", err)
			return
		}

		claims := token.Claims.(jwt.MapClaims)
		fmt.Fprintf(w, "Algorithm: %s\n", token.Method.Alg())
		fmt.Fprintf(w, "User ID: %v\n", claims["sub"])
		fmt.Fprintf(w, "Role: %v\n", claims["role"])
		fmt.Fprintf(w, "Issuer: %v\n", claims["iss"])
	}))

	// HLS static files
	fs := http.FileServer(http.Dir("storage/hls"))
	http.Handle("/stream/", corsMiddleware(func(w http.ResponseWriter, r *http.Request) {
		http.StripPrefix("/stream/", fs).ServeHTTP(w, r)
	}))

	// Admin routes
	http.HandleFunc("/admin/courses", corsMiddleware(middleware.Auth(middleware.AdminOnly(handlers.CoursesHandler))))
	http.HandleFunc("/admin/sections", corsMiddleware(middleware.Auth(middleware.AdminOnly(handlers.SectionsHandler))))
	http.HandleFunc("/admin/lessons/upload", corsMiddleware(middleware.Auth(middleware.AdminOnly(handlers.UploadLessonHandler))))

	// Public course routes
	http.HandleFunc("/courses", corsMiddleware(handlers.GetCoursesHandler))
	http.HandleFunc("/courses/", corsMiddleware(handlers.GetCourseHandler))

	fmt.Println("Server running on http://localhost:8080")
	if err := http.ListenAndServe(":8080", nil); err != nil {
		log.Fatalf("Server failed: %v", err)
	}
}
