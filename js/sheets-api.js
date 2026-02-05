/*
================================================================================
SHEETDB API INTEGRATION
================================================================================
SheetDB - Google Sheets को Database की तरह use करो!

API URL: https://sheetdb.io/api/v1/2l6l03l5n63yn

SHEET STRUCTURE (Google Sheet में ये columns हों):
- Name (Column A)
- Roll (Column B)
- Branch (Column C)
- Session (Column D)
- Contact (Column E)
- Score (Column F)
- Level (Column G)
- Points (Column H)
- LastPlayed (Column I)

SheetDB API के फायदे:
✅ No setup needed - सीधे Google Sheet को database बना दो
✅ Simple REST API
✅ Google Sheets पर direct data दिख जाता है
✅ Free tier: 50 requests/day, Paid: Unlimited
================================================================================
*/

// ============================================================================
// SheetDB API Configuration
// ============================================================================
const SHEETDB_URL = 'https://sheetdb.io/api/v1/2l6l03l5n63yn';


// ============================================================================
// 1. REGISTER STUDENT - Naya student add karo
// ============================================================================
async function submitStudentData(studentData) {
    // Show loading
    if (document.getElementById('loading')) {
        document.getElementById('loading').style.display = 'flex';
    }

    const timestamp = new Date().toLocaleString('en-IN', { 
        timeZone: 'Asia/Kolkata' 
    });

    // SheetDB format - data ko sheet columns ke according banao
    const sheetData = {
        Name: studentData.name,
        Roll: studentData.roll,
        Branch: studentData.branch,
        Session: studentData.session,
        Contact: studentData.contact || 'Not Provided',
        Score: 0,
        Level: 1,
        Points: 0,
        LastPlayed: timestamp
    };

    try {
        // Check if student already exists (search by Roll)
        const existingResponse = await fetch(
            `${SHEETDB_URL}?search=Roll:${studentData.roll}`
        );
        const existingData = await existingResponse.json();

        if (existingData.data && existingData.data.length > 0) {
            // Student already exists - update LastPlayed
            console.log('Student already registered, updating...');
            
            const updateResponse = await fetch(SHEETDB_URL, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    data: {
                        LastPlayed: timestamp
                    },
                    search: { Roll: studentData.roll }
                })
            });

            const updateResult = await updateResponse.json();
            console.log('Update Success:', updateResult);
            sheetData.Score = existingData.data[0].Score || 0;
            sheetData.Level = existingData.data[0].Level || 1;
            sheetData.Points = existingData.data[0].Points || 0;

        } else {
            // Add new student
            console.log('Adding new student to SheetDB...');
            
            const addResponse = await fetch(SHEETDB_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    data: sheetData
                })
            });

            if (!addResponse.ok) {
                throw new Error('Failed to add student: ' + addResponse.statusText);
            }

            const addResult = await addResponse.json();
            console.log('Add Student Success:', addResult);
        }

        // Save to localStorage for game session
        localStorage.setItem('currentPlayer', JSON.stringify({
            ...sheetData,
            Roll: parseInt(studentData.roll)
        }));
        localStorage.setItem('playerRegistered', 'true');
        localStorage.setItem('sheetsConnected', 'true');

        // Redirect to game after 1.5 seconds
        setTimeout(() => {
            if (document.getElementById('loading')) {
                document.getElementById('loading').style.display = 'none';
            }
            window.location.href = 'game.html';
        }, 1500);

    } catch (error) {
        console.error('SheetDB Error:', error);
        
        // Fallback to localStorage (offline mode)
        localStorage.setItem('currentPlayer', JSON.stringify({
            ...sheetData,
            Roll: parseInt(studentData.roll),
            id: 'local_' + Date.now()
        }));
        localStorage.setItem('playerRegistered', 'true');
        localStorage.setItem('offlineMode', 'true');

        // Still redirect to game
        setTimeout(() => {
            if (document.getElementById('loading')) {
                document.getElementById('loading').style.display = 'none';
            }
            alert('⚠️ Offline Mode: Using local storage. Data will sync when online.');
            window.location.href = 'game.html';
        }, 1500);
    }
}


// ============================================================================
// 2. UPDATE SCORE - Score/Points/Level update karo
// ============================================================================
async function updateScore(pointsToAdd, level = null) {
    const player = JSON.parse(localStorage.getItem('currentPlayer'));
    if (!player) return false;

    // Update local data first
    player.Score = (player.Score || 0) + pointsToAdd;
    player.Points = (player.Points || 0) + pointsToAdd;
    if (level) {
        player.Level = Math.max(player.Level || 1, level);
    }
    player.LastPlayed = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });

    localStorage.setItem('currentPlayer', JSON.stringify(player));

    // Update in SheetDB if online (silent background update)
    if (!localStorage.getItem('offlineMode') && localStorage.getItem('sheetsConnected')) {
        try {
            const updateData = {
                Score: player.Score,
                Points: player.Points,
                Level: player.Level,
                LastPlayed: player.LastPlayed
            };

            const response = await fetch(SHEETDB_URL, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    data: updateData,
                    search: { Roll: player.Roll }
                })
            });

            const result = await response.json();
            console.log('Score updated in SheetDB:', result);
            return true;

        } catch (error) {
            console.log('Background SheetDB sync failed:', error);
            localStorage.setItem('needsSync', 'true');
            return false;
        }
    }
    return true;
}


