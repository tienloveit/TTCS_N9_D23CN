### Cinema Test Data Seeder v3.0 (Full Demo Data)
$BASE = "http://localhost:8081/api"

function Invoke-Api {
    param($Method, $Uri, $Body, $Headers)
    try {
        $params = @{
            Method = $Method
            Uri = $Uri
            ContentType = "application/json; charset=utf-8"
        }
        if ($Body) {
            $jsonString = ($Body | ConvertTo-Json -Depth 5)
            $params.Body = [System.Text.Encoding]::UTF8.GetBytes($jsonString)
        }
        if ($Headers) { $params.Headers = $Headers }
        
        return Invoke-RestMethod @params
    } catch {
        $streamReader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $errBody = $streamReader.ReadToEnd()
        Write-Host "ERROR at $Uri`: $errBody" -ForegroundColor Red
        return $null
    }
}

# ==========================================
# 0. WAIT FOR BACKEND
# ==========================================
Write-Host "========== WAITING FOR BACKEND ==========" -ForegroundColor Yellow
$connected = $false
$maxRetries = 15
$retryCount = 0
while (!$connected -and $retryCount -lt $maxRetries) {
    try {
        $test = Invoke-WebRequest -Uri "http://localhost:8081/api/movie/now-showing" -Method GET -TimeoutSec 2 -UseBasicParsing
        $connected = $true
    } catch {
        $retryCount++
        Write-Host "Backend not ready, retrying ($retryCount/$maxRetries)..." -ForegroundColor Gray
        Start-Sleep -Seconds 3
    }
}

if (!$connected) {
    Write-Host "CRITICAL: Backend timed out. Please start it manually and try again." -ForegroundColor Red
    exit
}
Write-Host "Backend is ready!" -ForegroundColor Green

# ==========================================
# 1. CLEANUP DATABASE
# ==========================================
Write-Host "`n========== CLEANING DATABASE ==========" -ForegroundColor Yellow
try {
    Invoke-RestMethod -Method DELETE -Uri "$BASE/v1/cleanup/database"
    Write-Host "Database cleaned! Waiting 2s..." -ForegroundColor Green
    Start-Sleep -Seconds 2
} catch {
    Write-Host "CRITICAL ERROR: Cleanup failed. Is CleanupController compiled?" -ForegroundColor Red
    exit
}

# ==========================================
# 2. LOGIN ADMIN
# ==========================================
Write-Host "`n========== LOGIN ADMIN ==========" -ForegroundColor Cyan
$loginRes = Invoke-Api -Method POST -Uri "$BASE/auth/login" -Body @{ username = "admin"; password = "admin@123" }
if (!$loginRes) { Write-Host "Admin login failed! Exiting." -ForegroundColor Red; exit }
$TOKEN = $loginRes.result.accessToken
$headers = @{ Authorization = "Bearer $TOKEN" }
Write-Host "Admin logged in successfully!" -ForegroundColor Green

# ==========================================
# 3. CREATE GENRES
# ==========================================
Write-Host "`n========== CREATE GENRES ==========" -ForegroundColor Cyan
$genreNames = @("Hanh dong", "Tam ly", "Kinh di", "Hai huoc", "Lang man", "Hoat hinh")
$genreIds = @{}
foreach ($name in $genreNames) {
    $res = Invoke-Api -Method POST -Uri "$BASE/genre" -Body @{ name = $name } -Headers $headers
    if ($res) {
        $genreIds[$name] = $res.result.id
        Write-Host "  + Genre: $name (ID: $($res.result.id))" -ForegroundColor Gray
    }
}

