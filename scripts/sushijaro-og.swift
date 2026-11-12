// 스시자로 링크 미리보기(og:image) 1200x630 PNG 생성. 사용: swift sushijaro-og.swift <assets 폴더>
// <assets>/og-specs.json: [{"file","title","subtitle","detail"}], 아이콘은 ../favicon.svg
import AppKit
import Foundation

let base = URL(fileURLWithPath: CommandLine.arguments[1], isDirectory: true)
let specs = try JSONSerialization.jsonObject(with: Data(contentsOf: base.appendingPathComponent("og-specs.json"))) as! [[String: String]]
let icon = NSImage(contentsOf: base.deletingLastPathComponent().appendingPathComponent("favicon.svg"))
func color(_ r: CGFloat, _ g: CGFloat, _ b: CGFloat) -> NSColor { NSColor(calibratedRed: r/255, green: g/255, blue: b/255, alpha: 1) }

for spec in specs {
  let rep = NSBitmapImageRep(bitmapDataPlanes: nil, pixelsWide: 1200, pixelsHigh: 630, bitsPerSample: 8, samplesPerPixel: 4, hasAlpha: true, isPlanar: false, colorSpaceName: .deviceRGB, bytesPerRow: 0, bitsPerPixel: 0)!
  rep.size = NSSize(width: 1200, height: 630)
  NSGraphicsContext.saveGraphicsState()
  NSGraphicsContext.current = NSGraphicsContext(bitmapImageRep: rep)
  color(255, 248, 243).setFill(); NSRect(x: 0, y: 0, width: 1200, height: 630).fill()
  color(232, 97, 60).setFill(); NSRect(x: 0, y: 0, width: 1200, height: 18).fill()
  func text(_ value: String, _ x: CGFloat, _ y: CGFloat, _ size: CGFloat, _ col: NSColor, _ weight: NSFont.Weight = .bold) {
    let font = NSFont.systemFont(ofSize: size, weight: weight)
    (value as NSString).draw(at: NSPoint(x: x, y: y), withAttributes: [.font: font, .foregroundColor: col])
  }
  icon?.draw(in: NSRect(x: 72, y: 470, width: 88, height: 88))
  text("스시자로", 178, 490, 46, color(31, 42, 36))
  let title = spec["title"]!
  text(title, 72, 330, title.count > 16 ? 52 : 64, color(31, 42, 36))
  text(spec["subtitle"]!, 72, 236, 54, color(232, 97, 60))
  text(spec["detail"]!, 76, 160, 28, color(93, 103, 95), .regular)
  color(234, 223, 214).setFill(); NSRect(x: 76, y: 112, width: 1048, height: 2).fill()
  text("everpinej.com/sushijaro", 76, 58, 26, color(93, 103, 95), .medium)
  text("공식 출처 · 확인일 표시", 860, 58, 26, color(93, 103, 95), .medium)
  NSGraphicsContext.restoreGraphicsState()
  try rep.representation(using: .png, properties: [:])!.write(to: base.appendingPathComponent(spec["file"]!))
}
print("OG 이미지 \(specs.count)개 생성")
