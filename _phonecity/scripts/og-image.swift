import AppKit
import Foundation

// Rebuild on macOS: swift scripts/og-image.swift public/og-image.png
let bitmap = NSBitmapImageRep(bitmapDataPlanes: nil, pixelsWide: 1200, pixelsHigh: 630, bitsPerSample: 8, samplesPerPixel: 4, hasAlpha: true, isPlanar: false, colorSpaceName: .deviceRGB, bytesPerRow: 0, bitsPerPixel: 0)!
NSGraphicsContext.saveGraphicsState()
NSGraphicsContext.current = NSGraphicsContext(bitmapImageRep: bitmap)
func color(_ hex: UInt32) -> NSColor { NSColor(red: CGFloat((hex >> 16) & 255)/255, green: CGFloat((hex >> 8) & 255)/255, blue: CGFloat(hex & 255)/255, alpha: 1) }
func rect(_ x: CGFloat,_ y: CGFloat,_ w: CGFloat,_ h: CGFloat,_ c: UInt32,_ r: CGFloat = 0) { color(c).setFill(); NSBezierPath(roundedRect: NSRect(x:x,y:y,width:w,height:h), xRadius:r,yRadius:r).fill() }
func poly(_ pts: [(CGFloat,CGFloat)],_ c: UInt32) { let p=NSBezierPath(); p.move(to:NSPoint(x:pts[0].0,y:pts[0].1)); for a in pts.dropFirst(){p.line(to:NSPoint(x:a.0,y:a.1))};p.close();color(c).setFill();p.fill() }
func label(_ s:String,_ x:CGFloat,_ y:CGFloat,_ size:CGFloat,_ c:UInt32,_ weight:NSFont.Weight = .regular) { (s as NSString).draw(at:NSPoint(x:x,y:y),withAttributes:[.font:NSFont.systemFont(ofSize:size,weight:weight),.foregroundColor:color(c)]) }
rect(0,0,1200,630,0xF7F8F2)
rect(48,48,1104,534,0xEFF1E6,32)
label("A LITTLE CITY OF YOUR TIME",82,508,18,0x6D8563,.semibold)
label("달콤한 나의",78,398,55,0x294C3E,.bold)
label("폰도시",78,321,76,0x294C3E,.bold)
label("스크린타임이 나만의 도시가 돼요.",82,260,25,0x536B5C,.medium)
label("직접 걷고, 올라가고, 잠시 쉬어가요.",82,219,23,0x6B7B6E)
rect(82,121,272,51,0x365D49,25)
label("무료 · 회원가입 없이 산책하기",103,137,18,0xFFFFFF,.semibold)
label("everpinej.com/phonecity",82,78,17,0x6D8563)
poly([(597,242),(849,111),(1104,243),(852,373)],0xB5C69F)
poly([(597,252),(849,121),(1104,253),(852,383)],0xD2DDBA)
poly([(608,247),(630,235),(1089,261),(1067,273)],0xF4F2E5)
func building(_ x:CGFloat,_ y:CGFloat,_ h:CGFloat,_ front:UInt32,_ side:UInt32,_ top:UInt32) {
  poly([(x,y),(x+54,y-28),(x+54,y+h-28),(x,y+h)],front)
  poly([(x+54,y-28),(x+108,y),(x+108,y+h),(x+54,y+h-28)],side)
  poly([(x,y+h),(x+54,y+h+28),(x+108,y+h),(x+54,y+h-28)],top)
  for row in 0..<Int(h/28) { for col in 0..<3 { let a=x+10+CGFloat(col)*14;let b=y+13+CGFloat(row)*28-CGFloat(col)*7;poly([(a,b),(a+7,b-3.5),(a+7,b+7),(a,b+10.5)],0xFFF8DD) } }
}
building(812,316,146,0xE5B4A6,0xC99288,0xF4CABC)
building(692,262,115,0xAEC3CE,0x8EA7B6,0xCCDDE4)
building(927,256,82,0xC7BDCF,0xA69AB6,0xDED4E7)
building(807,201,103,0xE1CC8F,0xC0A867,0xF3DFAB)
for a:(CGFloat,CGFloat) in [(692,215),(1010,225),(930,170)] {rect(a.0-3,a.1,6,29,0x8B8D61);color(0x89AA70).setFill();NSBezierPath(ovalIn:NSRect(x:a.0-19,y:a.1+15,width:38,height:48)).fill()}
NSGraphicsContext.restoreGraphicsState()
let output = CommandLine.arguments.count > 1 ? CommandLine.arguments[1] : "public/og-image.png"
try bitmap.representation(using:.png,properties:[:])!.write(to:URL(fileURLWithPath:output))
print("Created 1200×630 share image: \(output)")