# ==========================================
# 4. CREATE DIRECTORS
# ==========================================
Write-Host "`n========== CREATE DIRECTORS ==========" -ForegroundColor Cyan
$directorNames = @("Ly Hai", "Anthony Russo", "Tran Thanh", "Pete Docter", "Michael Chaves")
$directorIds = @{}
foreach ($name in $directorNames) {
    $res = Invoke-Api -Method POST -Uri "$BASE/director" -Body @{ name = $name } -Headers $headers
    if ($res) {
        $directorIds[$name] = $res.result.id
        Write-Host "  + Director: $name (ID: $($res.result.id))" -ForegroundColor Gray
    }
}

# ==========================================
# 5. CREATE BRANCHES
# ==========================================
Write-Host "`n========== CREATE BRANCHES ==========" -ForegroundColor Cyan
$branchData = @(
    @{ branchCode = "MPT-HN-01"; name = "MoviePTIT Vincom Ba Trieu"; address = "191 Ba Trieu, Hai Ba Trung"; city = "Ha Noi"; phone = "024-1234-5678"; status = "ACTIVE" },
    @{ branchCode = "MPT-HCM-01"; name = "MoviePTIT Landmark 81"; address = "772 Dien Bien Phu, Binh Thanh"; city = "Ho Chi Minh"; phone = "028-9876-5432"; status = "ACTIVE" }
)
$branchIds = @()
foreach ($b in $branchData) {
    $res = Invoke-Api -Method POST -Uri "$BASE/branch" -Body $b -Headers $headers
    if ($res) {
        $branchIds += $res.result.branchId
        Write-Host "  + Branch: $($b.name) (ID: $($res.result.branchId))" -ForegroundColor Gray
    }
}

if ($branchIds.Count -eq 0) { Write-Host "No branches created! Exiting." -ForegroundColor Red; exit }

# ==========================================
# 6. CREATE ROOMS
# ==========================================
Write-Host "`n========== CREATE ROOMS ==========" -ForegroundColor Cyan
$roomData = @(
    @{ code = "R01"; name = "Phong 1 - 2D"; roomType = "TWO_D"; seatCapacity = 60; status = "ACTIVE"; branchId = $branchIds[0] },
    @{ code = "R02"; name = "Phong 2 - 3D"; roomType = "THREE_D"; seatCapacity = 50; status = "ACTIVE"; branchId = $branchIds[0] },
    @{ code = "R03"; name = "Phong IMAX"; roomType = "IMAX"; seatCapacity = 80; status = "ACTIVE"; branchId = $branchIds[0] }
)
# Add rooms for branch 2 if it exists
if ($branchIds.Count -ge 2) {
    $roomData += @{ code = "R01"; name = "Phong 1 - 2D"; roomType = "TWO_D"; seatCapacity = 55; status = "ACTIVE"; branchId = $branchIds[1] }
    $roomData += @{ code = "R02"; name = "Phong 4DX"; roomType = "FOUR_DX"; seatCapacity = 40; status = "ACTIVE"; branchId = $branchIds[1] }
}

$roomIds = @()
foreach ($r in $roomData) {
    $res = Invoke-Api -Method POST -Uri "$BASE/room" -Body $r -Headers $headers
    if ($res) {
        $roomIds += $res.result.id
        Write-Host "  + Room: $($r.name) - Type: $($r.roomType) (ID: $($res.result.id))" -ForegroundColor Gray
    }
}

if ($roomIds.Count -eq 0) { Write-Host "No rooms created! Exiting." -ForegroundColor Red; exit }

# ==========================================
# 7. CREATE MOVIES
# ==========================================
Write-Host "`n========== CREATE MOVIES ==========" -ForegroundColor Cyan

