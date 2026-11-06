import AppKit
import Foundation
let base = URL(fileURLWithPath: CommandLine.arguments[1], isDirectory: true)
let specs = try JSONSerialization.jsonObject(with: Data(contentsOf: base.appendingPathComponent("og-specs.json"))) as! [[String:String]]
func color(_ r: CGFloat,_ g: CGFloat,_ b: CGFloat)->NSColor { NSColor(calibratedRed:r/255,green:g/255,blue:b/255,alpha:1) }
for spec in specs {
 let image=NSImage(size:NSSize(width:1200,height:630));image.lockFocus()
 color(247,249,246).setFill();NSRect(x:0,y:0,width:1200,height:630).fill()
 color(8,124,96).setFill();NSRect(x:0,y:0,width:24,height:630).fill()
 func text(_ value:String,_ x:CGFloat,_ y:CGFloat,_ size:CGFloat,_ col:NSColor,_ weight:NSFont.Weight = .bold) {
   let font=NSFont.systemFont(ofSize:size,weight:weight)
   (value as NSString).draw(at:NSPoint(x:x,y:y),withAttributes:[.font:font,.foregroundColor:col])
 }
 color(8,124,96).setFill();NSBezierPath(roundedRect:NSRect(x:72,y:476,width:66,height:66),xRadius:18,yRadius:18).fill()
 color(255,255,255).setFill();NSRect(x:98,y:489,width:14,height:40).fill();NSRect(x:85,y:502,width:40,height:14).fill()
 text("페누리",156,483,42,color(8,124,96))
 text(spec["title"]!,72,330,spec["title"]!.count > 17 ? 45 : 62,color(28,51,45))
 text(spec["subtitle"]!,72,236,55,color(8,124,96))
 text(spec["detail"]!,76,155,26,color(96,113,107),.regular)
 color(223,232,225).setFill();NSRect(x:76,y:104,width:1048,height:2).fill()
 text("everpinej.com/penuri",76,54,24,color(96,113,107),.medium)
 text("원문 · 출처 · 확인일",852,54,24,color(96,113,107),.medium)
 image.unlockFocus()
 let bitmap=NSBitmapImageRep(data:image.tiffRepresentation!)!
 try bitmap.representation(using:.png,properties:[:])!.write(to:base.appendingPathComponent(spec["file"]!))
}
print("공유 미리보기 이미지 \(specs.count)개 생성 완료")
