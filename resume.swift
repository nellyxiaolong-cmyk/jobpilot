import Foundation
import PDFKit
import Vision

let path = CommandLine.arguments[1]
let url = URL(fileURLWithPath: path)
guard let document = PDFDocument(url: url) else {
    fputs("无法打开 PDF 文件", stderr)
    exit(2)
}
var pages: [String] = []
for index in 0..<document.pageCount {
    guard let page = document.page(at: index) else { continue }
    let embedded = (page.string ?? "").trimmingCharacters(in: .whitespacesAndNewlines)
    if !embedded.isEmpty {
        pages.append(embedded)
        continue
    }
    let image = page.thumbnail(of: CGSize(width: 1800, height: 2400), for: .mediaBox)
    guard let cgImage = image.cgImage(forProposedRect: nil, context: nil, hints: nil) else { continue }
    let request = VNRecognizeTextRequest()
    request.recognitionLevel = .accurate
    request.usesLanguageCorrection = true
    request.recognitionLanguages = ["zh-Hans", "en-US"]
    try VNImageRequestHandler(cgImage: cgImage).perform([request])
    let lines = (request.results ?? [])
        .sorted { $0.boundingBox.midY > $1.boundingBox.midY }
        .compactMap { $0.topCandidates(1).first?.string }
    pages.append(lines.joined(separator: "\n"))
}
let output = try JSONSerialization.data(withJSONObject: ["text": pages.joined(separator: "\n\n")], options: [.fragmentsAllowed])
FileHandle.standardOutput.write(output)
