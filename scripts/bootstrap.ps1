Write-Host 'Bootstrapping callwaiting.ai skeleton'
Push-Location apps/api; npm i; Pop-Location
Push-Location apps/tts-gateway; npm i; Pop-Location
Write-Host 'Done. Copy .env.example to .env in each app and run npm run dev.'
