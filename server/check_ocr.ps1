Add-Type -AssemblyName System.Runtime.WindowsRuntime
$null = [Windows.Media.Ocr.OcrEngine, Windows.Foundation, ContentType=WindowsRuntime]
$langs = [Windows.Media.Ocr.OcrEngine]::AvailableRecognizerLanguages
Write-Output "Count: $($langs.Count)"
foreach ($l in $langs) { Write-Output $l.LanguageTag }