$movieData = @(
    @{
        movieName = "Lat Mat 7: Mot Dieu Uoc"
        description = "Phim gia dinh cam dong nhat cua Ly Hai. Cau chuyen ve tinh cam gia dinh va nhung uoc mo gian di nhung day y nghia."
        durationMinutes = 138
        ageRating = "P"
        language = "Tieng Viet"
        status = "NOW_SHOWING"
        thumbnailUrl = "https://upload.wikimedia.org/wikipedia/vi/9/9c/L%E1%BA%ADt_m%E1%BA%B7t_7_M%E1%BB%99t_%C4%91i%E1%BB%81u_%C6%B0%E1%BB%9Bc_poster.jpg"
        trailerUrl = "https://www.youtube.com/watch?v=N6UeL0ZkLHM"
        releaseDate = "2026-03-28"
        endDate = "2026-06-28"
        directorId = $directorIds["Ly Hai"]
        genreIds = @($genreIds["Tam ly"], $genreIds["Hanh dong"])
    },
    @{
        movieName = "Avengers: Secret Wars"
        description = "The Avengers face their greatest threat yet as the multiverse collapses. Heroes from every reality must unite for the final battle."
        durationMinutes = 165
        ageRating = "T13"
        language = "English"
        subtitle = "Vietnamese"
        status = "NOW_SHOWING"
        thumbnailUrl = "https://upload.wikimedia.org/wikipedia/en/8/8a/The_Avengers_%282012_movie%29_poster.jpg"
        trailerUrl = "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
        releaseDate = "2026-04-01"
        endDate = "2026-07-01"
        directorId = $directorIds["Anthony Russo"]
        genreIds = @($genreIds["Hanh dong"])
    },
    @{
        movieName = "Mai"
        description = "Cau chuyen tinh yeu lang man giua co gai ten Mai va chang trai Ha Noi. Phim khac hoa ve dep cua tinh yeu don phuong va su hy sinh."
        durationMinutes = 131
        ageRating = "T16"
        language = "Tieng Viet"
        status = "NOW_SHOWING"
        thumbnailUrl = "https://upload.wikimedia.org/wikipedia/vi/a/a8/Mai_2024_poster.jpg"
        trailerUrl = "https://www.youtube.com/watch?v=example3"
        releaseDate = "2026-02-10"
        endDate = "2026-05-10"
        directorId = $directorIds["Tran Thanh"]
        genreIds = @($genreIds["Lang man"], $genreIds["Tam ly"])
    },
    @{
        movieName = "Inside Out 3"
        description = "Riley is now in college! New emotions emerge as she navigates adulthood, friendship, and finding her place in the world."
        durationMinutes = 105
        ageRating = "P"
        language = "English"
        subtitle = "Vietnamese"
        status = "NOW_SHOWING"
        thumbnailUrl = "https://upload.wikimedia.org/wikipedia/en/0/0a/Inside_Out_%282015_movie%29_poster.jpg"
        trailerUrl = "https://www.youtube.com/watch?v=example4"
        releaseDate = "2026-03-15"
        endDate = "2026-06-15"
        directorId = $directorIds["Pete Docter"]
        genreIds = @($genreIds["Hoat hinh"], $genreIds["Hai huoc"])
    },
    @{
        movieName = "The Conjuring 4: Last Rites"
        description = "Ed and Lorraine Warren face their most terrifying case yet in the final chapter of the Conjuring series."
        durationMinutes = 120
        ageRating = "T18"
        language = "English"
        subtitle = "Vietnamese"
        status = "UPCOMING"
        thumbnailUrl = "https://upload.wikimedia.org/wikipedia/en/1/1f/Conjuring_poster.jpg"
        trailerUrl = "https://www.youtube.com/watch?v=example5"
        releaseDate = "2026-05-20"
        endDate = "2026-08-20"
        directorId = $directorIds["Michael Chaves"]
        genreIds = @($genreIds["Kinh di"], $genreIds["Tam ly"])
    }
)

$movieIds = @()
foreach ($f in $movieData) {
    # Filter out null genreIds
    $f.genreIds = @($f.genreIds | Where-Object { $_ -ne $null })
    $res = Invoke-Api -Method POST -Uri "$BASE/movie" -Body $f -Headers $headers
    if ($res) {
        $movieIds += $res.result.movieId
        Write-Host "  + Movie: $($f.movieName) [$($f.status)] (ID: $($res.result.movieId))" -ForegroundColor Gray
    }
}

