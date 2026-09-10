package services

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
)

type SignedUploadResponse struct {
	SignedURL string `json:"signedURL"`
	Token     string `json:"token"`
	Path      string `json:"path"`
}

type SignedDownloadResponse struct {
	SignedURL string `json:"signedURL"`
}

func CreateSignedUploadURL(path string) (*SignedUploadResponse, error) {
	supabaseURL := os.Getenv("SUPABASE_URL")
	serviceRoleKey := os.Getenv("SUPABASE_SERVICE_ROLE_KEY")

	if supabaseURL == "" {
		return nil, fmt.Errorf("SUPABASE_URL is not set")
	}
	if serviceRoleKey == "" {
		return nil, fmt.Errorf("SUPABASE_SERVICE_ROLE_KEY is not set")
	}

	endpoint := fmt.Sprintf(
		"%s/storage/v1/object/upload/sign/course-videos/%s",
		supabaseURL,
		path,
	)

	body, err := json.Marshal(map[string]interface{}{
		"expiresIn": 7200, // 2 hours
	})
	if err != nil {
		return nil, fmt.Errorf("failed to marshal request: %w", err)
	}

	req, err := http.NewRequest(http.MethodPost, endpoint, bytes.NewBuffer(body))
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	req.Header.Set("Authorization", "Bearer "+serviceRoleKey)
	req.Header.Set("apikey", serviceRoleKey)
	req.Header.Set("Content-Type", "application/json")

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("failed to contact Supabase Storage: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return nil, fmt.Errorf("Supabase Storage returned status %d", resp.StatusCode)
	}

	var result SignedUploadResponse
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, fmt.Errorf("failed to decode response: %w", err)
	}

	result.Path = path
	return &result, nil
}

func CreateSignedDownloadURL(path string, expiresIn int) (string, error) {
	supabaseURL := os.Getenv("SUPABASE_URL")
	serviceRoleKey := os.Getenv("SUPABASE_SERVICE_ROLE_KEY")

	endpoint := fmt.Sprintf(
		"%s/storage/v1/object/sign/course-videos/%s",
		supabaseURL,
		path,
	)

	body, _ := json.Marshal(map[string]interface{}{
		"expiresIn": expiresIn,
	})

	req, err := http.NewRequest(http.MethodPost, endpoint, bytes.NewBuffer(body))
	if err != nil {
		return "", err
	}

	req.Header.Set("Authorization", "Bearer "+serviceRoleKey)
	req.Header.Set("apikey", serviceRoleKey)
	req.Header.Set("Content-Type", "application/json")

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	var result SignedDownloadResponse
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return "", err
	}

	return result.SignedURL, nil
}
