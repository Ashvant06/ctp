# Test script: Admin Course Upload Flow
# This script:
# 1. Signs into Supabase to get a JWT
# 2. Creates a course via the admin endpoint
# 3. Verifies the course was created

$SUPABASE_URL = "https://ojzyfnrdkyjqzoshuatq.supabase.co"
$SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9qenlmbnJka3lqcXpvc2h1YXRxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODYzNjc5OTIsImV4cCI6MjEwMTk0Mzk5Mn0.91v09bdThc4-uU1b6fAq2M62xlUjTPv-8ALyOWLykp8"
$BACKEND_URL = "http://localhost:8080"

Write-Host "`n=== LMS Admin Test Flow ===" -ForegroundColor Cyan

# Step 1: Sign in to get a JWT token
Write-Host "`n[Step 1] Signing into Supabase..." -ForegroundColor Yellow

$email = Read-Host "Enter admin email"
$password = Read-Host "Enter admin password"

$signInBody = @{
    email    = $email
    password = $password
} | ConvertTo-Json

try {
    $signInResponse = Invoke-RestMethod `
        -Uri "$SUPABASE_URL/auth/v1/token?grant_type=password" `
        -Method POST `
        -ContentType "application/json" `
        -Headers @{ "apikey" = $SUPABASE_ANON_KEY } `
        -Body $signInBody

    $TOKEN = $signInResponse.access_token
    $USER_ID = $signInResponse.user.id

    Write-Host "  Signed in as: $($signInResponse.user.email)" -ForegroundColor Green
    Write-Host "  User ID: $USER_ID" -ForegroundColor Green
    Write-Host "  Token: $($TOKEN.Substring(0,30))..." -ForegroundColor Green
}
catch {
    Write-Host "  Sign-in FAILED: $_" -ForegroundColor Red
    Write-Host "  Make sure the user exists and credentials are correct." -ForegroundColor Red
    exit 1
}

# Step 2: Test debug/verify endpoint
Write-Host "`n[Step 2] Testing debug/verify endpoint..." -ForegroundColor Yellow
try {
    $debugResp = Invoke-WebRequest `
        -Uri "$BACKEND_URL/debug/verify" `
        -Method GET `
        -Headers @{ "Authorization" = "Bearer $TOKEN" }
    Write-Host "  Debug verify response:" -ForegroundColor Green
    Write-Host $debugResp.Content
}
catch {
    Write-Host "  Debug verify FAILED: $($_.Exception.Message)" -ForegroundColor Red
}

# Step 3: Create a course (admin endpoint)
Write-Host "`n[Step 3] Creating a course (POST /admin/courses)..." -ForegroundColor Yellow
$courseBody = @{
    title       = "Test Course - $(Get-Date -Format 'HH:mm:ss')"
    description = "A test course created by the admin flow test script"
} | ConvertTo-Json

try {
    $courseResp = Invoke-RestMethod `
        -Uri "$BACKEND_URL/admin/courses" `
        -Method POST `
        -ContentType "application/json" `
        -Headers @{ "Authorization" = "Bearer $TOKEN" } `
        -Body $courseBody

    Write-Host "  Course created successfully!" -ForegroundColor Green
    Write-Host "  Response:" -ForegroundColor Green
    $courseResp | ConvertTo-Json -Depth 5 | Write-Host
}
catch {
    $statusCode = $_.Exception.Response.StatusCode.value__
    $errorBody = ""
    try {
        $stream = $_.Exception.Response.GetResponseStream()
        $reader = New-Object System.IO.StreamReader($stream)
        $errorBody = $reader.ReadToEnd()
    } catch {}
    Write-Host "  Create course FAILED (HTTP $statusCode): $errorBody" -ForegroundColor Red
}

# Step 4: Verify - list all courses
Write-Host "`n[Step 4] Listing all courses (GET /courses)..." -ForegroundColor Yellow
try {
    $listResp = Invoke-RestMethod `
        -Uri "$BACKEND_URL/courses" `
        -Method GET

    Write-Host "  Found $($listResp.Count) course(s):" -ForegroundColor Green
    foreach ($c in $listResp) {
        Write-Host "    - [$($c.id)] $($c.title)" -ForegroundColor White
    }
}
catch {
    Write-Host "  List courses FAILED: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n=== Test Complete ===" -ForegroundColor Cyan