if ($movieIds.Count -eq 0) { Write-Host "No movies created! Exiting." -ForegroundColor Red; exit }

# ==========================================
# 8. CREATE SHOWTIMES
# ==========================================
Write-Host "`n========== CREATE SHOWTIMES ==========" -ForegroundColor Cyan
$today = Get-Date
$showtimeIds = @()

# Movie 1 (Lat Mat 7) - Room 1 (2D): Today + Tomorrow
foreach ($dayOffset in @(0, 1)) {
    $date = $today.AddDays($dayOffset).ToString("yyyy-MM-dd")
    foreach ($time in @(@("10:00","12:20"), @("14:00","16:20"), @("19:00","21:20"))) {
        if ($movieIds.Count -ge 1 -and $roomIds.Count -ge 1) {
            $res = Invoke-Api -Method POST -Uri "$BASE/showtime" -Body @{
                roomId = $roomIds[0]; movieId = $movieIds[0]
                startTime = "${date}T$($time[0]):00"; endTime = "${date}T$($time[1]):00"
                status = "OPEN"
            } -Headers $headers
            if ($res) {
                $showtimeIds += $res.result.showtimeId
                Write-Host "  + Showtime: Lat Mat 7 | $date $($time[0]) - Room 1" -ForegroundColor Gray
            }
        }
    }
}

# Movie 2 (Avengers) - Room 2 (3D) & Room 3 (IMAX) : Today
if ($movieIds.Count -ge 2) {
    $date = $today.ToString("yyyy-MM-dd")
    if ($roomIds.Count -ge 2) {
        $res = Invoke-Api -Method POST -Uri "$BASE/showtime" -Body @{
            roomId = $roomIds[1]; movieId = $movieIds[1]
            startTime = "${date}T15:00:00"; endTime = "${date}T17:45:00"
            status = "OPEN"
        } -Headers $headers
        if ($res) { $showtimeIds += $res.result.showtimeId; Write-Host "  + Showtime: Avengers | $date 15:00 - Room 2 (3D)" -ForegroundColor Gray }

        $res = Invoke-Api -Method POST -Uri "$BASE/showtime" -Body @{
            roomId = $roomIds[1]; movieId = $movieIds[1]
            startTime = "${date}T20:00:00"; endTime = "${date}T22:45:00"
            status = "OPEN"
        } -Headers $headers
        if ($res) { $showtimeIds += $res.result.showtimeId; Write-Host "  + Showtime: Avengers | $date 20:00 - Room 2 (3D)" -ForegroundColor Gray }
    }
    if ($roomIds.Count -ge 3) {
        $res = Invoke-Api -Method POST -Uri "$BASE/showtime" -Body @{
            roomId = $roomIds[2]; movieId = $movieIds[1]
            startTime = "${date}T18:00:00"; endTime = "${date}T20:45:00"
            status = "OPEN"
        } -Headers $headers
        if ($res) { $showtimeIds += $res.result.showtimeId; Write-Host "  + Showtime: Avengers | $date 18:00 - Room IMAX" -ForegroundColor Gray }
    }
}

# Movie 3 (Mai) - Room 1: Today
if ($movieIds.Count -ge 3 -and $roomIds.Count -ge 1) {
    $date = $today.ToString("yyyy-MM-dd")
    $res = Invoke-Api -Method POST -Uri "$BASE/showtime" -Body @{
        roomId = $roomIds[0]; movieId = $movieIds[2]
        startTime = "${date}T16:30:00"; endTime = "${date}T18:45:00"
        status = "OPEN"
    } -Headers $headers
    if ($res) { $showtimeIds += $res.result.showtimeId; Write-Host "  + Showtime: Mai | $date 16:30 - Room 1" -ForegroundColor Gray }
}

