import Foundation
import Vision

struct OCRResult: Encodable {
    let text: String
    let error: String?
}

let filePaths = Array(CommandLine.arguments.dropFirst())
var results: [OCRResult] = []

for filePath in filePaths {
    do {
        let request = VNRecognizeTextRequest()
        request.recognitionLevel = .accurate
        request.usesLanguageCorrection = true
        request.recognitionLanguages = ["zh-Hans", "en-US"]

        let handler = VNImageRequestHandler(url: URL(fileURLWithPath: filePath))
        try handler.perform([request])

        let lines = (request.results ?? [])
            .sorted {
                if abs($0.boundingBox.midY - $1.boundingBox.midY) > 0.012 {
                    return $0.boundingBox.midY > $1.boundingBox.midY
                }
                return $0.boundingBox.minX < $1.boundingBox.minX
            }
            .compactMap { $0.topCandidates(1).first?.string }

        results.append(OCRResult(text: lines.joined(separator: "\n"), error: nil))
    } catch {
        results.append(OCRResult(text: "", error: error.localizedDescription))
    }
}

let output = try JSONEncoder().encode(results)
FileHandle.standardOutput.write(output)
