param (
    [string]$PublicDir = "c:\Users\Reception\OneDrive\OneDrive - Safestay\Desktop\code\shitfts\public"
)

Add-Type -ReferencedAssemblies "System.Drawing" -TypeDefinition @"
using System;
using System.IO;
using System.Drawing;
using System.Drawing.Imaging;
using System.Collections.Generic;

public class IconProcessor {
    public static void RemoveBackground(string inputPath, string outputPath, int threshold = 235) {
        Bitmap src;
        using (FileStream fs = new FileStream(inputPath, FileMode.Open, FileAccess.Read)) {
            using (Image img = Image.FromStream(fs)) {
                src = new Bitmap(img);
            }
        }

        int width = src.Width;
        int height = src.Height;
        Bitmap result = new Bitmap(width, height, PixelFormat.Format32bppArgb);
        
        bool[,] isBg = new bool[width, height];
        bool[,] visited = new bool[width, height];
        Queue<Point> queue = new Queue<Point>();

        // Seed queue from all 4 borders
        for (int x = 0; x < width; x++) {
            queue.Enqueue(new Point(x, 0));
            queue.Enqueue(new Point(x, height - 1));
        }
        for (int y = 0; y < height; y++) {
            queue.Enqueue(new Point(0, y));
            queue.Enqueue(new Point(width - 1, y));
        }

        while (queue.Count > 0) {
            Point p = queue.Dequeue();
            if (p.X < 0 || p.X >= width || p.Y < 0 || p.Y >= height) continue;
            if (visited[p.X, p.Y]) continue;
            visited[p.X, p.Y] = true;

            Color c = src.GetPixel(p.X, p.Y);
            if (c.R >= threshold && c.G >= threshold && c.B >= threshold) {
                isBg[p.X, p.Y] = true;
                queue.Enqueue(new Point(p.X + 1, p.Y));
                queue.Enqueue(new Point(p.X - 1, p.Y));
                queue.Enqueue(new Point(p.X, p.Y + 1));
                queue.Enqueue(new Point(p.X, p.Y - 1));
            }
        }

        for (int y = 0; y < height; y++) {
            for (int x = 0; x < width; x++) {
                if (isBg[x, y]) {
                    result.SetPixel(x, y, Color.FromArgb(0, 0, 0, 0));
                } else {
                    result.SetPixel(x, y, src.GetPixel(x, y));
                }
            }
        }

        src.Dispose();

        result.Save(outputPath, ImageFormat.Png);
        result.Dispose();
    }

    public static void GenerateIcoFromPng(string pngPath, string icoPath) {
        using (FileStream fs = new FileStream(pngPath, FileMode.Open, FileAccess.Read)) {
            using (Image img = Image.FromStream(fs)) {
                using (Bitmap resized = new Bitmap(img, new Size(32, 32))) {
                    IntPtr hIcon = resized.GetHicon();
                    using (Icon icon = Icon.FromHandle(hIcon)) {
                        using (FileStream outFs = new FileStream(icoPath, FileMode.Create)) {
                            icon.Save(outFs);
                        }
                    }
                }
            }
        }
    }
}
"@

$files = @(
    "android-chrome-512x512.png",
    "android-chrome-192x192.png",
    "favicon-32x32.png",
    "favicon-16x16.png"
)

foreach ($f in $files) {
    $fullPath = Join-Path $PublicDir $f
    if (Test-Path $fullPath) {
        Write-Output "Processing $f ..."
        [IconProcessor]::RemoveBackground($fullPath, $fullPath, 235)
        Write-Output "Done: $f"
    }
}

# Update favicon.ico from transparent 32x32 png
$fav32 = Join-Path $PublicDir "favicon-32x32.png"
$favIco = Join-Path $PublicDir "favicon.ico"
if (Test-Path $fav32) {
    Write-Output "Updating favicon.ico from transparent 32x32 png..."
    [IconProcessor]::GenerateIcoFromPng($fav32, $favIco)
    Write-Output "Done: favicon.ico"
}

Write-Output "All icons successfully updated with transparent backgrounds!"