# Movie 4 (Inside Out 3) - Room 2: Tomorrow
if ($movieIds.Count -ge 4 -and $roomIds.Count -ge 2) {
    $date = $today.AddDays(1).ToString("yyyy-MM-dd")
    $res = Invoke-Api -Method POST -Uri "$BASE/showtime" -Body @{
        roomId = $roomIds[1]; movieId = $movieIds[3]
        startTime = "${date}T10:00:00"; endTime = "${date}T11:45:00"
        status = "OPEN"
    } -Headers $headers
    if ($res) { $showtimeIds += $res.result.showtimeId; Write-Host "  + Showtime: Inside Out 3 | $date 10:00 - Room 2 (3D)" -ForegroundColor Gray }

    $res = Invoke-Api -Method POST -Uri "$BASE/showtime" -Body @{
        roomId = $roomIds[1]; movieId = $movieIds[3]
        startTime = "${date}T14:00:00"; endTime = "${date}T15:45:00"
        status = "OPEN"
    } -Headers $headers
    if ($res) { $showtimeIds += $res.result.showtimeId; Write-Host "  + Showtime: Inside Out 3 | $date 14:00 - Room 2 (3D)" -ForegroundColor Gray }
}

# Branch 2 rooms - Showtimes
if ($branchIds.Count -ge 2 -and $roomIds.Count -ge 4) {
    $date = $today.ToString("yyyy-MM-dd")
    if ($movieIds.Count -ge 1) {
        $res = Invoke-Api -Method POST -Uri "$BASE/showtime" -Body @{
            roomId = $roomIds[3]; movieId = $movieIds[0]
            startTime = "${date}T19:30:00"; endTime = "${date}T21:50:00"
            status = "OPEN"
        } -Headers $headers
        if ($res) { $showtimeIds += $res.result.showtimeId; Write-Host "  + Showtime: Lat Mat 7 | $date 19:30 - HCM Room 1" -ForegroundColor Gray }
    }
    if ($movieIds.Count -ge 2 -and $roomIds.Count -ge 5) {
        $res = Invoke-Api -Method POST -Uri "$BASE/showtime" -Body @{
            roomId = $roomIds[4]; movieId = $movieIds[1]
            startTime = "${date}T20:00:00"; endTime = "${date}T22:45:00"
            status = "OPEN"
        } -Headers $headers
        if ($res) { $showtimeIds += $res.result.showtimeId; Write-Host "  + Showtime: Avengers | $date 20:00 - HCM Room 4DX" -ForegroundColor Gray }
    }
}

Write-Host "  Total showtimes created: $($showtimeIds.Count)" -ForegroundColor Green

# ==========================================
# 9. CREATE TEST USER
# ==========================================
Write-Host "`n========== CREATE TEST USER ==========" -ForegroundColor Cyan
$userRes = Invoke-Api -Method POST -Uri "$BASE/sign-up" -Body @{
    username = "testuser"
    password = "test@123"
    fullName = "Nguyen Van A"
    email = "testuser@cinema.vn"
    phoneNumber = "0901234567"
    gender = "MALE"
    dob = "2000-01-15"
}
if ($userRes) {
    Write-Host "  + Test user created: testuser / test@123" -ForegroundColor Green
}

# Login as test user for bookings
$userLoginRes = Invoke-Api -Method POST -Uri "$BASE/auth/login" -Body @{ username = "testuser"; password = "test@123" }
if ($userLoginRes) {
    $userToken = $userLoginRes.result.accessToken
    $userHeaders = @{ Authorization = "Bearer $userToken" }
    Write-Host "  + Test user logged in!" -ForegroundColor Green
} else {
    Write-Host "  Test user login failed, skipping bookings." -ForegroundColor Yellow
    $userHeaders = $null
}

# ==========================================
# 10. CREATE TEST BOOKINGS
# ==========================================
Write-Host "`n========== CREATE TEST BOOKINGS ==========" -ForegroundColor Cyan

