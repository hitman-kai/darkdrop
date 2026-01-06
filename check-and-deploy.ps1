# Check balance and deploy when ready
param(
    [string]$KeypairPath = "D:\Dev\Keys\darkdrop-funding.json",
    [string]$Address = "7Rw7feZVuiWQNMNzGF1UiDih5BmMw3T3DtQWYQ3MmPom"
)

Write-Host "Checking wallet balance..." -ForegroundColor Cyan

# Get balance
$balanceOutput = solana balance $Address --url devnet 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to check balance" -ForegroundColor Red
    exit 1
}

$balanceMatch = $balanceOutput | Select-String -Pattern "(\d+\.?\d*)\s+SOL"
if ($balanceMatch) {
    $balance = [double]$balanceMatch.Matches[0].Groups[1].Value
    Write-Host "Current balance: $balance SOL" -ForegroundColor Yellow
    
    $required = 1.68
    if ($balance -ge $required) {
        Write-Host "✅ Sufficient balance! Deploying..." -ForegroundColor Green
        .\deploy-devnet.ps1
    } else {
        $needed = $required - $balance
        Write-Host "⚠️  Need $needed more SOL" -ForegroundColor Yellow
        Write-Host "`nTry getting more SOL:" -ForegroundColor Cyan
        Write-Host "1. Web faucet: https://faucet.solana.com/" -ForegroundColor White
        Write-Host "2. Wait a few minutes and try: solana airdrop 0.5 $Address --url devnet" -ForegroundColor White
        Write-Host "3. Or transfer from another devnet wallet" -ForegroundColor White
    }
} else {
    Write-Host "❌ Could not parse balance" -ForegroundColor Red
}