// ============================================================================
// 3. GET LEADERBOARD - Top 10 students dekho
// ============================================================================
async function getLeaderboard() {
    try {
        // Get all students from SheetDB
        const response = await fetch(SHEETDB_URL);
        
        if (!response.ok) {
            throw new Error('Failed to fetch leaderboard');
        }

        const result = await response.json();
        const allStudents = result.data || [];

        // Convert and sort by Score (descending)
        const leaderboard = allStudents
            .map(student => ({
                Name: student.Name,
                Roll: student.Roll,
                Branch: student.Branch,
                Score: parseInt(student.Score) || 0,
                Level: parseInt(student.Level) || 1,
                Points: parseInt(student.Points) || 0,
                LastPlayed: student.LastPlayed
            }))
            .sort((a, b) => b.Score - a.Score)
            .slice(0, 10); // Top 10

        console.log('Leaderboard from SheetDB:', leaderboard);

        return {
            success: true,
            data: leaderboard,
            count: leaderboard.length,
            source: 'sheetdb',
            timestamp: new Date().toISOString()
        };

    } catch (error) {
        console.warn('SheetDB Leaderboard failed:', error);

        // Fallback to local data
        const localPlayer = JSON.parse(localStorage.getItem('currentPlayer') || '{}');
        return {
            success: true,
            data: localPlayer.Roll ? [localPlayer] : [],
            source: 'local',
            warning: 'Offline mode - showing local data only'
        };
    }
}


// ============================================================================
// 4. GET STUDENT DATA - Specific student ki info
// ============================================================================
async function getStudentData(roll) {
    try {
        const response = await fetch(`${SHEETDB_URL}?search=Roll:${roll}`);
        const result = await response.json();

        if (result.data && result.data.length > 0) {
            return {
                success: true,
                data: result.data[0],
                source: 'sheetdb'
            };
        } else {
            return {
                success: false,
                error: 'Student not found'
            };
        }

    } catch (error) {
        console.error('Failed to get student data:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

// ============================================================================
// 5. SYNC OFFLINE DATA - Jab online ho tab sync kar do
// ============================================================================
async function syncOfflineData() {
    if (localStorage.getItem('needsSync') !== 'true') {
        return;
    }

    const player = JSON.parse(localStorage.getItem('currentPlayer'));
    if (!player) return;

    try {
        const response = await fetch(SHEETDB_URL, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                data: {
                    Score: player.Score,
                    Points: player.Points,
                    Level: player.Level,
                    LastPlayed: player.LastPlayed
                },
                search: { Roll: player.Roll }
            })
        });

        if (response.ok) {
            localStorage.removeItem('needsSync');
            localStorage.setItem('offlineMode', 'false');
            console.log('✅ Offline data synced successfully');
            return true;
        }

    } catch (error) {
        console.error('Sync failed:', error);
        return false;
    }
}

// ============================================================================
// FORM SUBMISSION HANDLER
// ============================================================================
document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('studentForm');
    if (form) {
        form.addEventListener('submit', function(e) {
            e.preventDefault();

            const studentData = {
                name: document.getElementById('name').value.trim(),
                roll: document.getElementById('roll').value.trim(),
                branch: document.getElementById('branch').value,
                session: document.getElementById('session').value.trim(),
                contact: document.getElementById('contact').value.trim()
            };

            // Validation
            if (!studentData.name || !studentData.roll || !studentData.branch || !studentData.session) {
                alert('❌ Please fill all required fields (Name, Roll, Branch, Session)');
                return;
            }

            if (studentData.contact && !/^\d{10}$/.test(studentData.contact)) {
                alert('❌ Please enter a valid 10-digit contact number');
                return;
            }

            // Submit data to SheetDB
            submitStudentData(studentData);
        });
    }
});

// ============================================================================
// CHECK IF ALREADY REGISTERED
// ============================================================================
function checkExistingRegistration() {
    if (localStorage.getItem('playerRegistered') === 'true') {
        const player = JSON.parse(localStorage.getItem('currentPlayer'));
        if (player && player.Name) {
            // Show welcome back message on index.html
            if (window.location.pathname.includes('index.html')) {
                if (confirm(`🎮 Welcome back, ${player.Name}! Continue to game?`)) {
                    window.location.href = 'game.html';
                }
            }
        }
    }
}

// Check for offline data to sync
window.addEventListener('online', function() {
    console.log('✅ Back online - attempting to sync data...');
    localStorage.setItem('offlineMode', 'false');
    syncOfflineData();
});

window.addEventListener('offline', function() {
    console.log('⚠️ Offline mode activated');
    localStorage.setItem('offlineMode', 'true');
});

// Run on page load
checkExistingRegistration();

// Export functions for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        submitStudentData,
        updateScore,
        getLeaderboard,
        getStudentData,
        syncOfflineData
    };
}