if ($userHeaders -and $showtimeIds.Count -gt 0) {
    # Booking 1: COMPLETED booking on first showtime
    $tickets1 = Invoke-Api -Method GET -Uri "$BASE/ticket/showtime/$($showtimeIds[0])" -Headers $userHeaders
    if ($tickets1 -and $tickets1.result.Count -ge 2) {
        $seat1 = $tickets1.result[0].seatId
        $seat2 = $tickets1.result[1].seatId
        $bk1 = Invoke-Api -Method POST -Uri "$BASE/booking" -Body @{ showtimeId = $showtimeIds[0]; seatIds = @($seat1, $seat2) } -Headers $userHeaders
        if ($bk1) {
            $bid1 = $bk1.result.bookingId
            Invoke-Api -Method PUT -Uri "$BASE/booking/$bid1" -Body @{ status = "COMPLETED" } -Headers $headers
            Write-Host "  + Booking COMPLETED (2 seats): $bid1" -ForegroundColor Green
        }
    }

    # Booking 2: COMPLETED booking on a different showtime
    if ($showtimeIds.Count -ge 4) {
        $tickets2 = Invoke-Api -Method GET -Uri "$BASE/ticket/showtime/$($showtimeIds[3])" -Headers $userHeaders
        if ($tickets2 -and $tickets2.result.Count -ge 3) {
            $sIds = @($tickets2.result[0].seatId, $tickets2.result[1].seatId, $tickets2.result[2].seatId)
            $bk2 = Invoke-Api -Method POST -Uri "$BASE/booking" -Body @{ showtimeId = $showtimeIds[3]; seatIds = $sIds } -Headers $userHeaders
            if ($bk2) {
                $bid2 = $bk2.result.bookingId
                Invoke-Api -Method PUT -Uri "$BASE/booking/$bid2" -Body @{ status = "COMPLETED" } -Headers $headers
                Write-Host "  + Booking COMPLETED (3 seats): $bid2" -ForegroundColor Green
            }
        }
    }

    # Booking 3: PENDING booking (user hasn't paid yet)
    if ($showtimeIds.Count -ge 2) {
        $tickets3 = Invoke-Api -Method GET -Uri "$BASE/ticket/showtime/$($showtimeIds[1])" -Headers $userHeaders
        if ($tickets3 -and $tickets3.result.Count -ge 1) {
            $bk3 = Invoke-Api -Method POST -Uri "$BASE/booking" -Body @{ showtimeId = $showtimeIds[1]; seatIds = @($tickets3.result[0].seatId) } -Headers $userHeaders
            if ($bk3) {
                Write-Host "  + Booking PENDING (1 seat): $($bk3.result.bookingId)" -ForegroundColor Yellow
            }
        }
    }
}

# ==========================================
# SUMMARY
# ==========================================
Write-Host "`n==========================================" -ForegroundColor Magenta
Write-Host "   SEED DATA COMPLETE!" -ForegroundColor Magenta
Write-Host "==========================================" -ForegroundColor Magenta
Write-Host ""
Write-Host "  Genres:     $($genreIds.Count)" -ForegroundColor White
Write-Host "  Directors:  $($directorIds.Count)" -ForegroundColor White
Write-Host "  Branches:   $($branchIds.Count)" -ForegroundColor White
Write-Host "  Rooms:      $($roomIds.Count)" -ForegroundColor White
Write-Host "  Movies:      $($movieIds.Count)" -ForegroundColor White
Write-Host "  Showtimes:  $($showtimeIds.Count)" -ForegroundColor White
Write-Host ""
Write-Host "  Admin:      admin / admin@123" -ForegroundColor Yellow
Write-Host "  Test User:  testuser / test@123" -ForegroundColor Yellow
Write-Host ""
Write-Host "==========================================" -ForegroundColor Magenta
