<?php
header('Access-Control-Allow-Origin: *');
header('Content-Type: application/json');

if (!isset($_GET['comp']) || !isset($_GET['dateFrom']) || !isset($_GET['dateTo']) || !isset($_GET['key'])) {
    http_response_code(400);
    echo json_encode(["message" => "Missing parameters"]);
    exit;
}

$comp = $_GET['comp'];
$dateFrom = $_GET['dateFrom'];
$dateTo = $_GET['dateTo'];
$key = $_GET['key'];

$url = "https://api.football-data.org/v4/competitions/{$comp}/matches?dateFrom={$dateFrom}&dateTo={$dateTo}";

$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $url);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    "X-Auth-Token: {$key}"
]);

$response = curl_exec($ch);
$httpcode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

http_response_code($httpcode);
echo $response;
?>
