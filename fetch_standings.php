<?php
// fetch_standings.php
header('Access-Control-Allow-Origin: *');
header('Content-Type: application/json');

// YOUR FOOTBALL-DATA.ORG API KEY
// Get one for free at: https://www.football-data.org/
$apiToken = '30a2305839ef4d86b3771b360d97b669';

// Top 5 Leagues Codes in football-data.org
$leagues = ['PL', 'PD', 'SA', 'BL1', 'FL1'];
$cacheFile = __DIR__ . '/standings.json';
$cacheTime = 300; // 5 minutes cache to prevent rate limit bans

if (file_exists($cacheFile) && (time() - filemtime($cacheFile)) < $cacheTime) {
    // Serve from cache
    echo file_get_contents($cacheFile);
    exit;
}

$allStandings = [];

foreach ($leagues as $league) {
    $url = "https://api.football-data.org/v4/competitions/$league/standings";
    
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        "X-Auth-Token: $apiToken"
    ]);
    
    // Add sleep to avoid the 10 requests/minute rate limit of the free tier
    sleep(1);
    
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($httpCode == 200) {
        $data = json_decode($response, true);
        
        // Extract the total table
        if (isset($data['standings'][0]['table'])) {
            $table = $data['standings'][0]['table'];
            
            $formattedTable = [];
            foreach ($table as $row) {
                $formattedTable[] = [
                    'position' => $row['position'],
                    'teamId' => $row['team']['id'],
                    'teamName' => $row['team']['shortName'] ?? $row['team']['name'],
                    'crest' => $row['team']['crest'],
                    'played' => $row['playedGames'],
                    'won' => $row['won'],
                    'drawn' => $row['draw'],
                    'lost' => $row['lost'],
                    'points' => $row['points'],
                    'goalsFor' => $row['goalsFor'],
                    'goalsAgainst' => $row['goalsAgainst'],
                    'goalDifference' => $row['goalDifference']
                ];
            }
            
            $allStandings[$league] = [
                'leagueName' => $data['competition']['name'],
                'emblem' => $data['competition']['emblem'],
                'table' => $formattedTable
            ];
        }
    }
}

$outputData = json_encode(['timestamp' => time(), 'data' => $allStandings]);

// Save to cache file
file_put_contents($cacheFile, $outputData);

echo $outputData;
?>
