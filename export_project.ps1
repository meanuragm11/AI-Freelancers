$outputFile = "project_code.txt"

# Remove old file if it exists
if (Test-Path $outputFile) {
    Remove-Item $outputFile
}

# Folders to export
$includeFolders = @(
    "app",
    "components",
    "lib",
    "hooks",
    "constants"
)

# Individual root files to include if they exist
$includeFiles = @(
    "middleware.ts",
    "next.config.js",
    "next.config.mjs",
    "next.config.ts",
    "tailwind.config.js",
    "tailwind.config.ts",
    "postcss.config.js",
    "eslint.config.js",
    "tsconfig.json",
    "package.json",
    ".env.example"
)

# File extensions to include
$extensions = @(
    "*.ts",
    "*.tsx",
    "*.js",
    "*.jsx",
    "*.json",
    "*.css",
    "*.scss",
    "*.md",
    "*.sql"
)

Write-Host "Exporting project..."

foreach ($folder in $includeFolders) {

    if (!(Test-Path $folder)) {
        continue
    }

    Get-ChildItem $folder -Recurse -File | Where-Object {

        $ext = $_.Extension.ToLower()

        (
            $ext -in @(
                ".ts",
                ".tsx",
                ".js",
                ".jsx",
                ".json",
                ".css",
                ".scss",
                ".md",
                ".sql"
            )
        ) -and
        ($_.FullName -notmatch "\\node_modules\\") -and
        ($_.FullName -notmatch "\\.next\\") -and
        ($_.FullName -notmatch "\\dist\\") -and
        ($_.FullName -notmatch "\\build\\") -and
        ($_.FullName -notmatch "\\coverage\\") -and
        ($_.FullName -notmatch "\\out\\") -and
        ($_.FullName -notmatch "\\.git\\") -and
        ($_.FullName -notmatch "\\public\\") -and
        ($_.FullName -notmatch "\\\.vercel\\")

    } | ForEach-Object {

        Add-Content $outputFile ""
        Add-Content $outputFile ("=" * 100)
        Add-Content $outputFile ($_.FullName.Replace($PWD.Path + "\", ""))
        Add-Content $outputFile ("=" * 100)
        Add-Content $outputFile ""

        Get-Content $_.FullName | Add-Content $outputFile

        Add-Content $outputFile ""
        Add-Content $outputFile ""
    }
}

foreach ($file in $includeFiles) {

    if (Test-Path $file) {

        Add-Content $outputFile ""
        Add-Content $outputFile ("=" * 100)
        Add-Content $outputFile $file
        Add-Content $outputFile ("=" * 100)
        Add-Content $outputFile ""

        Get-Content $file | Add-Content $outputFile

        Add-Content $outputFile ""
        Add-Content $outputFile ""
    }
}

Write-Host ""
Write-Host "Done!"
Write-Host "Output file: project_code.txt"