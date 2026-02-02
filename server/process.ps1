# process.ps1 (English Version)
# Usage: .\process.ps1 "C:\path\to\file.mp3"

param(
    [Parameter(Mandatory=$true)]
    [string]$FilePath
)

# Configuration
$ServerUrl = "http://localhost:3001/api/sound"
# Force UTF-8 Output
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

if (-not (Test-Path $FilePath)) {
    Write-Host "Error: File not found -> $FilePath" -ForegroundColor Red
    exit
}

Write-Host "`n[ Audio Processing Start ] : $(Split-Path $FilePath -Leaf)" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Gray

# 1. Upload & Analyze
Write-Host "1. Uploading & Analyzing..." -NoNewline
try {
    $uploadRes = curl.exe -s -X POST "$ServerUrl/upload" -F "file=@$FilePath"
    $json = $uploadRes | ConvertFrom-Json
    
    if (-not $json.success) { throw "Upload Failed" }
    
    Write-Host " [Done]" -ForegroundColor Green
    Write-Host "   - Track ID : $($json.trackId)" -ForegroundColor Gray
    Write-Host "   - BPM      : $($json.analysis.bpm)" -ForegroundColor Yellow
    Write-Host "   - Key      : $($json.analysis.key)" -ForegroundColor Yellow
}
catch {
    Write-Host "`nError during upload: $_" -ForegroundColor Red
    exit
}

# 2. Request Stem Separation
Write-Host "`n2. Requesting Stem Separation..." -NoNewline
try {
    $splitBody = @{ trackId = $json.trackId } | ConvertTo-Json
    $splitRes = Invoke-RestMethod -Uri "$ServerUrl/split" -Method Post -ContentType "application/json" -Body $splitBody
    
    if (-not $splitRes.success) { throw "Split Request Failed" }
    
    Write-Host " [Started]" -ForegroundColor Green
    Write-Host "   - Job ID   : $($splitRes.jobId)" -ForegroundColor Gray
}
catch {
    Write-Host "`nError during split request: $_" -ForegroundColor Red
    exit
}

# 3. Polling (Waiting)
Write-Host "`n3. Processing (Please wait)..." -ForegroundColor Cyan
$jobId = $splitRes.jobId
$spinChars = @("-", "\", "|", "/")
$i = 0

while ($true) {
    try {
        $statusRes = Invoke-RestMethod -Uri "$ServerUrl/status/$jobId" -Method Get
        
        if ($statusRes.status -eq "completed") {
            Write-Host "`r[SUCCESS] Separation Complete!                  " -ForegroundColor Green
            Write-Host "   - Result Path: $($statusRes.result.path)" -ForegroundColor White
            break
        }
        elseif ($statusRes.status -eq "failed") {
            Write-Host "`n[FAILED] Process failed: $($statusRes.error)" -ForegroundColor Red
            break
        }
        
        Write-Host "`rProcessing... $($spinChars[$i % 4])  " -NoNewline -ForegroundColor Yellow
        $i++
        Start-Sleep -Seconds 2
    }
    catch {
        Write-Host "`nConnection error (Retrying...)" -ForegroundColor DarkGray
        Start-Sleep -Seconds 2
    }
}

Write-Host "`nDone!" -ForegroundColor Cyan