package services

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
	"os"
	"strings"
)

const defaultVideoBucket = "CTP-Courses"

func videoBucket() string {
	if bucket := strings.TrimSpace(os.Getenv("SUPABASE_VIDEO_BUCKET")); bucket != "" {
		return bucket
	}
	return defaultVideoBucket
}

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
	if path == "" {
		return nil, fmt.Errorf("storage path is empty")
	}

	endpoint := fmt.Sprintf(
		"%s/storage/v1/object/upload/sign/%s/%s",
		supabaseURL,
		videoBucket(),
		path,
	)
	body, err := json.Marshal(map[string]interface{}{"expiresIn": 7200})
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
	if supabaseURL == "" {
		return "", fmt.Errorf("SUPABASE_URL is not set")
	}
	if serviceRoleKey == "" {
		return "", fmt.Errorf("SUPABASE_SERVICE_ROLE_KEY is not set")
	}
	if path == "" {
		return "", fmt.Errorf("storage path is empty")
	}

	endpoint := fmt.Sprintf(
		"%s/storage/v1/object/sign/%s/%s",
		supabaseURL,
		videoBucket(),
		path,
	)
	body, err := json.Marshal(map[string]interface{}{"expiresIn": expiresIn})
	if err != nil {
		return "", fmt.Errorf("failed to marshal request: %w", err)
	}

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
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return "", fmt.Errorf("Supabase Storage returned status %d", resp.StatusCode)
	}

	var result SignedDownloadResponse
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return "", err
	}
	if result.SignedURL == "" {
		return "", fmt.Errorf("Supabase Storage returned an empty signed URL")
	}

	parsedURL, err := url.Parse(result.SignedURL)
	if err != nil {
		return "", fmt.Errorf("failed to parse signed URL: %w", err)
	}
	if !parsedURL.IsAbs() {
		baseURL, err := url.Parse(strings.TrimRight(supabaseURL, "/"))
		if err != nil {
			return "", fmt.Errorf("failed to parse Supabase URL: %w", err)
		}
		result.SignedURL = baseURL.ResolveReference(parsedURL).String()
	}

	return result.SignedURL, nil
}
