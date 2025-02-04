<?php
    require_once '/vendor/autoload.php'; // Adjust this path to your vendor directory


    $loader = new \Twig\Loader\FilesystemLoader('templates');
    $twig = new \Twig\Environment($loader, [
        'cache' => 'cache/',
    ]);

    $template = $twig->load('index.html.twig');

    echo $template->render(['the' => 'variables', 'go' => 'here']);
?>
