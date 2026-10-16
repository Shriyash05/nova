try {
    $port = New-Object System.IO.Ports.SerialPort 'COM5', 115200, 'None', 8, 'One'
    $port.ReadTimeout = 3000
    $port.DtrEnable = $false
    $port.RtsEnable = $false
    $port.Open()
    Write-Output "COM5 opened successfully."
    $sw = [System.Diagnostics.Stopwatch]::StartNew()
    $lines = 0
    while ($sw.ElapsedMilliseconds -lt 3500) {
        try {
            $line = $port.ReadLine()
            Write-Output $line
            $lines++
            if ($lines -ge 30) { break }
        } catch [System.TimeoutException] {
            Write-Output "Read timed out (no data received in timeout window)."
            break
        }
    }
    $port.Close()
    Write-Output "COM5 closed cleanly. Total lines read: $lines"
} catch {
    Write-Output "Serial exception: $($_.Exception.Message)"
}
