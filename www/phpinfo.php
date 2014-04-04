<?php
if (isset($_GET["yes"]) && $_GET["yes"] === "please")
    phpinfo();
else {
    header("HTTP/1.0 404 Not Found");
    $uri = explode("?", $_SERVER['REQUEST_URI']);
    echo '<!DOCTYPE HTML PUBLIC "-//IETF//DTD HTML 2.0//EN">
<html><head>
<title>404 Not Found</title>
</head><body>
<h1>Not Found</h1>
<p>The requested URL ' . array_shift($uri) . ' was not found on this server.</p>
</body></html>';
}


