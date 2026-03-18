<?php
$servername = "localhost";
$username = "root";
$password = "Mikeguz274!";
$dbname = "stylix";

// Connect
$conn = new mysqli($servername, $username, $password, $dbname);

// Check connection
if ($conn->connect_error) {
    die("Connection failed: " . $conn->connect_error);
}

// Get search query
$q = isset($_GET['q']) ? $_GET['q'] : "";

// SQL query (search style OR occasion)
$sql = "SELECT * FROM items 
        WHERE style LIKE '%$q%' 
        OR occasion LIKE '%$q%'";

$result = $conn->query($sql);

$items = [];

if ($result->num_rows > 0) {
    while($row = $result->fetch_assoc()) {
        $items[] = $row;
    }
}

// Return JSON
header('Content-Type: application/json');
echo json_encode($items);

$conn->close();
?>