param([string]$ImagePath)

[Console]::OutputEncoding = New-Object System.Text.UTF8Encoding $false
$OutputEncoding = New-Object System.Text.UTF8Encoding $false

Add-Type -AssemblyName System.Runtime.WindowsRuntime
$null = [Windows.Storage.StorageFile,            Windows.Storage,      ContentType=WindowsRuntime]
$null = [Windows.Storage.Streams.IRandomAccessStream, Windows.Storage, ContentType=WindowsRuntime]
$null = [Windows.Media.Ocr.OcrEngine,            Windows.Foundation,   ContentType=WindowsRuntime]
$null = [Windows.Media.Ocr.OcrResult,            Windows.Foundation,   ContentType=WindowsRuntime]
$null = [Windows.Graphics.Imaging.BitmapDecoder, Windows.Graphics,     ContentType=WindowsRuntime]
$null = [Windows.Graphics.Imaging.SoftwareBitmap,Windows.Graphics,     ContentType=WindowsRuntime]
$null = [Windows.Globalization.Language,         Windows.Foundation,   ContentType=WindowsRuntime]

# Explicitly typed AsTask wrapper to avoid WinRT generic type inference issues
$asTaskMethods = [System.WindowsRuntimeSystemExtensions].GetMethods() |
    Where-Object { $_.Name -eq 'AsTask' -and $_.IsGenericMethod -and $_.GetParameters().Count -eq 1 }
$asTaskMethod = $asTaskMethods | Select-Object -First 1

function Await($WinRtTask, [Type]$ResultType) {
    $netTask = $asTaskMethod.MakeGenericMethod($ResultType).Invoke($null, @($WinRtTask))
    $netTask.Wait() | Out-Null
    return $netTask.Result
}

$file    = Await ([Windows.Storage.StorageFile]::GetFileFromPathAsync($ImagePath)) ([Windows.Storage.StorageFile])
$stream  = Await ($file.OpenAsync([Windows.Storage.FileAccessMode]::Read))          ([Windows.Storage.Streams.IRandomAccessStream])
$decoder = Await ([Windows.Graphics.Imaging.BitmapDecoder]::CreateAsync($stream))   ([Windows.Graphics.Imaging.BitmapDecoder])
$bitmap  = Await ($decoder.GetSoftwareBitmapAsync())                                ([Windows.Graphics.Imaging.SoftwareBitmap])

$lang   = [Windows.Globalization.Language]::new('ja')
$engine = [Windows.Media.Ocr.OcrEngine]::TryCreateFromLanguage($lang)
if (-not $engine) { $engine = [Windows.Media.Ocr.OcrEngine]::TryCreateFromUserProfileLanguages() }
if (-not $engine) { Write-Error "OCR engine init failed"; exit 1 }

$result = Await ($engine.RecognizeAsync($bitmap)) ([Windows.Media.Ocr.OcrResult])
$result.Lines | ForEach-Object { $_.Text }
