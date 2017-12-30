<?php

$recepient = "kreolyrskii@gmail.com";
$sitename  = "TechnoRUN";

$name  = $_POST["name"];
$phone = $_POST["phone"]);

$pagetitle = "Новая заявка с сайта " .$sitename."\r\n";
$message = "Имя: $name \r\nТелефон: $phone;
mail($recepient, $pagetitle, $message, $recepient);