<?php
// send_notification.php
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

// Read the request body
$input = file_get_contents('php://input');
$data = json_decode($input, true);

$title = $data['title'] ?? 'ZetaSports Alert';
$body = $data['body'] ?? 'Live Match Update!';
$topic = $data['topic'] ?? 'all_users';

// 1. Load the Service Account JSON
// MAKE SURE THIS FILE IS IN THE SAME FOLDER AND NOT PUBLICLY ACCESSIBLE!
$serviceAccountFile = __DIR__ . '/service-account.json';

if (!file_exists($serviceAccountFile)) {
    echo json_encode(['error' => 'Service account file not found. Please download it from Firebase Console -> Project Settings -> Service Accounts -> Generate New Private Key, rename it to service-account.json, and put it next to this PHP file.']);
    exit(1);
}

$serviceAccount = json_decode(file_get_contents($serviceAccountFile), true);

$projectId = $serviceAccount['project_id'];
$clientEmail = $serviceAccount['client_email'];
$privateKey = $serviceAccount['private_key'];

// 2. Generate JWT for OAuth2
$header = json_encode(['alg' => 'RS256', 'typ' => 'JWT']);
$now = time();
$payload = json_encode([
    'iss' => $clientEmail,
    'scope' => 'https://www.googleapis.com/auth/firebase.messaging',
    'aud' => 'https://oauth2.googleapis.com/token',
    'exp' => $now + 3600,
    'iat' => $now
]);

function base64UrlEncode($data) {
    return str_replace(['+', '/', '='], ['-', '_', ''], base64_encode($data));
}

$base64UrlHeader = base64UrlEncode($header);
$base64UrlPayload = base64UrlEncode($payload);

$signature = '';
openssl_sign($base64UrlHeader . "." . $base64UrlPayload, $signature, $privateKey, OPENSSL_ALGO_SHA256);
$base64UrlSignature = base64UrlEncode($signature);

$jwt = $base64UrlHeader . "." . $base64UrlPayload . "." . $base64UrlSignature;

// 3. Exchange JWT for Access Token
$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, 'https://oauth2.googleapis.com/token');
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query([
    'grant_type' => 'urn:ietf:params:oauth:grant-type:jwt-bearer',
    'assertion' => $jwt
]));
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
$response = curl_exec($ch);
curl_close($ch);

$tokenData = json_decode($response, true);
$accessToken = $tokenData['access_token'] ?? null;

if (!$accessToken) {
    echo json_encode(['error' => 'Failed to obtain access token', 'details' => $tokenData]);
    exit(1);
}

// 4. Send FCM V1 Request
$fcmUrl = "https://fcm.googleapis.com/v1/projects/{$projectId}/messages:send";

$message = [
    'message' => [
        'topic' => $topic,
        'notification' => [
            'title' => $title,
            'body' => $body
        ]
    ]
];

$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $fcmUrl);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Authorization: Bearer ' . $accessToken,
    'Content-Type: application/json'
]);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($message));
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
$fcmResponse = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

echo json_encode([
    'success' => $httpCode == 200,
    'status' => $httpCode,
    'response' => json_decode($fcmResponse, true)
]);
?>
