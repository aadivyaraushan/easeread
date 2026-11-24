#!/usr/bin/env swift
import AppKit
import CoreGraphics
import Foundation

let sizes = [16, 32, 48, 64, 128, 256, 512, 1024]
let outDir = URL(fileURLWithPath: FileManager.default.currentDirectoryPath)
    .appendingPathComponent("extension/icons")

func drawIcon(size: Int) -> Data? {
    let s = CGFloat(size)
    guard let rep = NSBitmapImageRep(
        bitmapDataPlanes: nil,
        pixelsWide: size,
        pixelsHigh: size,
        bitsPerSample: 8,
        samplesPerPixel: 4,
        hasAlpha: true,
        isPlanar: false,
        colorSpaceName: .deviceRGB,
        bytesPerRow: 0,
        bitsPerPixel: 0
    ) else { return nil }

    NSGraphicsContext.saveGraphicsState()
    guard let context = NSGraphicsContext(bitmapImageRep: rep) else { return nil }
    NSGraphicsContext.current = context
    let cg = context.cgContext
    cg.setAllowsAntialiasing(true)
    cg.setShouldAntialias(true)

    // Flip coordinate system so (0,0) is top-left
    cg.translateBy(x: 0, y: s)
    cg.scaleBy(x: 1, y: -1)

    // 1. Flat calm deep teal rounded square background
    let pad = s * 0.04
    let bgRect = CGRect(x: pad, y: pad, width: s - pad * 2, height: s - pad * 2)
    let corner = s * 0.225
    let bgPath = CGPath(roundedRect: bgRect, cornerWidth: corner, cornerHeight: corner, transform: nil)
    cg.setFillColor(CGColor(srgbRed: 0.118, green: 0.361, blue: 0.345, alpha: 1.0)) // #1E5C58
    cg.addPath(bgPath)
    cg.fillPath()

    // Subtle crisp inner border
    cg.setStrokeColor(CGColor(srgbRed: 1, green: 1, blue: 1, alpha: 0.14))
    cg.setLineWidth(max(1.0, s * 0.015))
    cg.addPath(bgPath)
    cg.strokePath()

    // 2. Open book pages (warm cream #FAF6EB)
    let leftPage = CGRect(x: s * 0.18, y: s * 0.24, width: s * 0.295, height: s * 0.48)
    let rightPage = CGRect(x: s * 0.525, y: s * 0.24, width: s * 0.295, height: s * 0.48)
    let pageRadius = s * 0.055

    cg.setFillColor(CGColor(srgbRed: 0.980, green: 0.965, blue: 0.922, alpha: 1.0)) // #FAF6EB
    cg.addPath(CGPath(roundedRect: leftPage, cornerWidth: pageRadius, cornerHeight: pageRadius, transform: nil))
    cg.addPath(CGPath(roundedRect: rightPage, cornerWidth: pageRadius, cornerHeight: pageRadius, transform: nil))
    cg.fillPath()

    // 3. Reading lines on pages (calm charcoal #233332)
    let lineH = max(1.2, s * 0.042)
    let lineR = lineH / 2.0
    cg.setFillColor(CGColor(srgbRed: 0.14, green: 0.23, blue: 0.22, alpha: 0.78))

    // Left page lines
    let leftLines: [(CGFloat, CGFloat)] = [
        (0.34, 0.17),
        (0.45, 0.19),
        (0.56, 0.14),
    ]
    for (yFrac, wFrac) in leftLines {
        let r = CGRect(x: s * 0.235, y: s * yFrac, width: s * wFrac, height: lineH)
        cg.addPath(CGPath(roundedRect: r, cornerWidth: lineR, cornerHeight: lineR, transform: nil))
    }

    // Right page lines (top & bottom)
    let rightLines: [(CGFloat, CGFloat)] = [
        (0.34, 0.18),
        (0.56, 0.15),
    ]
    for (yFrac, wFrac) in rightLines {
        let r = CGRect(x: s * 0.58, y: s * yFrac, width: s * wFrac, height: lineH)
        cg.addPath(CGPath(roundedRect: r, cornerWidth: lineR, cornerHeight: lineR, transform: nil))
    }
    cg.fillPath()

    // 4. Warm golden reading-ruler highlight line across the middle (symbolizes focus guide)
    let guideH = max(1.6, s * 0.058)
    let guideR = guideH / 2.0
    let guideRect = CGRect(x: s * 0.565, y: s * 0.442, width: s * 0.22, height: guideH)
    cg.setFillColor(CGColor(srgbRed: 0.90, green: 0.65, blue: 0.22, alpha: 1.0)) // #E6A638
    cg.addPath(CGPath(roundedRect: guideRect, cornerWidth: guideR, cornerHeight: guideR, transform: nil))
    cg.fillPath()

    // 5. Calm bottom spine accent bar
    let spineH = max(1.5, s * 0.045)
    let spineRect = CGRect(x: s * 0.26, y: s * 0.78, width: s * 0.48, height: spineH)
    cg.setFillColor(CGColor(srgbRed: 0.980, green: 0.965, blue: 0.922, alpha: 0.45))
    cg.addPath(CGPath(roundedRect: spineRect, cornerWidth: spineH / 2, cornerHeight: spineH / 2, transform: nil))
    cg.fillPath()

    NSGraphicsContext.restoreGraphicsState()
    return rep.representation(using: .png, properties: [:])
}

for size in sizes {
    guard let data = drawIcon(size: size) else {
        fputs("Failed to generate icon \(size)\n", stderr)
        exit(1)
    }
    let fileURL = outDir.appendingPathComponent("icon-\(size).png")
    try data.write(to: fileURL)
    print("Generated \(fileURL.lastPathComponent)")
}
